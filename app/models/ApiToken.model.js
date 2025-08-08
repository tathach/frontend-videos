const { mongoose } = require('../configs/mongodb');

const apiTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    domain: {
        type: String,
        required: true,
    },
    allowedRoutes: [{
        type: String,
    }],
    note: {
        type: String,
    },
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
    }
});

module.exports = mongoose.model('ApiToken', apiTokenSchema);
