const { getSettings } = require('../ultils/settings');

module.exports = (req, res, next) => {
  const settings = getSettings();
  res.locals.settings = settings;
  const base = settings.baseUrl || `${req.protocol}://${req.get('host')}`;
  res.locals.canonicalUrl = base + req.path;
  next();
};
