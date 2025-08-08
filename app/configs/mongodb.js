const mongoose = require('mongoose');
const env = require('../ultils/env')
const DB_URI = env.MONGO_URL;

// Tuỳ chọn kết nối ổn định và lâu dài
const options = {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
};

// Hàm kết nối
async function connectDB() {
    try {
        await mongoose.connect(DB_URI, options);
        console.log('✅ Kết nối MongoDB thành công');
    } catch (err) {
        console.error('❌ Kết nối thất bại:', err.message);
        // Thử lại sau 5s
        setTimeout(connectDB, 5000);
    }
}

// Sự kiện tự động kết nối lại nếu bị ngắt
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ Mất kết nối MongoDB. Đang thử lại...');
    connectDB();
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Lỗi:', err.message);
});

mongoose.connection.on('reconnectFailed', () => {
    console.error('❌ Không thể kết nối lại MongoDB');
});

// Bắt đầu kết nối khi file được import
connectDB();

// Export mongoose để models dùng
module.exports = {
    mongoose,
    connectDB,
};
