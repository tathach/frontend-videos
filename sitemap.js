const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream, mkdirSync, existsSync } = require('fs');
const path = require('path');
const env = require('./app/ultils/env');
const { mongoose } = require('./app/configs/mongodb');
const Video = require('./app/models/video.model');
const Category = require('./app/models/category.model');
const Tag = require('./app/models/tag.model');

const BASE_URL = process.env.BASE_URL || `http://localhost:${env.PORT || 3003}`;
const LIMIT = 20; // items per page
const MAX_PAGE = 10;
const VIDEO_PAGE_LIMIT = 10000; // Max video URLs per sitemap
const OUTPUT_DIR = path.join(__dirname, 'public');

async function waitForDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  if (mongoose.connection.readyState === 2) {
    // connecting, wait for open
    await new Promise(resolve => mongoose.connection.once('open', resolve));
    return;
  }
  // not connected or disconnected
  await mongoose.connect(env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
}


async function generateSitemapIndex(files) {
  const smStream = new SitemapStream({ hostname: BASE_URL });
  const indexPath = path.join(OUTPUT_DIR, 'sitemap.xml');
  const writeStream = createWriteStream(indexPath);
  smStream.pipe(writeStream);

  for (const file of files) {
    smStream.write({ url: `/${file}` });
  }

  smStream.end();
  await streamToPromise(smStream);
  writeStream.end();
  console.log('✅ Generated sitemap index');
}

async function generateCategoriesSitemap() {
  const filePath = path.join(OUTPUT_DIR, 'sitemap-categories.xml');
  const smStream = new SitemapStream({ hostname: BASE_URL });
  const writeStream = createWriteStream(filePath);
  smStream.pipe(writeStream);

  const categories = await Category.find().lean();
  categories.sort((a, b) => {
    const posA = a.position ?? Infinity;
    const posB = b.position ?? Infinity;
    return posA - posB;
  });
  for (const cat of categories) {
    const count = await Video.countDocuments({ categories: cat._id, status: 'published' });
    const pages = Math.min(MAX_PAGE, Math.ceil(count / LIMIT));
    smStream.write({ url: `/category/${cat.slug}`, changefreq: 'weekly', priority: 0.7 });
    for (let page = 2; page <= pages; page++) {
      smStream.write({ url: `/category/${cat.slug}?page=${page}`, changefreq: 'weekly', priority: 0.6 });
    }
  }

  smStream.end();
  await streamToPromise(smStream);
  writeStream.end();
  return 'sitemap-categories.xml';
}

async function generateTagsSitemap() {
  const filePath = path.join(OUTPUT_DIR, 'sitemap-tags.xml');
  const smStream = new SitemapStream({ hostname: BASE_URL });
  const writeStream = createWriteStream(filePath);
  smStream.pipe(writeStream);

  const tags = await Tag.find().lean();
  for (const tag of tags) {
    const count = await Video.countDocuments({ tags: tag._id, status: 'published' });
    const pages = Math.min(MAX_PAGE, Math.ceil(count / LIMIT));
    smStream.write({ url: `/tag/${tag.slug}`, changefreq: 'weekly', priority: 0.6 });
    for (let page = 2; page <= pages; page++) {
      smStream.write({ url: `/tag/${tag.slug}?page=${page}`, changefreq: 'weekly', priority: 0.5 });
    }
  }

  smStream.end();
  await streamToPromise(smStream);
  writeStream.end();
  return 'sitemap-tags.xml';
}

async function generateVideosSitemaps() {
  const files = [];
  const totalVideos = await Video.countDocuments({ status: 'published' });
  const chunks = Math.ceil(totalVideos / VIDEO_PAGE_LIMIT);

  for (let i = 0; i < chunks; i++) {
    const file = `sitemap-videos-${i + 1}.xml`;
    const filePath = path.join(OUTPUT_DIR, file);
    const smStream = new SitemapStream({ hostname: BASE_URL });
    const writeStream = createWriteStream(filePath);
    smStream.pipe(writeStream);

    const videos = await Video.find({ status: 'published' })
      .sort({ updatedAt: -1 })
      .skip(i * VIDEO_PAGE_LIMIT)
      .limit(VIDEO_PAGE_LIMIT)
      .select('slug updatedAt')
      .lean();

    for (const video of videos) {
      smStream.write({ url: `/video/${video.slug}`, lastmod: video.updatedAt, changefreq: 'weekly', priority: 0.9 });
    }

    smStream.end();
    await streamToPromise(smStream);
    writeStream.end();
    files.push(file);
  }

  return files;
}

(async () => {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR);
  await waitForDB();

  // Home pages
  const homepagePath = path.join(OUTPUT_DIR, 'sitemap-home.xml');
  const homepageStream = new SitemapStream({ hostname: BASE_URL });
  const homepageWrite = createWriteStream(homepagePath);
  homepageStream.pipe(homepageWrite);

  const totalVideos = await Video.countDocuments({ status: 'published' });
  const totalPages = Math.min(MAX_PAGE, Math.ceil(totalVideos / LIMIT));
  homepageStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
  homepageStream.write({ url: '/phim-sex-hay', changefreq: 'daily', priority: 0.9 });
  for (let page = 2; page <= totalPages; page++) {
    homepageStream.write({ url: `/?page=${page}`, changefreq: 'daily', priority: 0.8 });
    homepageStream.write({ url: `/phim-sex-hay?page=${page}`, changefreq: 'daily', priority: 0.8 });
  }
  homepageStream.end();
  await streamToPromise(homepageStream);
  homepageWrite.end();

  const sitemapFiles = [];
  sitemapFiles.push('sitemap-home.xml');
  sitemapFiles.push(await generateCategoriesSitemap());
  sitemapFiles.push(await generateTagsSitemap());
  sitemapFiles.push(...await generateVideosSitemaps());

  await generateSitemapIndex(sitemapFiles);
  console.log('✅ All sitemaps generated successfully');
})();
