require('dotenv').config();

const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '..', 'backup.js');
if (!fs.existsSync(backupPath)) {
  throw new Error('Required file backup.js is missing. System cannot start.');
}

const MONGO_URL = process.env.MONGO_URL;

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_NOTI = process.env.CHAT_ID_NOTI;
const TELEGRAM_CHAT_THREAD = process.env.CHAT_THREAD;

const SESSION_SECRET = process.env.SESSION_SECRET;

const REDIS_URL = process.env.REDIS_URL;

const NODE_ENV = process.env.NODE_ENV;

// 👉 Cấu hình từ ENV hoặc gán trực tiếp
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_ENDPOINT   = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_CUSTOM_DOMAIN   = process.env.R2_CUSTOM_DOMAIN;


const PORT = process.env.PORT || 3003;
const BACKUP_PASSWORD = process.env.BACKUP_PASSWORD;

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 's3.tathach.com';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const DEFAULT_BUCKET = process.env.MINIO_BUCKET || 'cdn-sex-media';
const MP4_BUCKET = process.env.MP4_BUCKET || 'videos-mp4';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL;

// Thời gian timeout cho server (ms) - mặc định 30 phút
const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT_MINUTES || '30') * 60 * 1000;

module.exports = {
    MONGO_URL,
    R2_ACCESS_KEY,
    R2_SECRET_KEY,
    R2_ENDPOINT,
    R2_BUCKET,
    R2_CUSTOM_DOMAIN,
    CF_ACCOUNT_ID,
    CF_API_TOKEN,
    SESSION_SECRET,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID_NOTI,
    TELEGRAM_CHAT_THREAD,
    REDIS_URL,
    NODE_ENV,
    MINIO_ENDPOINT,
    MINIO_PORT,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    DEFAULT_BUCKET,
    MP4_BUCKET,
    MINIO_PUBLIC_URL,
    SERVER_TIMEOUT,
    PORT,
    BACKUP_PASSWORD
};
