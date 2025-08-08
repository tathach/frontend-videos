const { mongoose } = require('../configs/mongodb');

// Schema lưu trữ thông tin phục vụ theo dõi quảng cáo
const AdsTrackingSchema = new mongoose.Schema({
    name: {                      // Tên quảng cáo hoặc chiến dịch
        type: String,
        required: true,
        trim: true
    },
    position: {                 // Vị trí hiển thị quảng cáo
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        required: true,
        trim: true
    },
    image: {                    // URL hình ảnh quảng cáo
        type: String,
        default: ''
    },
    link: {                     // Link đích khi người dùng click
        type: String,
        default: ''
    },
    parameters: {               // Các tham số tuỳ ý hỗ trợ tracking
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    impressions: {              // Số lần quảng cáo được hiển thị
        type: Number,
        default: 0,
        min: 0
    },
    clicks: {                   // Số lần click vào quảng cáo
        type: Number,
        default: 0,
        min: 0
    },
    startsAt: {                // Thời gian bắt đầu hiển thị quảng cáo
        type: Date,
        default: Date.now
    },
    expiresAt: {               // Thời gian hết hạn quảng cáo
        type: Date,
        default: null
    },
    isActive: {                 // Quảng cáo có đang được kích hoạt hay không
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Tạo index giúp truy vấn nhanh theo vị trí và trạng thái
AdsTrackingSchema.index({ position: 1 });
AdsTrackingSchema.index({ domain: 1 });
AdsTrackingSchema.index({ isActive: 1 });
AdsTrackingSchema.index({ expiresAt: 1 });
AdsTrackingSchema.index({ startsAt: 1 });

module.exports = mongoose.model('AdsTracking', AdsTrackingSchema);
