const IntroVideo = require('../models/introVideo.model');

async function getPublicIntroByDomain(domain) {
  if (!domain) return null;
  const intro = await IntroVideo.findOne({ domain, is_public: true }).lean();
  return intro || null;
}

module.exports = { getPublicIntroByDomain };
