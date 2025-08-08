const { getSettings } = require('../ultils/settings');

function getBaseUrl(req) {
  const settings = getSettings();
  return settings.baseUrl || `${req.protocol}://${req.get('host')}`;
}

function videoToListItem(video, index, baseUrl) {
  return {
    '@type': 'ListItem',
    position: index + 1,
    url: `${baseUrl}/video/${video.slug}`
  };
}

function buildItemList(videos, req) {
  const baseUrl = getBaseUrl(req);
  // Lấy chỉ 5 video đầu tiên
  const limitedVideos = videos.slice(0, 5);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: limitedVideos.map((v, i) => videoToListItem(v, i, baseUrl))
  };
}


function buildVideoObject(video, req) {
  const baseUrl = getBaseUrl(req);
    // Tạo mô tả ngắn gọn cho video, cắt nếu quá dài
  let description = Array.isArray(video.content) ? video.content.join(' ') : video.content || '';
  
  // Nếu mô tả dài hơn 160 ký tự, cắt bớt và thêm dấu ba chấm
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name:'KUXX - ' + video.title,
    description: description,
    thumbnailUrl: video.thumbnail,
    uploadDate: video.createdAt ? new Date(video.createdAt).toISOString() : undefined,
    embedUrl: `${baseUrl}/video/${video.slug}`,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: video.views || 0
    }
  };
}

function truncateText(text, maxLength = 150) {
  if (!text) return '';
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  let truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 100) {
    truncated = truncated.slice(0, lastSpace);
  }
  return truncated + '...';
}

function generateMetaFromContent(content, maxLength = 150) {
  if (!content) return '';
  const text = Array.isArray(content) ? content.join(' ') : String(content);
  return truncateText(text, maxLength);
}

function generateMetaForTag(name) {
  if (!name) return '';
  return `Xem tuyển tập video ${name} chất lượng cao miễn phí tại KUXX.`;
}

module.exports = {
  buildItemList,
  buildVideoObject,
  generateMetaFromContent,
  generateMetaForTag,
};
