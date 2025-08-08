const videoService = require('../services/video.service');
const { logUserAction } = require('../services/userAction.service');
const { USER_ACTION_TYPES } = require('../ultils/constants');
const { sanitizeSearchQuery } = require('../ultils/sanitize');
const { buildItemList } = require('../helpers/seo.helper');

exports.search = async (req, res) => {
  if (req.method === 'POST') {
    const q = sanitizeSearchQuery(req.body.q);
    if (!q) {
      return res.redirect('/');
    }
    return res.redirect(`/search?q=${encodeURIComponent(q)}`);
  }

  const currentPage = 'search';
  const keyword = sanitizeSearchQuery(req.query.q);
  const page = Math.max(1, parseInt(req.query.page)) || 1;
  const limit = 20;

  if (!keyword) {
    return res.redirect('/');
  }

  logUserAction({
    type: USER_ACTION_TYPES.SEARCH,
    keyword,
    req,
  });
  
  const movies = await videoService.searchVideos({
    keyword,
    page,
    limit,
  });

  const totalPages = Math.ceil(movies.total / limit);
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push({
      number: i,
      active: i === page
    });
  }

  const paginationData = {
    ...movies,
    pages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page - 1,
    nextPage: page + 1
  };

  const structuredData = buildItemList(movies.videos, req);

  res.render('videos', {
    title: `Kết quả tìm kiếm: ${keyword}`,
    currentPage,
    movies: paginationData,
    keyword,
    heading: `Kết quả tìm kiếm: ${keyword}`,
    structuredData
  });
};
