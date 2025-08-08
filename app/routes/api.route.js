const express = require('express');
const router = express.Router();
const videoApiController = require('../controllers/api/video.controller');

router.post('/video/view', videoApiController.logView);

module.exports = router;
