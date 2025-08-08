const crypto = require('crypto');

function encode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(payload, secret, { expiresIn } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat };
  if (expiresIn) body.exp = iat + expiresIn;
  const headerSeg = encode(header);
  const payloadSeg = encode(body);
  const data = `${headerSeg}.${payloadSeg}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [headerSeg, payloadSeg, signature] = parts;
  const data = `${headerSeg}.${payloadSeg}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(Buffer.from(payloadSeg, 'base64url').toString());
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }
  return payload;
}

module.exports = { sign, verify };
