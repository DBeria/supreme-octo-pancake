const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
    },
    certificateUrl: {
        type: String,
        required: true,
    },
    dateOfCompletion: {
        type: Date,
        default: Date.now,
        required: true,
    },
}, {
    timestamps: true,
});

certificateSchema.index({ user: 1 });
certificateSchema.index({ course: 1 });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;