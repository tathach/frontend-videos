const LoginHistory = require('../models/loginHistory.model');

/**
 * Lấy lịch sử đăng nhập của một người dùng (phân trang, lọc theo status)
 * @param {string} userId - ID của người dùng
 * @param {Object} options - Tuỳ chọn phân trang và lọc
 * @param {number} [options.page=1] - Trang hiện tại
 * @param {number} [options.limit=10] - Số bản ghi mỗi trang
 * @param {string} [options.status] - Trạng thái đăng nhập (success, failed, ...)
 * @returns {Object} Danh sách bản ghi và thông tin phân trang
 */
async function getLoginHistoryByUser(userId, { page = 1, limit = 10, status } = {}) {
    if (!userId) throw new Error('Thiếu userId');

    const query = { userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        LoginHistory.find(query)
            .sort({ loginAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        LoginHistory.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Lấy tất cả lịch sử đăng nhập, hỗ trợ lọc theo status, username, IP, userId
 * @param {Object} options - Tuỳ chọn lọc và phân trang
 * @param {number} [options.page=1] - Trang hiện tại
 * @param {number} [options.limit=20] - Số bản ghi mỗi trang
 * @param {string} [options.status] - Trạng thái đăng nhập
 * @param {string} [options.username] - Tìm gần đúng username
 * @param {string} [options.ip] - Lọc theo địa chỉ IP
 * @param {string} [options.userId] - Lọc theo ID người dùng
 * @returns {Object} Danh sách bản ghi và thông tin phân trang
 */
async function getAllLoginHistory({ page = 1, limit = 20, status, username, ip, userId } = {}) {
    const query = {};
    if (status) query.status = status;
    if (username) query.username = new RegExp(username, 'i'); // Tìm gần đúng
    if (ip) query.ip = ip;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        LoginHistory.find(query)
            .sort({ loginAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        LoginHistory.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

module.exports = {
    getLoginHistoryByUser,
    getAllLoginHistory
};
