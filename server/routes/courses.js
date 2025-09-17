const express = require('express');
const router = express.Router();

const {
    createCourse,
    getAllCourses,
    getAdminCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    permanentlyDeleteCourse,
    restoreCourse,
    enrollInCourse,
    updateUserProgress,
    submitQuiz,
    submitFinalExam,
    saveCertificate,
    createCheckoutSession,
    runMigration // Make sure runMigration is imported
} = require('../controllers/courseController');

// Import middleware
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { isCourseOwner } = require('../middleware/courseMiddleware');

// Route for the admin dashboard
router.route('/admin-courses').get(protect, admin, getAdminCourses);

// --- THE SECRET LINK FOR THE CONVERTER ---
router.route('/convert-old-courses').get(protect, admin, runMigration);

// General public routes
router.route('/').get(getAllCourses).post(protect, admin, createCourse);

// Routes for a single course
router.route('/:id').get(getCourseById).put(protect, admin, isCourseOwner, updateCourse).delete(protect, admin, isCourseOwner, deleteCourse);
router.route('/:id/restore').put(protect, admin, isCourseOwner, restoreCourse);
router.route('/:id/permanent-delete').delete(protect, admin, isCourseOwner, permanentlyDeleteCourse);
router.route('/:id/enroll').post(protect, enrollInCourse);
router.route('/:id/create-checkout-session').post(protect, createCheckoutSession);

// Routes for user progress
router.route('/:courseId/progress').put(protect, updateUserProgress);
router.route('/:courseId/lesson/:lessonId/slide/:slideId/quiz').post(protect, submitQuiz);
router.route('/:courseId/lesson/:lessonId/final-exam').post(protect, submitFinalExam);
router.route('/:courseId/save-certificate').put(protect, saveCertificate);


module.exports = router;