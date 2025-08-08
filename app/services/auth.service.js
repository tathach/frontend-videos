const User = require('../models/user.model');
const bcrypt = require('bcrypt');

/**
 * Tìm người dùng theo username (bao gồm mật khẩu nếu cần xác thực)
 * @param {string} username - Tên người dùng
 * @returns {Promise<Object|null>} Trả về user nếu tồn tại, ngược lại null
 */
const findUserByUsername = async (username) => {
    if (!username || typeof username !== 'string') {
        throw new Error('Username không hợp lệ');
    }

    return await User.findOne({ username: username.trim().toLowerCase() }).select('+password');
};

/**
 * So sánh mật khẩu người dùng nhập vào với mật khẩu đã mã hóa
 * @param {Object} user - Đối tượng user MongoDB (có trường `password`)
 * @param {string} password - Mật khẩu plaintext
 * @returns {Promise<boolean>} Trả về true nếu đúng, false nếu sai
 */
const validatePassword = async (user, password) => {
    if (!user?.password || !password) {
        throw new Error('Thiếu dữ liệu xác thực');
    }

    return await bcrypt.compare(password, user.password);
};

/**
 * Kiểm tra xem username hoặc email đã tồn tại trong hệ thống
 * @param {Object} param
 * @param {string} param.username - Username cần kiểm tra
 * @param {string} param.email - Email cần kiểm tra
 * @returns {Promise<boolean>} true nếu đã tồn tại, false nếu chưa
 */
const isUserExists = async ({ username, email }) => {
    if (!username && !email) {
        throw new Error('Phải cung cấp ít nhất username hoặc email để kiểm tra');
    }

    const query = {
        $or: []
    };

    if (username) {
        query.$or.push({ username: username.trim().toLowerCase() });
    }

    if (email) {
        query.$or.push({ email: email.trim().toLowerCase() });
    }

    const existing = await User.findOne(query);
    return !!existing;
};

/**
 * Tạo người dùng mới sau khi validate dữ liệu & kiểm tra trùng
 * @param {Object} param
 * @param {string} param.username - Username (bắt buộc)
 * @param {string} param.email - Email (bắt buộc)
 * @param {string} param.password - Mật khẩu thô
 * @param {string} [param.fullName] - Tên đầy đủ
 * @param {string} [param.role] - Role ('user' hoặc 'admin')
 * @param {string} [param.position] - Chức vụ
 * @param {string} [param.department] - Bộ phận
 * @returns {Promise<Object>} User đã tạo
 */
const registerUser = async ({ username, email, password, fullName = '', role, position, department }) => {
    if (!username || typeof username !== 'string') throw new Error('Thiếu hoặc sai định dạng username');
    if (!email || typeof email !== 'string') throw new Error('Thiếu hoặc sai định dạng email');
    if (!password || typeof password !== 'string' || password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự');

    const exists = await isUserExists({ username, email });
    if (exists) throw new Error('Username hoặc email đã tồn tại');

    const newUser = new User({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName?.trim() || '',
        role: ['user', 'admin'].includes(role) ? role : 'user',
        position: position?.trim() || '',
        department: department?.trim() || ''
    });

    await newUser.save();
    return newUser.toObject();
};

module.exports = {
    findUserByUsername,
    validatePassword,
    isUserExists,
    registerUser
};
