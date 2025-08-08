const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
// const { isAuth } = require('../middlewares/auth.middleware');

router.get('/login', (req, res) => {
    const redirect = req.query.redirect || '/';
    res.render('auth/login', { redirect });
});

router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;
