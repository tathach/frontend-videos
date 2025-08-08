const videoService = require('../../services/video.service');
const { logUserAction } = require('../../services/userAction.service');
const { USER_ACTION_TYPES } = require('../../ultils/constants');

exports.logView = async (req, res) => {
  try {
    const { slug, videoId, source = 'unknown' } = req.body || {};
    if (!slug && !videoId) {
      return res.status(400).json({ success: false, message: 'slug or videoId required' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const deviceId = req.cookies?.deviceId || '';
    const userAgent = req.get('User-Agent') || '';

    const success = await videoService.trackAndIncreaseView({
      slug,
      videoId,
      ip,
      deviceId,
      userAgent,
      source,
    });

    // Only log view action when the view count is actually increased
    if (success && slug) {
      logUserAction({
        type: USER_ACTION_TYPES.VIEW_VIDEO,
        keyword: slug,
        req,
      });
    }

    return res.json({ success });
  } catch (err) {
    console.error('logView error:', err);
    return res.status(500).json({ success: false });
  }
};
