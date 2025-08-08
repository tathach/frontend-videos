const { mongoose } = require('../configs/mongodb');

const userActionLogSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true },
  target_id: { type: mongoose.Schema.Types.Mixed, default: null },
  keyword: { type: String, default: '' },
  ip: { type: String, default: '' },
  device: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  location: {
    country: { type: String, default: '' },
    region: { type: String, default: '' },
    city: { type: String, default: '' },
    lat: { type: Number, default: null },
    lon: { type: Number, default: null }
  },
  extra: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('user_action_logs', userActionLogSchema);
