const path = require('path');
const { parentPort } = require('worker_threads');
const { mongoose } = require('../configs/mongodb');
const Tag = require('../models/tag.model');
const Category = require('../models/category.model');
const Video = require('../models/video.model');
const { exec } = require('child_process');
const { existsSync, readFileSync, writeFileSync } = require('fs');

const CHECK_INTERVAL = 10 * 60 * 1000; // 10 phút
const CACHE_FILE = path.join(__dirname, 'sitemap-counts.json');
let previous = { tag: 0, category: 0, videoPub: 0 };

if (existsSync(CACHE_FILE)) {
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    previous = { ...previous, ...data };
  } catch (err) {
    console.error('❌ Không thể đọc sitemap cache:', err);
  }
}

async function waitForDB() {
  const now = new Date().toISOString();
  if (mongoose.connection.readyState === 1) {
    console.log(`[${now}] ✅ MongoDB đã kết nối.`);
    return;
  }
  if (mongoose.connection.readyState === 2) {
    console.log(`[${now}] ⏳ Đang chờ MongoDB kết nối...`);
    await new Promise(resolve => mongoose.connection.once('open', resolve));
    console.log(`[${now}] ✅ MongoDB đã kết nối (sau khi chờ).`);
    return;
  }
  console.log(`[${now}] 🔌 Kết nối mới tới MongoDB...`);
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log(`[${now}] ✅ Đã kết nối MongoDB.`);
}

async function runSitemap() {
  const cmd = `node ${path.join(__dirname, '..', '..', 'sitemap.js')}`;
  const now = new Date().toISOString();
  console.log(`[${now}] 🚀 Đang chạy lệnh tạo sitemap: ${cmd}`);
  exec(cmd, (err, stdout, stderr) => {
    const logTime = new Date().toISOString();
    if (err) {
      console.error(`[${logTime}] ❌ Lỗi khi tạo sitemap:`, err);
    } else {
      console.log(`[${logTime}] ✅ Đã tạo sitemap thành công.`);
      if (stdout.trim()) console.log(`[stdout]:\n${stdout}`);
      if (stderr.trim()) console.error(`[stderr]:\n${stderr}`);
    }
  });
}

async function checkChanges() {
  const now = new Date().toISOString();
  try {
    console.log(`\n[${now}] 🔍 Kiểm tra thay đổi dữ liệu...`);
    const [tags, categories, videos] = await Promise.all([
      Tag.countDocuments(),
      Category.countDocuments(),
      Video.countDocuments({ status: 'published' })
    ]);

    console.log(`🔸 Tags: ${tags} (trước: ${previous.tag})`);
    console.log(`🔸 Categories: ${categories} (trước: ${previous.category})`);
    console.log(`🔸 Published Videos: ${videos} (trước: ${previous.videoPub})`);

    const isChanged =
      tags !== previous.tag ||
      categories !== previous.category ||
      videos !== previous.videoPub;

    if (isChanged) {
      console.log(`[${now}] 🔁 Có thay đổi → Tiến hành tạo lại sitemap...`);
      previous = { tag: tags, category: categories, videoPub: videos };
      await runSitemap();
      try {
        writeFileSync(CACHE_FILE, JSON.stringify(previous));
        console.log(`📄 Đã lưu cache sitemap vào ${CACHE_FILE}`);
      } catch (err) {
        console.error('❌ Không thể lưu sitemap cache:', err);
      }
    } else {
      console.log(`[${now}] ✅ Không có thay đổi. Không cần tạo lại sitemap.`);
    }
  } catch (err) {
    console.error(`[${now}] ❌ Lỗi khi kiểm tra dữ liệu sitemap:`, err);
  }
}

(async () => {
  await waitForDB();
  await checkChanges();
  setInterval(checkChanges, CHECK_INTERVAL);
})();
