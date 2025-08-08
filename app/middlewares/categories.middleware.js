const { getAllCategories } = require('../services/category.service');

module.exports = async (req, res, next) => {
  try {
    res.locals.categoriesMenu = await getAllCategories();
  } catch (err) {
    console.error('Failed to load categories:', err);
    res.locals.categoriesMenu = [];
  }
  next();
};
