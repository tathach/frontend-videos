const { mongoose } = require('../configs/mongodb');

const searchKeywordSchema = new mongoose.Schema({
  keyword: { type: String, required: true, trim: true, unique: true },
  count: { type: Number, default: 0 },
  last_searched_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('search_keywords', searchKeywordSchema);
