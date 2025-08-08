const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const Category = require('../models/category.model');
const Tag = require('../models/tag.model');
const Video = require('../models/video.model');
const slugify = require('../ultils/slugify');
const { USER_ACTION_TYPES } = require('../ultils/constants');
const searchKeywordService = require('./searchKeyword.service');
const clickStatService = require('./clickStat.service');
const userActionLogService = require('./userActionLog.service');

const VALID_TYPES = Object.values(USER_ACTION_TYPES);

/**
 * Log a user action with provided request information
 * @param {Object} params
 * @param {string} params.type - Action type
 * @param {string} params.keyword - Keyword or slug of target
 * @param {Object} params.extra - Extra data to store
 * @param {Object} params.req - Express request object
 * @returns {Promise<Object|null>} The created log document or null on error
 */
async function logUserAction({ type, keyword, extra = {}, req }) {
  try {
    if (!type || !keyword) {
      throw new Error('Type and keyword are required');
    }

    if (type !== USER_ACTION_TYPES.SEARCH && keyword) {
      keyword = slugify(keyword);
    }

    const rawIp = req?.headers?.['cf-connecting-ip'] ||
      req?.headers?.['x-forwarded-for'] ||
      req?.ip || '';
    const ip = String(rawIp).split(',')[0].trim();

    const geo = geoip.lookup(ip);
    const location = {
      country: geo?.country || '',
      region: geo?.region || '',
      city: geo?.city || '',
      lat: geo?.ll?.[0] || null,
      lon: geo?.ll?.[1] || null,
    };

    const userAgent = req?.headers?.['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const parsed = parser.getResult();
    const device = `${parsed.device.type || 'desktop'} - ${parsed.os.name || ''} - ${parsed.browser.name || ''}`;

    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    let logTargetId = null;

    if (type === USER_ACTION_TYPES.SEARCH && keyword) {
      const keywordDoc = await searchKeywordService.increaseKeyword(keyword);
      logTargetId = keywordDoc ? keywordDoc._id : null;
    }

    if ([USER_ACTION_TYPES.CLICK_CATEGORY, USER_ACTION_TYPES.CLICK_TAG].includes(type) && keyword) {
      const model = type === USER_ACTION_TYPES.CLICK_CATEGORY ? Category : Tag;
      const record = await model.findOne({ slug: keyword }).lean();
      if (record) {
        const targetType = type === USER_ACTION_TYPES.CLICK_CATEGORY ? 'category' : 'tag';
        const statDoc = await clickStatService.increaseClick(targetType, record._id);
        logTargetId = statDoc ? statDoc._id : null;
      }
    }

    if ([USER_ACTION_TYPES.CLICK_VIDEO, USER_ACTION_TYPES.VIEW_VIDEO].includes(type) && keyword) {
      const video = await Video.findOne({ slug: keyword }).select('_id').lean();
      if (video) {
        const statType = type === USER_ACTION_TYPES.CLICK_VIDEO ? 'video' : 'video_view';
        await clickStatService.increaseClick(statType, video._id);
        logTargetId = video._id;
      }
    }

    const log = await userActionLogService.createLog({
      type,
      targetId: logTargetId,
      keyword,
      ip,
      device,
      userAgent,
      location,
      extra,
    });

    return log;
  } catch (err) {
    console.error('logUserAction error:', err);
    return null;
  }
}

module.exports = { logUserAction };
