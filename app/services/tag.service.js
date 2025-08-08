const Tag = require('../models/tag.model');
const Video = require('../models/video.model');
const TrendingTagCache = require('../models/trendingTagCache.model');
const slugify = require('../ultils/slugify');

const SLUG_LIMIT = 20;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lấy danh sách thẻ theo tổng lượt xem của các video gắn thẻ đó.
 * Kết quả được cache trong MongoDB và chỉ cập nhật mỗi 24 giờ.
 */
async function getTrendingTags(limit = SLUG_LIMIT) {
  const now = Date.now();
  const cache = await TrendingTagCache.findOne().lean();
  if (cache && now - cache.generatedAt.getTime() < ONE_DAY_MS) {
    return cache.tags.slice(0, limit);
  }

  const tags = await Video.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        totalViews: { $sum: '$views' }
      }
    },
    { $sort: { totalViews: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'tags',
        localField: '_id',
        foreignField: '_id',
        as: 'tag'
      }
    },
    { $unwind: '$tag' },
    {
      $project: {
        _id: 0,
        slug: '$tag.slug',
        name: '$tag.name',
        totalViews: 1
      }
    }
  ]);

  await TrendingTagCache.findOneAndUpdate(
    {},
    { tags, generatedAt: new Date(now) },
    { upsert: true }
  );

  return tags;
}

async function getTagBySlug(slug) {
  if (!slug) return null;
  return await Tag.findOne({ slug }).lean();
}

async function getAllTags() {
  return await Tag.find().lean();
}

module.exports = {
  getTrendingTags,
  getTagBySlug,
  getAllTags,
  slugify,
};
