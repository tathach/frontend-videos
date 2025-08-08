const express = require('express');
const router = express.Router();
const indexController = require('../controllers/index.controller');
const env = require('../ultils/env');
const searchController = require('../controllers/search.controller');
const { isAdmin } = require('../middlewares/auth.middleware');

router.get('/', indexController.index);
router.get('/phim-sex-hay', indexController.topViews);
router.get('/category/:category', indexController.videoCategory);
router.get('/tag/:tag', indexController.videoTag);
router.get('/video/:slug', indexController.watchVideo);

router.post('/search', searchController.search);
router.get('/search', searchController.search);

// Redirects for old URLs
router.use('/api/v1', require('./api.route'));
router.use('/auth', require('./auth.route'));
router.use('/settings', isAdmin, require('./settings.route'));


module.exports = router;

