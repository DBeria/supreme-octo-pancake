const mongoose = require('mongoose');

const ContentElementSchema = new mongoose.Schema({
    type: { type: String, enum: ['text', 'image', 'video'], required: true },
    content: { type: String, required: true },
    position: { 
        x: { type: Number, default: 10 },
        y: { type: Number, default: 10 }
    },
    size: {
        width: { type: Number, default: 300 },
        height: { type: Number, default: 150 }
    },
    rotation: { type: Number, default: 0 },
    zIndex: { type: Number, default: 1 },
    fontSize: { type: Number, default: 16 },
    fontFamily: { type: String, default: 'Arial' },
    color: { type: String, default: '#000000' },
    isBold: { type: Boolean, default: false },
    isItalic: { type: Boolean, default: false },
    isUnderline: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
}, { id: false });

const MatchPromptSchema = new mongoose.Schema({
    prompt: { type: String, default: 'Label' },
    correctMatch: { type: String, default: 'A' }
}, { id: false });

const QuizSchema = new mongoose.Schema({
    type: { type: String, enum: ['single-choice', 'multiple-choice', 'matching'], default: 'single-choice' },
    question: { type: String, default: 'New Question' },
    answers: [
        new mongoose.Schema({
            text: { type: String },
            isCorrect: { type: Boolean, default: false }
        }, { id: false })
    ],
    explanation: { type: String, default: 'Add an explanation for the correct answer.' },
    matchPrompts: [MatchPromptSchema],
    matchOptions: [{ type: String }]
}, { id: false });

const SlideSchema = new mongoose.Schema({
    title: { type: String },
    elements: [ContentElementSchema],
    quiz: { type: QuizSchema, default: null },
    backgroundColor: { type: String, default: '#FFFFFF' }
}, { id: false });

const LessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slides: [SlideSchema],
    isFinalExam: { type: Boolean, default: false },
}, { id: false });

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    specialty: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    imageUrl: { type: String, required: true },
    instructorWelcomeNote: { type: String, default: '' },
    isPublic: { type: Boolean, default: true },
    lessons: [LessonSchema],
    tags: [{ type: String }],
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
    deletedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);