const videoService = require('../services/video.service');
const { getCategoryBySlug } = require('../services/category.service');
const { getTagBySlug } = require('../services/tag.service');
const { logUserAction } = require('../services/userAction.service');
const { USER_ACTION_TYPES } = require('../ultils/constants');
const { getPublicIntroByDomain } = require('../services/introVideo.service');
const { getSettings } = require('../ultils/settings');
const {
    buildItemList,
    buildVideoObject,
    generateMetaFromContent,
    generateMetaForTag,
} = require('../helpers/seo.helper');

async function index(req, res) {
    const currentPage = 'index';

    const page = Math.max(1, parseInt(req.query.page)) || 1; // nếu không có thì mặc định là 1
    const limit = 30;

    const movies = await videoService.getVideos({
        page,
        limit,
        search: '',
        status: 'published',
        categories: []
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

    const settings = getSettings();
    res.render('index', {
        title: settings.homeTitle || 'KUXX - Trang Phim Người Lớn Hay Nhất 2025',
        currentPage,
        movies: paginationData,
        structuredData
    });
}

async function topViews(req, res) {
    const currentPage = 'topViews';

    const page = Math.max(1, parseInt(req.query.page)) || 1; // nếu không có thì mặc định là 1
    const limit = 30;

    const movies = await videoService.getVideos({
        page,
        limit,
        search: '',
        status: 'published',
        categories: [],
        sortBy: 'views_desc' // sắp xếp theo lượt xem giảm dần
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

    res.render('topViews', {
        title: 'KUXX - Phim Sex Hay',
        currentPage,
        movies: paginationData,
        structuredData
    });
}

async function videoCategory(req, res) {
    const currentPage = 'category';
    const categorySlug = req.params.category;
    const categoryDoc = await getCategoryBySlug(categorySlug);
    if (!categoryDoc) {
        return res.status(404).render('errors/404');
    }
    if (req.headers['purpose'] !== 'prefetch') {
        logUserAction({
            type: USER_ACTION_TYPES.CLICK_CATEGORY,
            keyword: categorySlug,
            req,
        });
    }
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = 30;

    const movies = await videoService.getVideos({
        page,
        limit,
        search: '',
        status: 'published',
        categories: [categorySlug]
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
    const metaDescription = generateMetaFromContent(categoryDoc.description);

    res.render('videos', {
        title: `KUXX - ${categoryDoc.name}`,
        currentPage,
        metaDescription,
        movies: paginationData,
        heading: categoryDoc.name,
        structuredData
    });
}

async function videoTag(req, res) {
    const currentPage = 'tag';
    const tagSlug = req.params.tag;
    const tagDoc = await getTagBySlug(tagSlug);
    if (!tagDoc) {
        return res.status(404).render('errors/404');
    }
    if (req.headers['purpose'] !== 'prefetch') {
        logUserAction({
            type: USER_ACTION_TYPES.CLICK_TAG,
            keyword: tagSlug,
            req,
        });
    }
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = 30;

    const movies = await videoService.getVideos({
        page,
        limit,
        search: '',
        status: 'published',
        tags: [tagSlug]
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
    const metaDescription = generateMetaForTag(tagDoc.name);

    res.render('videos', {
        title: `KUXX - ${tagDoc.name}`,
        currentPage,
        metaDescription,
        movies: paginationData,
        heading: tagDoc.name,
        structuredData
    });
}

async function watchVideo(req, res) {
    const slug = req.params.slug;
    const video = await videoService.getVideoBySlug(slug, { onlyPublished: true });
    if (!video) {
        return res.status(404).render('errors/404');
    }

    if (req.headers['purpose'] !== 'prefetch') {
        logUserAction({
            type: USER_ACTION_TYPES.CLICK_VIDEO,
            keyword: slug,
            req,
        });
    }

    let intro = null;
    if (res.locals.settings.enableIntroVideo) {
        const domain = req.hostname || req.get('host');
        try {
            intro = await getPublicIntroByDomain(domain);
        } catch (err) {
            console.error('Failed to fetch intro video:', err);
        }
    }

    // Log view and increase view are now handled after 20s via /api/video/view

    const tagIds = (video.tags || []).map(t => t._id);
    const categoryIds = (video.categories || []).map(c => c._id);
    const related = await videoService.getRelatedVideos(tagIds, categoryIds, slug, 20);
    const tags = (video.tags || []).map(t => ({ name: t.name, slug: t.slug }));
    const categories = (video.categories || []).map(c => ({ name: c.name, slug: c.slug }));

    const structuredData = buildVideoObject(video, req);
    const metaDescription = generateMetaFromContent(video.content);

    res.render('watch', {
        title:'KUXX - ' + video.title,
        metaDescription,
        video,
        related,
        tags,
        categories,
        intro,
        structuredData
    });
}

module.exports = {
    index,
    topViews,
    videoCategory,
    videoTag,
    watchVideo
};
