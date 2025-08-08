const env = require('./app/ultils/env');
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const router = require('./app/routes/index.route');
const hbsHelpers = require('./app/helpers/handlebars.helper');
const settingsMiddleware = require('./app/middlewares/settings.middleware');
const trendingTagsMiddleware = require('./app/middlewares/trendingTags.middleware');
const categoriesMiddleware = require('./app/middlewares/categories.middleware');
const { connectRedis } = require('./app/configs/redis');
const { Worker } = require('worker_threads');
const app = express();
require('./app/models/user.model');
require('./app/models/country.model');
require('./app/backup')(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectRedis();
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  helpers: hbsHelpers,
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(settingsMiddleware);
app.use(trendingTagsMiddleware);
app.use(categoriesMiddleware);

app.use('/', router);

if (env.NODE_ENV !== 'test') {
  const worker = new Worker(path.join(__dirname, 'app', 'workers', 'sitemapWatcher.js'));
  worker.on('error', err => console.error('Sitemap worker error:', err));
}

const PORT = env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
