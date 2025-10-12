const Course = require('../models/Course');
const User = require('../models/User');
const Author = require('../models/Author'); // Needed for the course converter
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = async (req, res) => {
    try {
        const { title, description, level, specialty, price, imageUrl, isPublic, instructorWelcomeNote, tags } = req.body;
        
        const course = new Course({
            title, description, level, specialty, price, imageUrl, isPublic, instructorWelcomeNote,
            tags: tags || [],
            createdBy: req.user.id, // This is the fix. It uses the User ID directly.
            lessons: [],
        });
        
        const createdCourse = await course.save();
        res.status(201).json(createdCourse);
    } catch (error) {
        console.error("Error creating course:", error);
        res.status(500).json({ message: 'Server Error: Could not create the course.', error: error.message });
    }
};

// @desc    Get courses for the logged-in admin's dashboard
const getAdminCourses = async (req, res) => {
    try {
        const courses = await Course.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching admin courses' });
    }
};

// @desc    Get all active courses for public view
const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ isPublic: true, status: { $ne: 'deleted' } })
            .populate('createdBy', 'name fullName profilePicture');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get course by ID
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
             .populate('createdBy', 'name email');

        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Attach author profile (bio/photo) based on the user who created the course
        const creatorId = (course.createdBy && course.createdBy._id) ? course.createdBy._id : course.createdBy;
        let authorProfile = await Author.findOne({ user: creatorId }).lean();
        const payload = course.toObject();
        payload.authorProfile = authorProfile || null;

        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a course
const updateCourse = async (req, res) => {
    try {
        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedCourse) return res.status(404).json({ message: 'Course not found' });
        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Soft delete a course
const deleteCourse = async (req, res) => {
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

// @desc    Restore a soft-deleted course
const restoreCourse = async (req, res) => {
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

// @desc    Permanently delete a course
const permanentlyDeleteCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        res.json({ message: 'Course permanently deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Enroll user in a course
const enrollInCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const user = await User.findById(req.user.id);

        if (user.enrolledCourses.some(c => c.course.toString() === course._id.toString())) {
            return res.status(400).json({ message: 'Already enrolled' });
        }

        user.enrolledCourses.push({ course: course._id });
        await user.save();
        res.json({ message: 'Enrolled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a Stripe checkout session
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
        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// --- THIS IS THE COURSE CONVERTER ---
const runMigration = async (req, res) => {
    try {
        const oldCourses = await Course.find({ createdBy: { $exists: false } });

        if (oldCourses.length === 0) {
            return res.status(200).send('<h1>Converter Not Needed</h1><p>No old courses were found to convert. Everything is already up to date!</p>');
        }

        let updatedCount = 0;
        let logs = `<h1>Starting Course Conversion...</h1><p>Found ${oldCourses.length} old courses.</p><ul>`;

        for (const course of oldCourses) {
            if (course.creator) {
                const author = await Author.findById(course.creator);
                if (author && author.user) {
                    course.createdBy = author.user;
                    await course.save();
                    logs += `<li>Successfully converted course: "${course.title}"</li>`;
                    updatedCount++;
                } else {
                    logs += `<li style="color: red;">Could not find author/user for course: "${course.title}"</li>`;
                }
            }
        }

        logs += `</ul><h2>Conversion Complete!</h2><p>Successfully updated ${updatedCount} of ${oldCourses.length} courses.</p>`;
        res.status(200).send(logs);

    } catch (error) {
        console.error('An error occurred during conversion:', error);
        res.status(500).send(`<h1>Error During Conversion</h1><p>${error.message}</p>`);
    }
};


module.exports = {
    createCourse,
    getAdminCourses,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    restoreCourse,
    permanentlyDeleteCourse,
    enrollInCourse,
    createCheckoutSession,
    runMigration,
    // Add these back if they are used elsewhere
    updateUserProgress: async (req, res) => res.status(501).json({ message: "Not implemented" }),
    submitQuiz: async (req, res) => res.status(501).json({ message: "Not implemented" }),
    submitFinalExam: async (req, res) => res.status(501).json({ message: "Not implemented" }),
    saveCertificate: async (req, res) => res.status(501).json({ message: "Not implemented" }),
};