const { mongoose } = require('../configs/mongodb');

const IntroVideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  domain: { type: String, required: true, trim: true },
  video_url: { type: String, default: '' },
  file_size: { type: Number, default: 0, min: 0 },
  duration: { type: Number, default: 0, min: 0 },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['processing', 'uploaded', 'error'],
    default: 'processing'
  },
  is_public: { type: Boolean, default: false }
}, { timestamps: true });

IntroVideoSchema.index({ domain: 1 });
IntroVideoSchema.index({ domain: 1, is_public: 1 });

module.exports = mongoose.model('IntroVideo', IntroVideoSchema);
