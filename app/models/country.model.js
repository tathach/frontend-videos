const { mongoose } = require('../configs/mongodb');

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, unique: true },
  short_name: { type: String, trim: true, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('countries', countrySchema);
