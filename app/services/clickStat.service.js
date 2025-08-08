const ClickStat = require('../models/clickStat.model');

async function increaseClick(targetType, targetId) {
  if (!targetType || !targetId) return null;
  return ClickStat.findOneAndUpdate(
    { target_type: targetType, target_id: targetId },
    { $inc: { count: 1 }, last_clicked_at: new Date() },
    { upsert: true, new: true }
  ).lean();
}

async function getStats({ targetType, page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const query = {};
  if (targetType) query.target_type = targetType;
  const [items, total] = await Promise.all([
    ClickStat.find(query).sort({ count: -1 }).skip(skip).limit(limit).lean(),
    ClickStat.countDocuments(query)
  ]);
  return { stats: items, total, page, limit };
}

module.exports = { increaseClick, getStats };
