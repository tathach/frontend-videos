const Handlebars = require('handlebars');

module.exports = {
    eq: (a, b) => a === b,

    neq: (a, b) => a !== b,

    gt: (a, b) => a > b,

    lt: (a, b) => a < b,
    json: (context) => new Handlebars.SafeString(JSON.stringify(context)),
    formatDate: (date) => {
        if (!date) return '';
        return new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    },
    statusClass: function (status) {
        switch (status) {
            case 'published': return 'success';
            case 'draft': return 'secondary';
            case 'private': return 'dark';
            case 'processing': return 'warning';
            case 'error': return 'danger';
            default: return 'secondary';
        }
    },
    statusList: () => ([
        { value: 'uploading', label: 'Đã tải lên', class: 'secondary' },
        { value: 'processing', label: 'Đang xử lý', class: 'info' },
        { value: 'waiting_review', label: 'Chờ duyệt', class: 'warning' },
        { value: 'rejected', label: 'Bị từ chối', class: 'danger' },
        { value: 'approved', label: 'Đã duyệt', class: 'primary' },
        { value: 'published', label: 'Công khai', class: 'success' },
        { value: 'private', label: 'Riêng tư', class: 'dark' },
        { value: 'error', label: 'Lỗi', class: 'danger' }
    ]),
    range: function (start, end) {
        let result = [];
        for (let i = start; i <= end; i++) result.push(i);
        return result;
    },

    capitalize: (str) => {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    or: function (...args) {
        args.pop(); // remove Handlebars options object
        return args.some(Boolean);
    },
    add: (a, b) => a + b,

    subtract: (a, b) => a - b,

    ifCond: function (v1, operator, v2, options) {
        switch (operator) {
            case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default: return options.inverse(this);
        }
    },
    not: function (value) {
        return !value;
    },
    and: function (...args) {
        args.pop(); // loại bỏ object options
        return args.every(Boolean);
    },


};
