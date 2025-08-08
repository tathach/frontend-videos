const Category = require('../models/category.model');

async function getCategoryBySlug(slug) {
  if (!slug) return null;
  return await Category.findOne({ slug }).lean();
}

async function getAllCategories() {
  const categories = await Category.find().lean();
  categories.sort((a, b) => {
    const posA = a.position === null || a.position === undefined ? Infinity : a.position;
    const posB = b.position === null || b.position === undefined ? Infinity : b.position;
    return posA - posB;
  });
  return categories;
}

module.exports = {
  getCategoryBySlug,
  getAllCategories,
};
