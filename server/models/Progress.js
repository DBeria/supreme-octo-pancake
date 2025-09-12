const mongoose = require('mongoose');

const slideProgressSchema = new mongoose.Schema({
    slideId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    quizScore: {
        type: Number,
    },
}, { _id: false });

const lessonProgressSchema = new mongoose.Schema({
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    slides: [slideProgressSchema],
    completed: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

const progressSchema = new mongoose.Schema({
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
    progress: [lessonProgressSchema],
    isCompleted: {
        type: Boolean,
        default: false,
    },
    certificateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate',
    },
}, {
    timestamps: true,
});

// Ensure a user can only have one progress document per course
progressSchema.index({ user: 1, course: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;