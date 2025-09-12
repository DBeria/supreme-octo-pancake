const Course = require('../models/Course');
const User = require('../models/User');
const Progress = require('../models/Progress');
const Author = require('../models/Author');
const Certificate = require('../models/Certificate');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Get all courses for the admin dashboard (includes soft-deleted)
// @route   GET /api/courses/admin-courses
// @access  Private/Admin
const getAdminAllCourses = async (req, res) => {
    try {
        const author = await Author.findOne({ user: req.user.id });
        if (!author) {
            return res.status(404).json({ message: 'Author profile not found for this admin.' });
        }
        // Fetches all courses created by this author, regardless of isDeleted status
        const courses = await Course.find({ author: author._id }).populate('author', 'fullName').sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all active courses for public view
// @route   GET /api/courses
// @access  Public
const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ isDeleted: false }).populate('author', 'fullName');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = async (req, res) => {
    try {
        const author = await Author.findOne({ user: req.user.id });
        if (!author) {
            return res.status(400).json({ message: 'Admin user must have an author profile to create courses.' });
        }
        const course = new Course({
            ...req.body,
            author: author._id,
        });
        const createdCourse = await course.save();
        res.status(201).json(createdCourse);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin
const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        // Authorization check
        if (course.author.toString() !== req.user.authorId) { // Assuming authorId is attached to req.user
            return res.status(401).json({ message: 'Not authorized to update this course' });
        }
        
        Object.assign(course, req.body);
        const updatedCourse = await course.save();
        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Soft delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        course.isDeleted = true;
        await course.save();
        res.json({ message: 'Course moved to trash' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Restore a soft-deleted course
// @route   PUT /api/courses/:id/restore
// @access  Private/Admin
const restoreCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        course.isDeleted = false;
        await course.save();
        res.json({ message: 'Course restored successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Permanently delete a course
// @route   DELETE /api/courses/:id/permanent-delete
// @access  Private/Admin
const permanentlyDeleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        // Add logic here to delete associated S3 content if necessary
        await course.deleteOne();
        res.json({ message: 'Course permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a single course by ID
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res) => {
    try {
        // THIS IS THE ONLY CHANGE - Adding .populate() to get the author's name
        const course = await Course.findOne({ _id: req.params.id, isDeleted: false }).populate('author', 'fullName');
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Enroll user in a course (for free courses or manual enrollment)
// @route   POST /api/courses/:id/enroll
// @access  Private
const enrollInCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const user = await User.findById(req.user.id);

        if (user.enrolledCourses.includes(course._id)) {
            return res.status(400).json({ message: 'Already enrolled' });
        }

        user.enrolledCourses.push(course._id);
        await user.save();
        res.json({ message: 'Enrolled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a Stripe checkout session for a course
// @route   POST /api/courses/:id/create-checkout-session
// @access  Private
const createCheckoutSession = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const user = await User.findById(req.user.id);
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: course.title },
                    unit_amount: course.price * 100,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/courses/${course._id}`,
            customer_email: user.email,
            metadata: {
                courseId: course._id.toString(),
                userId: user._id.toString(),
            }
        });
        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update user progress in a course
// @route   PUT /api/courses/:courseId/progress
// @access  Private
const updateUserProgress = async (req, res) => {
    try {
        const { lessonId, slideId } = req.body;
        const progress = await Progress.findOneAndUpdate(
            { user: req.user.id, course: req.params.courseId },
            { $set: { 'progress.$[lesson].slides.$[slide].completed': true } },
            { 
                new: true, 
                upsert: true,
                arrayFilters: [{ 'lesson.lessonId': lessonId }, { 'slide.slideId': slideId }]
            }
        );
        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit a quiz and record the score
// @route   POST /api/courses/:courseId/lesson/:lessonId/slide/:slideId/quiz
// @access  Private
const submitQuiz = async (req, res) => {
    // Logic to check answers, calculate score, and save it to the Progress model
    res.json({ message: "Quiz submitted successfully" });
};

// @desc    Submit the final exam
// @route   POST /api/courses/:courseId/lesson/:lessonId/final-exam
// @access  Private
const submitFinalExam = async (req, res) => {
    // Logic to grade the final exam and update progress
    res.json({ message: "Final exam submitted" });
};

// @desc    Save certificate after course completion
// @route   PUT /api/courses/:courseId/save-certificate
// @access  Private
const saveCertificate = async (req, res) => {
    try {
        const certificate = new Certificate({
            user: req.user.id,
            course: req.params.courseId,
            ...req.body, // certificateUrl, dateOfCompletion
        });
        await certificate.save();
        res.status(201).json(certificate);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


module.exports = {
    getAdminAllCourses,
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    restoreCourse,
    permanentlyDeleteCourse,
    getCourseById,
    enrollInCourse,
    createCheckoutSession,
    updateUserProgress,
    submitQuiz,
    submitFinalExam,
    saveCertificate
};