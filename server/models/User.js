const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const QuizProgressSchema = new mongoose.Schema({
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
    slideId: { type: mongoose.Schema.Types.ObjectId, required: true },
    isCorrect: { type: Boolean, required: true },
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    idNumber: {
        type: String,
        required: [true, 'Please add an ID number'],
        unique: true,
        match: [/^\\d{11}$/, 'Please add a valid 11-digit ID number']
    },
    mobileNumber: {
        type: String,
        required: false,
        match: [/^\\d{9}$/, 'Please add a valid 9-digit mobile number']
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    enrolledCourses: [{
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        lastViewedLesson: { type: mongoose.Schema.Types.ObjectId, default: null },
        lastViewedSlideIndex: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        certificate: { type: String },
        progress: [QuizProgressSchema]
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return resetToken;
}

module.exports = mongoose.model('User', UserSchema);