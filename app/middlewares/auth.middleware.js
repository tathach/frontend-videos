const env = require('../ultils/env');
const { verify } = require('../ultils/jwt');

const isAdmin = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }

    try {
        const payload = verify(token, env.SESSION_SECRET);

        if (payload && payload._id && payload.role === 'admin') {
            req.user = payload;
            res.locals.currentUser = payload;
            return next();
        }

        console.warn(`⛔ Truy cập trái phép – Không phải admin`);
        return res.status(403).json({ error: 'Bạn không có quyền truy cập' });

    } catch (err) {
        console.error(`❌ Lỗi xác thực admin:`, err);
        return res.redirect(`/auth/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
};

module.exports = {
    isAdmin
};
