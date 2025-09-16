const Course = require('../models/Course');
const User = require('../models/User');
// Removed the 'Author' model as it's no longer needed for courses
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
    try {
        // --- KEY CHANGE ---
        // Removed all logic related to finding or creating an 'Author'.
        const { title, description, level, specialty, price, imageUrl, isPublic, instructorWelcomeNote, tags } = req.body;
        
        const course = new Course({
            title, description, level, specialty, price, imageUrl, isPublic, instructorWelcomeNote,
            tags: tags || [],
            lessons: [], // Start with no lessons
            createdBy: req.user.id, // Directly assign the logged-in user's ID as the creator
        });
        
        const createdCourse = await course.save();
        res.status(201).json(createdCourse);
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ message: 'Server Error: Could not create the course.', error: error.message });
    }
};

// @desc    Get courses for logged-in admin
// @route   GET /api/courses/admin-courses
// @access  Private/Admin
exports.getAdminCourses = async (req, res) => {
    try {
        // --- KEY CHANGE ---
        // This query now filters courses to ONLY find ones where 'createdBy' matches the admin's ID.
        const courses = await Course.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching admin courses' });
    }
};

// @desc    Get all public courses
// @route   GET /api/courses
// @access  Public
exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ isPublic: true, status: { $ne: 'deleted' } })
            // --- KEY CHANGE ---
            // Now populates 'createdBy' with the User's details instead of 'creator'.
            .populate('createdBy', 'name fullName profilePicture'); // Fetches fields needed by frontend
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            // --- KEY CHANGE ---
            // Populates 'createdBy' to show the author's name on the detail page.
            .populate('createdBy', 'name fullName profilePicture');

        if (course) {
            res.json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Your other controller functions remain below ---
// They are now protected by the updated middleware, so no changes are needed inside them.
exports.updateCourse = async (req, res) => {
    try {
        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedCourse) return res.status(404).json({ message: 'Course not found' });
        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteCourse = async (req, res) => {
     try {
        const course = await Course.findById(req.params.id);
        if (course) {
            course.status = 'deleted';
            course.deletedAt = new Date();
            await course.save();
            res.json({ message: 'Course moved to recycle bin' });
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.restoreCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (course) {
            course.status = 'active';
            course.deletedAt = null;
            await course.save();
            res.json({ message: 'Course restored successfully' });
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.permanentlyDeleteCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        res.json({ message: 'Course permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// ... (The rest of your functions: enrollInCourse, createCheckoutSession, etc. are unchanged)
exports.createCheckoutSession = async (req, res) => { /* Your Existing Code */ };
exports.enrollInCourse = async (req, res) => { /* Your Existing Code */ };
exports.updateUserProgress = async (req, res) => { /* Your Existing Code */ };
exports.submitQuiz = async (req, res) => { /* Your Existing Code */ };
exports.submitFinalExam = async (req, res) => { /* Your Existing Code */ };
exports.saveCertificate = async (req, res) => { /* Your Existing Code */ };

// @desc    Create a Stripe checkout session for a course
// @route   POST /api/courses/:id/create-checkout-session
// @access  Private
exports.createCheckoutSession = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const user = await User.findById(req.user.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (user.enrolledCourses.some(e => e.course.toString() === course._id.toString())) {
            return res.status(400).json({ message: 'User is already enrolled in this course.' });
        }
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: course.title,
                            images: [course.imageUrl],
                        },
                        unit_amount: course.price * 100, // Stripe expects price in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${course._id}`,
            cancel_url: `${req.protocol}://${req.get('host')}/courses/${course._id}`,
            metadata: {
                userId: req.user.id,
                courseId: course._id.toString(),
            }
        });
        
        res.json({ id: session.id, url: session.url });

    } catch (error) {
        console.error('Stripe Checkout Session Error:', error);
        res.status(500).json({ message: 'Server Error: Could not create checkout session.', error: error.message });
    }
};

// @desc    Enroll a user in a course
// @route   POST /api/courses/:id/enroll
// @access  Private
// NOTE: This endpoint is now for free courses only. We will need a webhook for paid courses.
exports.enrollInCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const user = await User.findById(req.user.id);
        if (user.enrolledCourses.some(e => e.course.toString() === course._id.toString())) {
            return res.status(400).json({ message: 'User is already enrolled in this course.' });
        }
        
        if (course.price > 0) {
            return res.status(400).json({ message: 'This course is not free. Please use the payment gateway.' });
        }
        
        const enrollmentData = {
            course: course._id,
            progress: [],
            isCompleted: false,
            lastViewedLesson: course.lessons && course.lessons.length > 0 ? course.lessons[0]._id : null,
            lastViewedSlideIndex: 0
        };

        user.enrolledCourses.push(enrollmentData);
        await user.save({ validateBeforeSave: false });
        res.json({ message: 'Enrolled successfully' });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc Update user progress in a course
// @route PUT /api/courses/:courseId/progress
// @access Private
exports.updateUserProgress = async (req, res) => {
    const { lessonId, slideIndex } = req.body;
    try {
        const user = await User.findById(req.user.id);
        const courseEnrollment = user.enrolledCourses.find(c => c.course.toString() === req.params.courseId);
        if (courseEnrollment) {
            courseEnrollment.lastViewedLesson = lessonId;
            courseEnrollment.lastViewedSlideIndex = slideIndex;
            // FIX: Add validateBeforeSave: false to prevent validation errors on existing user data
            await user.save({ validateBeforeSave: false });
            res.json({ message: 'Progress updated' });
        } else {
            res.status(404).json({ message: 'Enrollment not found' });
        }
    } catch (error) {
        console.error('Progress update error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Submit a quiz for a slide
// @route   POST /api/courses/:courseId/lesson/:lessonId/slide/:slideId/quiz
// @access  Private
exports.submitQuiz = async (req, res) => {
    const { answers } = req.body;
    const { courseId, lessonId, slideId } = req.params;
    try {
        const course = await Course.findById(courseId);
        const lesson = course.lessons.id(lessonId);
        const slide = lesson.slides.id(slideId);

        if (!slide || !slide.quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        const quiz = slide.quiz;
        let isCorrect = false;

        if (quiz.type === 'single-choice') {
            const correctAnswer = quiz.answers.find(ans => ans.isCorrect);
            if (correctAnswer && correctAnswer._id.toString() === answers) {
                isCorrect = true;
            }
        } else if (quiz.type === 'multiple-choice') {
            const correctAnswers = quiz.answers.filter(ans => ans.isCorrect).map(ans => ans._id.toString());
            isCorrect = correctAnswers.length === answers.length && correctAnswers.every(id => answers.includes(id));
        } else if (quiz.type === 'matching') {
            isCorrect = quiz.matchPrompts.every(prompt => answers[prompt._id.toString()] === prompt.correctMatch);
        }

        const user = await User.findById(req.user.id);
        const enrollment = user.enrolledCourses.find(e => e.course.toString() === courseId);
        if (enrollment) {
            const quizProgress = {
                lessonId: lesson._id,
                slideId: slide._id,
                isCorrect: isCorrect,
            };
            const existingProgressIndex = enrollment.progress.findIndex(p => p.lessonId.toString() === lessonId && p.slideId.toString() === slideId);
            if (existingProgressIndex !== -1) {
                enrollment.progress[existingProgressIndex].isCorrect = isCorrect;
            } else {
                enrollment.progress.push(quizProgress);
            }
            // FIX: Add this line to bypass validation on save.
            await user.save({ validateBeforeSave: false });
        }

        if (isCorrect) {
            res.json({ correct: true, message: 'Correct!' });
        } else {
            res.json({ correct: false, message: 'Incorrect, please try again.' });
        }
    } catch (error) {
        console.error("Quiz submission error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Submit a final exam for a course
// @route   POST /api/courses/:courseId/final-exam
// @access  Private
exports.submitFinalExam = async (req, res) => {
    const { answers } = req.body;
    const { courseId } = req.params;

    try {
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const finalExamLesson = course.lessons.find(l => l.isFinalExam);
        const finalExamSlide = finalExamLesson?.slides[0];

        if (!finalExamSlide?.quiz) return res.status(404).json({ message: 'Final exam not found' });

        const quiz = finalExamSlide.quiz;
        let isCorrect = false;

        if (quiz.type === 'single-choice') {
            const correctAnswer = quiz.answers.find(ans => ans.isCorrect);
            if (correctAnswer && correctAnswer._id.toString() === answers) {
                isCorrect = true;
            }
        } else if (quiz.type === 'multiple-choice') {
            const correctAnswers = quiz.answers.filter(ans => ans.isCorrect).map(ans => ans._id.toString());
            isCorrect = correctAnswers.length === answers.length && correctAnswers.every(id => answers.includes(id));
        } else if (quiz.type === 'matching') {
            isCorrect = quiz.matchPrompts.every(prompt => answers[prompt._id.toString()] === prompt.correctMatch);
        }

        const user = await User.findById(req.user.id);
        const enrollment = user.enrolledCourses.find(e => e.course.toString() === courseId);
        
        if (enrollment && isCorrect) {
            enrollment.isCompleted = true;
            enrollment.progress.push({
                lessonId: finalExamLesson._id,
                slideId: finalExamSlide._id,
                isCorrect: true,
            });
            // FIX: Add this line to bypass validation on save.
            await user.save({ validateBeforeSave: false });
            return res.json({ correct: true, message: 'Final Exam Passed! Your certificate is now available.' });
        } else {
            return res.json({ correct: false, message: 'Incorrect, please try again.' });
        }
    } catch (error) {
        console.error("Final exam submission error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc Save the certificate URL to the user's enrollment
// @route PUT /api/courses/:courseId/save-certificate
// @access Private
exports.saveCertificate = async (req, res) => {
    const { courseId } = req.params;
    const { certificateData } = req.body;
    
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const enrollment = user.enrolledCourses.find(e => e.course.toString() === courseId);
        if (!enrollment) return res.status(404).json({ message: 'User not enrolled in this course' });
        
        enrollment.certificate = certificateData;
        // FIX: Add this line to bypass validation on save.
        await user.save({ validateBeforeSave: false });
        
        res.json({ message: 'Certificate saved successfully.' });
    } catch (error) {
        console.error('Error saving certificate:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
