const Video = require('../models/video.model');
const { redisClient } = require('../configs/redis');
const { getTagBySlug } = require('./tag.service');
const { getCategoryBySlug, getAllCategories: getAllCategoryDocs } = require('./category.service');
const Tag = require('../models/tag.model');
const Category = require('../models/category.model');
const stringSimilarity = require('string-similarity');
/**
 * Tăng view video nếu hợp lệ (theo IP + deviceId trong 30 phút)
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.videoId
 * @param {string} options.ip - IP thực của client
 * @param {string} options.deviceId - UUID hoặc ID từ worker
 * @param {string} options.userAgent
 * @param {string} [options.source] - (tuỳ chọn) r2, minio, ...
 * @returns {Promise<boolean>} - true nếu đã tăng view, false nếu bỏ qua
 */
const trackAndIncreaseView = async ({ slug, videoId, ip, deviceId, userAgent, source = 'unknown' }) => {
  if (!videoId && !slug) return false;

  // Bỏ qua nếu User-Agent nghi ngờ là bot/công cụ
  const isLikelyBot = !userAgent || /(bot|crawl|spider|wget|curl|python|node|fetch|go)/i.test(userAgent);
  if (isLikelyBot) return false;

  const idOrSlug = videoId || slug;
  const safeDeviceId = deviceId || `ua-hash:${Buffer.from(userAgent + ip).toString('base64')}`;
  const viewKey = `viewed:${idOrSlug}:${ip}:${safeDeviceId}`;

  // Check debounce 30 phút
  const alreadyViewed = await redisClient.get(viewKey);
  if (alreadyViewed) return false;

  // Anti-flood IP: giới hạn mỗi IP tối đa 30 lượt trong 5 phút
  const ipFloodKey = `ip:flood:${ip}`;
  const floodCount = await redisClient.incr(ipFloodKey);
  if (floodCount === 1) {
    await redisClient.expire(ipFloodKey, 300); // 5 phút
  } else if (floodCount > 30) {
    console.warn(`⚠️ IP flood nghi ngờ: ${ip} (${floodCount} lượt)`);
    return false;
  }

  // Set TTL để debounce
  await redisClient.set(viewKey, 1, 'EX', 60 * 30); // 30 phút

  // Tăng view
  const filter = videoId ? { _id: videoId } : { slug };
  await Video.findOneAndUpdate(filter, { $inc: { views: 1 } });

  // Log thống kê lượt view theo nguồn
  // const statKey = `stats:views:${idOrSlug}:${source}`;
  // await redisClient.incr(statKey);

  return true;
};

/**
 * Lấy danh sách video có phân trang, tìm kiếm gần đúng, lọc theo nhiều thể loại nếu có.
 * @param {Object} queryParams
 * @param {number} queryParams.page
 * @param {number} queryParams.limit
 * @param {string} queryParams.search
 * @param {string} queryParams.status
 * @param {string|string[]} queryParams.categories - Một thể loại hoặc mảng thể loại
 * @param {string|string[]} queryParams.tags - Một tag hoặc mảng tag
 * @returns {Object} { videos, total, page, limit }
 */
const getVideos = async ({
  page = 1,
  limit = 10,
  search = '',
  status = 'published',
  categories = [],
  tags = [],
  sortBy = 'default' // 'views_desc', 'views_asc', 'newest', 'oldest'
}) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (search) {
    query.$text = { $search: search };
  }

  if (status) {
    query.status = status;
  }

  if (categories && categories.length > 0) {
    const categoryArray = Array.isArray(categories) ? categories : [categories];
    const catDocs = await Promise.all(categoryArray.map(c => getCategoryBySlug(c.trim())));
    const catIds = catDocs.filter(Boolean).map(c => c._id);
    if (catIds.length) query.categories = { $in: catIds };
  }

  if (tags && tags.length > 0) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    const tagDocs = await Promise.all(tagArray.map(t => getTagBySlug(t.trim())));
    const tagIds = tagDocs.filter(Boolean).map(t => t._id);
    if (tagIds.length) query.tags = { $in: tagIds };
  }

  const fieldsToSelect = {
    slug: 1,
    title: 1,
    thumbnail: 1,
    thumbnail_s3: 1,
    duration: 1,
    views: 1,
    status: 1,
    file_size: 1,
    published_at: 1,
    createdAt: 1,
    uploaded_by: 1,
    country: 1
  };

  if (search) {
    fieldsToSelect.score = { $meta: 'textScore' };
  }

  // 👉 Linh hoạt sắp xếp theo sortBy
  let sort;
  if (search) {
    sort = { score: { $meta: 'textScore' } };
  } else {
    switch (sortBy) {
      case 'views_desc':
        sort = { views: -1 };
        break;
      case 'views_asc':
        sort = { views: 1 };
        break;
      case 'oldest':
        sort = { published_at: 1 };
        break;
      case 'newest':
        sort = { published_at: -1 };
        break;
      default:
        sort = { published_at: -1, _id: -1 };
    }
  }

  const [videos, total] = await Promise.all([
    Video.find(query, fieldsToSelect)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .populate('uploaded_by', 'username email')
      .populate('tags', 'name slug')
      .populate('categories', 'name slug')
      .populate('country', 'short_name slug')
      .lean(),
    Video.countDocuments(query)
  ]);

  return {
    videos,
    total,
    page: Number(page),
    limit: Number(limit)
  };
};


/**
 * Lấy tất cả thể loại (categories) không trùng lặp từ các video
 * @returns {Array<string>}
 */
const getAllCategories = async () => {
  return await getAllCategoryDocs();
};

/**
 * Lấy thông tin 1 video theo slug hoặc ID
 * @param {string} identifier
 * @returns {Object|null}
 */
const getVideoBySlug = async (identifier, { onlyPublished = true } = {}) => {
  const filter = /^[0-9a-fA-F]{24}$/.test(identifier)
    ? { _id: identifier }
    : { slug: identifier };

  if (onlyPublished) {
    filter.status = 'published';
  }

  const video = await Video.findOne(filter)
    .populate('uploaded_by', 'username email')
    .populate('tags', 'name slug')
    .populate('categories', 'name slug')
    .populate('country', 'short_name slug')
    .lean();
  return video || null;
};

/**
 * Lấy danh sách video liên quan dựa vào tags hoặc categories
 * @param {Array<string>} tags
 * @param {Array<string>} categories
 * @param {string} excludeSlug - bỏ qua video hiện tại
 * @param {number} limit
 * @returns {Array<Object>} videos
 */
const getRelatedVideos = async (tags = [], categories = [], excludeSlug = '', limit = 12) => {
  const query = {
    status: 'published',
    slug: { $ne: excludeSlug },
    $or: [
      { tags: { $in: tags } },
      { categories: { $in: categories } }
    ]
  };

  return await Video.find(query)
    .limit(limit)
    .sort({ views: -1 }) // hoặc { createdAt: -1 }
    .select('title slug thumbnail views video_urls duration country')
    .populate('tags', 'name slug')
    .populate('categories', 'name slug')
    .populate('country', 'short_name slug')
    .lean();
};

function removeVietnameseTones(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}


const searchVideos = async ({ keyword = '', page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const normalizedKeyword = removeVietnameseTones(keyword).toLowerCase().trim();

  if (!normalizedKeyword) {
    return { videos: [], total: 0, page: Number(page), limit: Number(limit) };
  }

  // Tìm các tags & categories gần đúng
  const [allTags, allCategories] = await Promise.all([
    Tag.find().lean(),
    Category.find().lean()
  ]);

  const matchedTags = allTags.filter(tag =>
    stringSimilarity.compareTwoStrings(removeVietnameseTones(tag.name).toLowerCase(), normalizedKeyword) > 0.4
  );
  const matchedCategories = allCategories.filter(cat =>
    stringSimilarity.compareTwoStrings(removeVietnameseTones(cat.name).toLowerCase(), normalizedKeyword) > 0.4
  );

  const tagIds = matchedTags.map(t => t._id);
  const categoryIds = matchedCategories.map(c => c._id);

  // Lấy danh sách video published có title, tags hoặc categories phù hợp
  const query = {
    status: 'published',
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { tags: { $in: tagIds } },
      { categories: { $in: categoryIds } }
    ]
  };

  const [videos, total] = await Promise.all([
    Video.find(query)
      .populate('tags', 'name slug')
      .populate('categories', 'name slug')
      .populate('country', 'short_name slug')
      .skip(skip)
      .limit(limit)
      .lean(),
    Video.countDocuments(query)
  ]);

  // Tính score fuzzy
  const scoredVideos = videos.map(video => {
    const titleScore = stringSimilarity.compareTwoStrings(removeVietnameseTones(video.title).toLowerCase(), normalizedKeyword);

    const tagScore = Math.max(...(video.tags || []).map(tag =>
      stringSimilarity.compareTwoStrings(removeVietnameseTones(tag.name).toLowerCase(), normalizedKeyword)
    ), 0);

    const categoryScore = Math.max(...(video.categories || []).map(cat =>
      stringSimilarity.compareTwoStrings(removeVietnameseTones(cat.name).toLowerCase(), normalizedKeyword)
    ), 0);

    const totalScore = titleScore * 3 + tagScore * 2 + categoryScore * 1;

    return { ...video, _score: totalScore };
  });

  scoredVideos.sort((a, b) => b._score - a._score || new Date(b.published_at) - new Date(a.published_at));

  return {
    videos: scoredVideos,
    total,
    page: Number(page),
    limit: Number(limit),
  };
};


module.exports = {
  getVideos,
  searchVideos,
  getVideoBySlug,
  getRelatedVideos,
  getAllCategories,
  trackAndIncreaseView,
};

