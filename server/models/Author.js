const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        default: 'Expert in Point-of-Care Ultrasound.',
    },
    profilePicture: {
        type: String, // URL to the image
        default: '/default-avatar.png',
    },
}, {
    timestamps: true,
});

const Author = mongoose.model('Author', authorSchema);

module.exports = Author;