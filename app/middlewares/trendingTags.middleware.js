const { getTrendingTags } = require('../services/tag.service');

module.exports = async (req, res, next) => {
  try {
    res.locals.trendingTags = await getTrendingTags();
  } catch (err) {
    console.error('Failed to load trending tags:', err);
    res.locals.trendingTags = [];
  }
  next();
};
