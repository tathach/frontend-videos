const { mongoose } = require('../configs/mongodb');

const LoginHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    device: {
        client: { type: String, default: '' },    // Chrome, Firefox,...
        os: { type: String, default: '' },        // Windows, Android,...
        device: { type: String, default: '' }     // desktop, mobile,...
    },
    loginAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
    note: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('LoginHistory', LoginHistorySchema);
