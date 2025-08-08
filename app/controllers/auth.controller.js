const authService = require('../services/auth.service');
const requestIp = require('request-ip');
const DeviceDetector = require('node-device-detector');
const env = require('../ultils/env');
const { sign, verify } = require('../ultils/jwt');
const LoginHistory = require('../models/loginHistory.model');
const { closeWebSocketByUserId } = require('../configs/websocket');
const handleError = require('../ultils/handleError');

/**
 * Xử lý đăng nhập người dùng
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const login = async (req, res) => {
    const { username, password, redirect } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });
    }

    const ipAddress = requestIp.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const detector = new DeviceDetector();
    const device = detector.detect(userAgent);

    try {
        const user = await authService.findUserByUsername(username);
        if (!user) {
            return res.render('auth/login', { layout: false, redirect, error: 'Sai thông tin đăng nhập !' });
        }

        const isMatch = await authService.validatePassword(user, password);
        if (!isMatch) {
            return res.render('auth/login', { layout: false, redirect, error: 'Sai thông tin đăng nhập !' });
        }

        if (user.status === 'banned') {
            await LoginHistory.create({
                userId: user._id,
                username: user.username,
                ip: ipAddress,
                userAgent,
                device: {
                    client: device.client?.name || '',
                    os: device.os?.name || '',
                    device: device.device?.type || ''
                },
                status: 'failed',
                note: 'Tài khoản đã bị khóa'
            });
            return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
        }

        // 👉 Ghi log lịch sử login thành công
        try {
            await LoginHistory.create({
                userId: user._id,
                username: user.username,
                ip: ipAddress,
                userAgent,
                device: {
                    client: device.client?.name || '',
                    os: device.os?.name || '',
                    device: device.device?.type || ''
                },
                status: 'success'
            });
        } catch (logErr) {
            console.warn(`⚠️ Không thể ghi log lịch sử login:`, logErr);
        }

        // 👉 Tạo JWT và gán vào cookie
        const { password: _, ...safeUser } = user.toObject();
        const token = sign({
            _id: safeUser._id.toString(),
            role: safeUser.role,
            username: safeUser.username
        }, env.SESSION_SECRET, { expiresIn: 86400 });

        res.cookie('token', token, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        // 👉 Cập nhật last login
        user.lastLogin = new Date();
        await user.save();
        // Nếu redirect bắt đầu bằng "/", thì hợp lệ
        if (typeof redirect === 'string' && redirect.startsWith('/')) {
            return res.redirect(redirect);
        }else{
            return res.redirect('/');
        }
    } catch (err) {
        console.error(`❌ Lỗi login bất ngờ:`, err);
        return handleError({
            res,
            error: err,
            status: 500,
            json: false,
            view: 'errors/500',
            viewData: {
                title: 'Lỗi máy chủ',
                message: 'Đã xảy ra lỗi khi xử lý yêu cầu.',
                redirect: req.get('Referer') || '/auth/login',
                layout: false
            }
        });
    }
};



/**
 * Đăng xuất người dùng và huỷ session hiện tại
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const logout = async (req, res) => {
    let userId = null;
    const token = req.cookies?.token;
    if (token) {
        try {
            const payload = verify(token, env.SESSION_SECRET);
            userId = payload._id;
        } catch (_) {}
    }

    if (userId) {
        closeWebSocketByUserId(userId, 'User logged out');
    }

    res.clearCookie('token', {
        path: '/',
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax'
    });

    res.redirect('/auth/login');
};


module.exports = {
    login,
    logout
};
