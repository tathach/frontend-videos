/**
 * Gửi phản hồi lỗi chuẩn hóa
 * @param {Object} options
 * @param {import('express').Response} options.res
 * @param {Error|string} options.error - Có thể là chuỗi hoặc object Error
 * @param {number} [options.status=500]
 * @param {boolean} [options.json=true] - true nếu API, false nếu là render view
 * @param {string} [options.view] - view cần render nếu json = false
 * @param {Object} [options.viewData] - dữ liệu render view
 */
function handleError({
  res,
  error = {},               // ✅ Đảm bảo luôn có object để đọc .message, .stack
  status = 500,
  json = true,
  view = 'errors/500',
  viewData = {}
}) {
  const message = typeof error === 'string' ? error : error.message || 'Lỗi không xác định';

  if (json) {
    return res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && error.stack && { error: error.stack })
    });
  }

  return res.status(status).render(view, {
    title: viewData.title || 'Lỗi máy chủ',
    message,
    redirect: viewData.redirect || '/',
    layout: viewData.layout !== false,
    ...viewData
  });
}
module.exports = handleError

