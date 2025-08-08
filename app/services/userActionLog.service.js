const UserActionLog = require('../models/userActionLog.model');

async function createLog({ type, targetId, keyword = '', ip = '', device = '', userAgent = '', location = {}, extra = {} }) {
  const log = await UserActionLog.create({
    type,
    target_id: targetId || null,
    keyword,
    ip,
    device,
    user_agent: userAgent,
    location,
    extra
  });

  return log.toObject();
}

async function getLogs({ page = 1, limit = 20, type } = {}) {
  const skip = (page - 1) * limit;
  const query = {};
  if (type) query.type = type;

  const [logs, total] = await Promise.all([
    UserActionLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    UserActionLog.countDocuments(query)
  ]);

  return { logs, total, page, limit };
}

async function getActionStats() {
  const result = await UserActionLog.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  const stats = {};
  for (const r of result) {
    stats[r._id] = r.count;
  }
  return stats;
}

module.exports = { createLog, getLogs, getActionStats };
