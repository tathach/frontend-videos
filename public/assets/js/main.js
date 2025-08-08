(function () {
  // Prefetch pages on hover for desktop users
  if (window.Helpers && window.Helpers.isSmallScreen && window.Helpers.isSmallScreen()) {
    return;
  }

  const PREFETCH_DELAY = 600; // ms
  const prefetched = new Set();

  function prefetchUrl(url) {
    if (!url || prefetched.has(url)) return;
    prefetched.add(url);

    // Sử dụng <link rel="prefetch"> thay vì fetch
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);  // Thêm vào <head> để trình duyệt thực hiện prefetch
  }

  function addPrefetchHover(selector) {
    document.querySelectorAll(selector).forEach(el => {
      let timer;
      const anchor = el.tagName === 'A' ? el : el.closest('a');
      const url = anchor && anchor.href;
      if (!url) return;
      el.addEventListener('mouseenter', () => {
        timer = setTimeout(() => prefetchUrl(url), PREFETCH_DELAY);
      });
      el.addEventListener('mouseleave', () => clearTimeout(timer));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    addPrefetchHover('.header-menu a');
    addPrefetchHover('.tag-container a');
    addPrefetchHover('.col-custom-5 a, .video-card');
  });
})();

// devtoolsDetector.addListener((isOpen) => {
//   if (isOpen) {
//     // Khi mở DevTools → thay nội dung
//     document.body.innerHTML = `
//         <h1 style="color:red;text-align:center;margin-top:20%;">Hay lắm nha :))</h1>
//       `;
//   } else {
//     // Khi DevTools bị đóng → reload lại trang
//     location.reload();
//   }
// });

// devtoolsDetector.launch();

