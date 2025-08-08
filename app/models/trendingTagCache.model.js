const { mongoose } = require('../configs/mongodb');

const trendingTagCacheSchema = new mongoose.Schema({
  tags: [
    {
      name: { type: String, required: true },
      slug: { type: String, required: true },
      totalViews: { type: Number, default: 0 }
    }
  ],
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('trending_tag_caches', trendingTagCacheSchema);
