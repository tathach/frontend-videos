// Gắn trước tất cả AJAX
$.ajaxSetup({
    beforeSend: function (xhr) {
        const token = $('meta[name="csrf-token"]').attr('content');
        if (token) {
            xhr.setRequestHeader('X-CSRF-Token', token);
        }
    }
});

const WebSocketManager = (function () {
    let socket = null;
    const listeners = [];
    let reconnectTimeout = null;
    const reconnectDelay = 3000;
    const maxReconnectAttempts = 5;
    let reconnectAttempts = 0;

    function log(...args) {
        const text = args.join(' ') + '\n';
        console.log(...args);
        const logElement = document.getElementById('log');
        if (logElement) logElement.appendChild(document.createTextNode(text));
    }

    function init() {
        if (socket && socket.readyState === WebSocket.OPEN) return socket;

        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const port = location.port ? `:${location.port}` : ''; // Nếu có port, thêm vào
        socket = new WebSocket(`${protocol}://${location.hostname}${port}`);


        socket.onopen = () => {
            log('✅ WebSocket connected');
            reconnectAttempts = 0; // Reset sau khi kết nối thành công
            socket.send(JSON.stringify({
                type: 'broadcast',
                payload: 'Client đã kết nối!'
            }));
        };

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                log('📥 Message:', JSON.stringify(msg));
                listeners.forEach(fn => fn(msg));
            } catch (e) {
                log('⚠️ Invalid message:', event.data);
            }
        };

        socket.onclose = (event) => {
            log(`❌ WebSocket closed`);
            log(`↪️ Code: ${event.code}`);
            log(`📄 Reason: ${event.reason || 'Không có'}`);

            if (event.code === 1008) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Phiên đăng nhập hết hạn',
                    text: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
                    confirmButtonText: 'Đăng nhập lại',
                    allowOutsideClick: false,
                    allowEscapeKey: true
                }).then(() => {
                    window.location.href = '/auth/login';
                });
                return;
            }

            if (reconnectAttempts >= maxReconnectAttempts) {
                log('⛔ Đã vượt quá số lần thử kết nối lại. Dừng lại.');
                return;
            }

            if (!reconnectTimeout) {
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    reconnectAttempts++;
                    log(`🔄 Thử kết nối lại (${reconnectAttempts}/${maxReconnectAttempts})...`);
                    init();
                }, reconnectDelay);
            }
        };

        socket.onerror = (err) => {
            log(`⚠️ WebSocket error:`, err.message || err);
        };

        return socket;
    }

    return {
        init,
        onMessage: (cb) => listeners.push(cb),
        send: (data) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(data));
            }
        },
        getSocket: () => socket
    };
})();

WebSocketManager.init(); // đảm bảo kết nối

function showBootstrapToast({ title = 'Thông báo', message = '', level = 'info', delay = 4000 }) {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const iconMap = {
        info: 'bi-info-circle-fill',
        success: 'bi-check-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        error: 'bi-x-circle-fill'
    };
    const iconClass = iconMap[level] || iconMap.info;

    const toastHtml = `
        <div id="${id}" class="toast align-items-center text-bg-${level} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}">
          <div class="d-flex">
            <div class="toast-body">
              <div class="fw-semibold">${title}</div>
              <div>${message}</div>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>`;


    const container = document.getElementById('toast-container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', toastHtml); // mới nhất ở trên

        const toastEl = document.getElementById(id);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();

        // Tự xoá DOM sau khi ẩn
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
}


window.addEventListener('beforeunload', () => {
    if (WebSocketManager.getSocket()) {
        WebSocketManager.getSocket().close(1000, 'Reloading page');
    }
});

WebSocketManager.onMessage((msg) => {
    if (msg.type === 'notification') {
        const { title = 'Thông báo', message, level = 'info' } = msg.payload || {};
        showBootstrapToast({ title, message, level });
    }
    if (msg.type === 'upload_video') {
        const { video, status } = msg;

        if (!video || !status) return;

        if (status === 'start') {
            showBootstrapToast({
                title: 'Đang xử lý video...',
                message: `🎬 ${video.title || video.slug}`,
                level: 'info',
                delay: 10000
            });
        }

        if (status === 'done') {
            showBootstrapToast({
                title: '✅ Xử lý xong!',
                message: `🎉 Video "${video.title || video.slug}" đã hoàn tất.`,
                level: 'success',
                delay: 2000
            });
            if (location.pathname === '/upload-list') {
                setTimeout(() => {
                    location.reload();
                }, 2000);
            }
        }

        if (status === 'error') {
            showBootstrapToast({
                title: '❌ Lỗi xử lý video!',
                message: `Video "${video.title || video.slug}" gặp lỗi.`,
                level: 'error',
                delay: 3000
            });
        }
    }
});

const SwalHelper = {
    loading(title = 'Đang xử lý...', text = 'Vui lòng chờ') {
        Swal.fire({
            title,
            text,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });
    },
    close() {
        Swal.close();
    },
    success(msg = 'Thành công', timer = 1500) {
        Swal.fire({ icon: 'success', title: '✅ Thành công', text: msg, timer, showConfirmButton: false });
    },
    error(msg = 'Có lỗi xảy ra') {
        Swal.fire({ icon: 'error', title: '❌ Lỗi', text: msg });
    },
    confirmDelete(msg = 'User sẽ bị xoá vĩnh viễn!') {
        return Swal.fire({
            title: 'Bạn chắc chắn?',
            text: msg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xoá',
            cancelButtonText: 'Huỷ',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
        });
    }
};
