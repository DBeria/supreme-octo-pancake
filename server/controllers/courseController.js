const Course = require('../models/Course');
const User = require('../models/User');
const Author = require('../models/Author');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

// AWS S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Helper function to generate a unique file name
const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// Helper function to get signed URLs for course content
const getSignedUrlsForCourse = async (course) => {
    if (course.thumbnail) {
        const getObjectParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: course.thumbnail,
        };
        course.thumbnail = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), { expiresIn: 3600 });
    }

    for (const lesson of course.lessons) {
        for (const slide of lesson.slides) {
            if ((slide.type === 'image' || slide.type === 'video') && slide.content) {
                const getObjectParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: slide.content,
                };
                slide.content = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), { expiresIn: 3600 });
            }
        }
    }
    return course;
};


// @desc    Get presigned URL for file upload
// @route   POST /api/courses/get-presigned-url
// @access  Private/Admin
exports.getPresignedUrl = async (req, res) => {
    const { fileType, fileExt } = req.body;
    const fileName = generateFileName();
    const key = `course-content/${fileName}.${fileExt}`;

    const putObjectParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        ContentType: fileType,
    };

    try {
        const uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand(putObjectParams), { expiresIn: 600 });
        res.status(200).json({ uploadUrl, key });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ message: 'Could not generate upload URL.' });
    }
};

// @desc    Create a course with content keys
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
    try {
        const author = await Author.findOne({ user: req.user.id });
        if (!author) {
            return res.status(400).json({ message: 'Admin user does not have an author profile.' });
        }

        const courseData = { ...req.body, author: author._id };
        const course = new Course(courseData);
        const createdCourse = await course.save();

        res.status(201).json(createdCourse);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a course with content keys
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const author = await Author.findOne({ user: req.user.id });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (course.author.toString() !== author._id.toString()) {
            return res.status(401).json({ message: 'User not authorized to update this course' });
        }

        // Logic to find and delete old S3 assets that are no longer in use
        const oldAssetKeys = new Set();
        if (course.thumbnail) oldAssetKeys.add(course.thumbnail);
        course.lessons.forEach(lesson => {
            lesson.slides.forEach(slide => {
                if ((slide.type === 'image' || slide.type === 'video') && slide.content) {
                    oldAssetKeys.add(slide.content);
                }
            });
        });

        const newAssetKeys = new Set();
        if (req.body.thumbnail) newAssetKeys.add(req.body.thumbnail);
        req.body.lessons.forEach(lesson => {
            lesson.slides.forEach(slide => {
                if ((slide.type === 'image' || slide.type === 'video') && slide.content) {
                    newAssetKeys.add(slide.content);
                }
            });
        });

        const keysToDelete = [...oldAssetKeys].filter(key => !newAssetKeys.has(key));
        for (const key of keysToDelete) {
            const deleteParams = { Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
        }
        
        // Update course fields
        course.title = req.body.title || course.title;
        course.description = req.body.description || course.description;
        course.thumbnail = req.body.thumbnail || course.thumbnail;
        course.price = req.body.price || course.price;
        course.lessons = req.body.lessons || course.lessons;
        course.quiz = req.body.quiz || course.quiz;

        const updatedCourse = await course.save();
        res.json(updatedCourse);

    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Delete a course and its S3 assets
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const author = await Author.findOne({ user: req.user.id });

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (course.author.toString() !== author._id.toString()) {
            return res.status(401).json({ message: 'User not authorized to delete this course' });
        }
        
        // Collect all S3 keys associated with the course
        const keysToDelete = [];
        if (course.thumbnail) {
            keysToDelete.push(course.thumbnail);
        }
        course.lessons.forEach(lesson => {
            lesson.slides.forEach(slide => {
                if ((slide.type === 'image' || slide.type === 'video') && slide.content) {
                    keysToDelete.push(slide.content);
                }
            });
        });

        // Delete all associated S3 objects
        for (const key of keysToDelete) {
            try {
                const deleteParams = { Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key };
                await s3Client.send(new DeleteObjectCommand(deleteParams));
            } catch (s3Error) {
                // Log S3 deletion errors but don't block course deletion
                console.error(`Failed to delete S3 object: ${key}`, s3Error);
            }
        }

        await course.deleteOne();
        res.json({ message: 'Course and associated content removed' });

    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all courses with signed URLs
// @route   GET /api/courses
// @access  Public
exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({}).populate('author', 'fullName').lean();
        const coursesWithSignedUrls = await Promise.all(courses.map(getSignedUrlsForCourse));
        res.json(coursesWithSignedUrls);
    } catch (error) {
        console.error('Error getting all courses:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a single course by ID with signed URLs
// @route   GET /api/courses/:id
// @access  Public or Private (if enrolled)
exports.getCourseById = async (req, res) => {
    try {
        // THIS IS THE ONLY CHANGE IN THIS ENTIRE FILE.
        const course = await Course.findById(req.params.id).populate('author', 'fullName').lean();

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if the user is enrolled
        const user = req.user ? await User.findById(req.user.id) : null;
        const isEnrolled = user && user.enrolledCourses.includes(course._id.toString());
        const isAdmin = user && user.role === 'admin';

        // Only generate signed URLs for content if user is enrolled or is an admin
        if (isEnrolled || isAdmin) {
            const courseWithSignedUrls = await getSignedUrlsForCourse(course);
            res.json(courseWithSignedUrls);
        } else {
            // If not enrolled, only return public data (like thumbnail)
            if (course.thumbnail) {
                const getObjectParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: course.thumbnail,
                };
                course.thumbnail = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), { expiresIn: 3600 });
            }
            // Sanitize lessons content for non-enrolled users
            course.lessons = course.lessons.map(lesson => ({
                _id: lesson._id,
                title: lesson.title,
                // Do not expose slide content
            }));
            res.json(course);
        }
    } catch (error) {
        console.error("Error fetching course by ID:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Create Stripe checkout session
// @route   POST /api/courses/:id/checkout
// @access  Private
exports.createCheckoutSession = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        const user = await User.findById(req.user.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (user.enrolledCourses.includes(course._id)) {
            return res.status(400).json({ message: 'You are already enrolled in this course.' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: course.title,
                        description: course.description,
                    },
                    unit_amount: course.price * 100, // Price in cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${course._id}`,
            cancel_url: `${process.env.CLIENT_URL}/courses/${course._id}`,
            customer_email: user.email,
            metadata: {
                userId: user._id.toString(),
                courseId: course._id.toString(),
            }
        });

        res.json({ redirectUrl: session.url });
    } catch (error) {
        console.error('Stripe session error:', error);
        res.status(500).json({ message: 'Server Error: Could not create checkout session.' });
    }
};

// @desc    Enroll user in a course after successful payment
// @route   POST /api/courses/:id/enroll-after-payment
// @access  Private
exports.enrollAfterPayment = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const courseId = req.params.id;
        const userId = req.user.id;

        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required.' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const user = await User.findById(userId);
            
            if (user.enrolledCourses.includes(courseId)) {
                return res.status(200).json({ message: 'User already enrolled.' });
            }

            user.enrolledCourses.push(courseId);
            await user.save();

            // Also add user to the course's enrolledUsers list
            await Course.updateOne({ _id: courseId }, { $addToSet: { enrolledUsers: userId } });
            
            res.status(200).json({ message: 'Enrollment successful' });
        } else {
            res.status(400).json({ message: 'Payment not successful' });
        }
    } catch (error) {
        console.error('Enrollment Error:', error);
        res.status(500).json({ message: 'Server Error during enrollment process.' });
    }
};