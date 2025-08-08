const { createClient } = require('redis');
const env = require('../ultils/env');

const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
    url: REDIS_URL,
    socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('❌ Quá số lần thử kết nối lại Redis');
                return new Error('Không thể kết nối lại Redis');
            }
            const delay = Math.min(retries * 1000, 5000);
            console.warn(`🔁 Thử kết nối lại Redis lần ${retries} sau ${delay}ms`);
            return delay;
        }
    },
    legacyMode: false
});

// Events
redisClient.on('connect', () => {
    console.log('✅ Đã kết nối đến Redis');
});

redisClient.on('ready', () => {
    console.log('🚀 Redis sẵn sàng để sử dụng');
});

redisClient.on('error', (err) => {
    console.error('❌ Lỗi Redis:', err);
});

redisClient.on('end', () => {
    console.warn('⚠️ Kết nối Redis đã đóng');
});

// ✅ Hàm connect an toàn — không gọi lại nếu đã connect
async function connectRedis() {
    if (!redisClient.isOpen) {
        try {
            await redisClient.connect();
        } catch (err) {
            console.error('❌ Không thể kết nối Redis:', err.message);
            setTimeout(connectRedis, 5000);
        }
    }
}

module.exports = {
    redisClient,
    connectRedis
};
