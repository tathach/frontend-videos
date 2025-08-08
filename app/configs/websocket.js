const WebSocket = require('ws');
const crypto = require('crypto');
const url = require('url');
const cookie = require('cookie');
const { redisClient } = require('./redis'); // Redis client
const INSTANCE_ID = process.env.NODE_APP_INSTANCE || process.pid.toString();
const redisPub = redisClient.duplicate();
const redisSub = redisClient.duplicate();

const CONFIG = {
    pingInterval: 30000,
    redisPrefix: 'ws_clients:',
    redisSessionPrefix: 'sess:',
};

const memoryClientMap = new Map();

function redisKey(clientId) {
    return `${CONFIG.redisPrefix}${clientId}`;
}

function safeJSONParse(data) {
    try {
        return JSON.parse(data);
    } catch (_) {
        return null;
    }
}

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    // Kết nối Redis Pub/Sub cho nhiều instance
    (async () => {
        try {
            if (!redisPub.isOpen) await redisPub.connect();
            if (!redisSub.isOpen) await redisSub.connect();
            await redisSub.subscribe('ws_messages', async (message) => {
                const data = safeJSONParse(message);
                if (!data || data.from === INSTANCE_ID) return;
                if (data.broadcast) {
                    await broadcastExcept(null, data.message, true, data.exclude);
                } else if (data.to) {
                    await sendToUserLocal(data.to, data.message, true);
                }
            });
        } catch (err) {
            console.error('❌ Redis Pub/Sub error:', err);
        }
    })();

    // 🔁 Ping giữ kết nối sống
    setInterval(() => {
        wss.clients.forEach(ws => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, CONFIG.pingInterval);

    wss.on('connection', async (ws, req) => {
        const cookies = cookie.parse(req.headers.cookie || '');
        const rawSid = cookies['connect.sid'];
        // console.log(rawSid);
        if (!rawSid) {
            ws.close(1008, 'Missing session ID in cookie');
            return;
        }

        // Xử lý nếu cookie bị ký (signed cookie)
        const sessionId = rawSid.startsWith('s:') ? rawSid.slice(2).split('.')[0] : rawSid;
        const sessionRedisKey = `${CONFIG.redisSessionPrefix}${sessionId}`;

        let rawSession;
        try {
            rawSession = await redisClient.get(sessionRedisKey);
        } catch (err) {
            console.error('❌ Lỗi đọc session từ Redis:', err);
            ws.close(1011, 'Session Redis error');
            return;
        }

        if (!rawSession) {
            console.warn(`⚠️ Không tìm thấy session: ${sessionRedisKey}`);
            ws.close(1008, 'Session not found');
            return;
        }

        const parsed = safeJSONParse(rawSession);
        const user = parsed?.user;

        if (!user || !user._id) {
            console.warn('⚠️ Session không chứa user hợp lệ');
            ws.close(1008, 'Invalid user in session');
            return;
        }

        const clientId = user._id.toString();
        ws.clientId = clientId;
        ws.user = user;
        ws.isAlive = true;

        const oldWs = memoryClientMap.get(clientId);
        if (oldWs) oldWs.terminate();

        memoryClientMap.set(clientId, ws);
        await redisClient.set(redisKey(clientId), JSON.stringify({ user, instanceId: INSTANCE_ID }), { EX: 86400 });

        console.log(`✅ WS kết nối: ${user.username} (${clientId})`);

        const pendingKey = `ws_pending:${clientId}`;
        const pendingMessages = await redisClient.lRange(pendingKey, 0, -1);

        for (const rawMsg of pendingMessages) {
            try {
                ws.send(rawMsg);
            } catch (err) {
                console.warn(`⚠️ Gửi lại message lỗi: ${err.message}`);
            }
        }

        await redisClient.del(pendingKey);

        ws.on('pong', () => ws.isAlive = true);

        ws.on('message', async (message) => {
            const data = safeJSONParse(message);
            if (!data) return ws.send(JSON.stringify({ error: 'invalid_json' }));

            const { type, to, payload } = data;

            switch (type) {
                case 'broadcast':
                    await broadcastExcept(ws, {
                        from: clientId,
                        type: 'message',
                        payload,
                    });
                    break;

                case 'private':
                    if (!to) return ws.send(JSON.stringify({ error: 'missing_target' }));
                    await sendToUser(to, {
                        from: clientId,
                        type: 'message',
                        payload,
                    });
                    break;

                default:
                    ws.send(JSON.stringify({ error: 'unknown_type' }));
                    break;
            }
        });

        ws.on('close', async (code, reason) => {
            memoryClientMap.delete(clientId);
            await redisClient.del(redisKey(clientId));

            console.log(`❌ WS disconnected: ${clientId}`);
            console.log(`   ↳ Close code: ${code}, Reason: ${reason?.toString() || 'N/A'}`);

            switch (code) {
                case 1000: console.log(`   🟢 Normal closure.`); break;
                case 1008: console.log(`   🔒 Policy violation.`); break;
                case 1011: console.log(`   🔥 Internal server error.`); break;
                case 4001: console.log(`   🔌 Manual disconnect (logout or force)`); break;
                default: console.log(`   ⚠️ Unknown close reason.`); break;
            }
        });

        ws.on('error', err => {
            console.warn(`⚠️ Lỗi socket (${clientId}): ${err.message}`);
        });
    });
}

async function sendToUser(clientId, messageObj) {
    await sendToUserLocal(clientId, messageObj);
}

async function sendToUserLocal(clientId, messageObj, fromPub = false) {
    const ws = memoryClientMap.get(clientId);
    const key = `ws_pending:${clientId}`;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(messageObj));
    } else if (!fromPub) {
        await redisClient.rPush(key, JSON.stringify(messageObj));
        await redisClient.expire(key, 60);
    }

    if (!fromPub && redisPub.isOpen) {
        try {
            await redisPub.publish('ws_messages', JSON.stringify({ to: clientId, message: messageObj, from: INSTANCE_ID }));
        } catch (err) {
            console.error('❌ Redis publish error:', err);
        }
    }
}


async function broadcastExcept(senderWs, messageObj, fromPub = false, excludeId) {
    for (const [id, client] of memoryClientMap.entries()) {
        if (
            client.readyState === WebSocket.OPEN &&
            client !== senderWs &&
            client.clientId !== excludeId
        ) {
            client.send(JSON.stringify(messageObj));
        }
    }

    if (!fromPub && redisPub.isOpen) {
        try {
            await redisPub.publish('ws_messages', JSON.stringify({ broadcast: true, message: messageObj, exclude: senderWs?.clientId, from: INSTANCE_ID }));
        } catch (err) {
            console.error('❌ Redis publish error:', err);
        }
    }
}

function closeWebSocketByUserId(userId, reason = 'Manual disconnect') {
    const ws = memoryClientMap.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(4001, reason); // Mã 4001 là custom code
        console.log(`🔌 Đã đóng WebSocket của user ${userId} với lý do: ${reason}`);
    }
    memoryClientMap.delete(userId);
}

/**
 * Gửi message socket đến tất cả admin đang online
 * @param {Object} messageObj - Dữ liệu sẽ gửi (sẽ được stringify)
 */
async function sendToAdmins(messageObj) {
  const message = JSON.stringify(messageObj);

  for (const [clientId, ws] of memoryClientMap.entries()) {
    if (
      ws.readyState === WebSocket.OPEN &&
      ws.user?.role === 'admin'
    ) {
      try {
        ws.send(message);
      } catch (err) {
        console.warn(`⚠️ Không gửi được socket đến admin ${clientId}: ${err.message}`);
      }
    }
  }
}


module.exports = { setupWebSocket, sendToUser, broadcastExcept, closeWebSocketByUserId ,sendToAdmins };
