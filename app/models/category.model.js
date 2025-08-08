const { mongoose } = require('../configs/mongodb');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  position: { type: Number, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('categories', categorySchema);
