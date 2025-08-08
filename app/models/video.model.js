const { mongoose } = require('../configs/mongodb');

const videoSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tags', default: [] }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'categories', default: [] }],
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'countries', default: null },
  content: {
    type: [String],
    default: []
  },
  thumbnail: {
    type: String,
    required: true
  },
  thumbnail_s3: {
    type: String,
    default:null
  },
  duration: {
    type: Number,
    min: 0
  },
  file_size: {
    type: Number,
    min: 0
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  video_urls: {
    type: Map,
    of: String,
    default: {}
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: [
      'uploading',      // Đang upload hoặc đang xử lý file
      'processing',     // Đang xử lý video, convert HLS v.v
      'waiting_review', // Đợi kiểm duyệt
      'rejected',       // Bị từ chối duyệt (nội dung không hợp lệ)
      'approved',       // Đã được duyệt nhưng chưa công khai
      'published',      // Đã công khai cho mọi người
      'private',        // Chỉ người upload xem được
      'error'           // Lỗi xử lý video
    ],
    default: 'uploading'
  },
  review_note: {
    type: String,
    default: ''
  },
  is_featured: {
    type: Boolean,
    default: false
  },
  segments_path_prefix: {
    type: String,
    required: true
  },
  published_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

videoSchema.index({ slug: 1 }, { unique: true });
videoSchema.index({ status: 1 });
// Nếu cần search toàn văn
videoSchema.index({
  title: 'text',
  content: 'text'
});
module.exports = mongoose.model('videos', videoSchema);
