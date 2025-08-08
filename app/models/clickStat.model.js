const { mongoose } = require('../configs/mongodb');

const clickStatSchema = new mongoose.Schema({
  target_type: { type: String, required: true, trim: true },
  target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  count: { type: Number, default: 0 },
  last_clicked_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('click_stats', clickStatSchema);
