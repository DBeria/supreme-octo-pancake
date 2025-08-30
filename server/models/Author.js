const mongoose = require('mongoose');

const AuthorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String, // Will store a Base64 Data URL
        default: 'https://via.placeholder.com/150'
    },
    // NEW: Added a bio field for the author's description
    bio: {
        type: String,
        default: 'This author has not yet provided a biography.'
    },
    cv: {
        type: String // Will store a Base64 Data URL for the PDF
    }
}, { timestamps: true });

module.exports = mongoose.model('Author', AuthorSchema);