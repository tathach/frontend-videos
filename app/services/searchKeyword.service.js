const SearchKeyword = require('../models/searchKeyword.model');

async function increaseKeyword(keyword = '') {
  if (!keyword) return null;
  return SearchKeyword.findOneAndUpdate(
    { keyword },
    { $inc: { count: 1 }, last_searched_at: new Date() },
    { upsert: true, new: true }
  ).lean();
}

async function getKeywords({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SearchKeyword.find().sort({ count: -1 }).skip(skip).limit(limit).lean(),
    SearchKeyword.countDocuments()
  ]);
  return { keywords: items, total, page, limit };
}

module.exports = { increaseKeyword, getKeywords };
