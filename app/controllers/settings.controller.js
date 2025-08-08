const { getSettings, saveSettings } = require('../ultils/settings');

exports.get = (req, res) => {
  const settings = getSettings();
  res.render('settings', {
    title: 'Quản lý cấu hình',
    currentPage: 'settings',
    settings
  });
};

exports.update = (req, res) => {
  const previous = getSettings();
  const {
    metaTags,
    metaDescription,
    ogImage,
    baseUrl,
    cssLinks,
    scripts,
    backgroundColor,
    containerColor,
    enableEmbedAd,
    enableIndex,
    enableIntroVideo,
    homeTitle
  } = req.body;

  let backgroundImage = previous.backgroundImage;
  let ogImagePath = previous.ogImage;
  let logo = previous.logo;
  const homePageTitle = homeTitle || previous.homeTitle;

  if (req.files) {
    if (req.files.backgroundImage && req.files.backgroundImage[0]) {
      backgroundImage = '/assets/img/' + req.files.backgroundImage[0].filename;
    }
    if (req.files.ogImage && req.files.ogImage[0]) {
      ogImagePath = '/assets/img/' + req.files.ogImage[0].filename;
    }
    if (req.files.logo && req.files.logo[0]) {
      logo = '/assets/img/' + req.files.logo[0].filename;
    }
  }

  const settings = {
    metaTags,
    metaDescription,
    ogImage: ogImagePath,
    baseUrl,
    cssLinks,
    scripts,
    backgroundImage,
    backgroundColor,
    containerColor,
    enableEmbedAd: !!enableEmbedAd,
    enableIndex: !!enableIndex,
    enableIntroVideo: !!enableIntroVideo,
    logo,
    homeTitle: homePageTitle
  };

  saveSettings(settings);
  res.redirect('/settings');
};
