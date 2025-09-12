const express = require('express');
const router = express.Router();
const {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    restoreCourse,
    permanentlyDeleteCourse,
    enrollInCourse,
    createCheckoutSession,
    updateUserProgress,
    submitQuiz,
    submitFinalExam,
    saveCertificate,
    getAdminAllCourses
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// Admin-specific routes
router.route('/admin-courses').get(protect, admin, getAdminAllCourses);

// General course routes
router.route('/').get(getAllCourses).post(protect, admin, createCourse);

// Routes for a specific course by ID
router.route('/:id')
    .get(getCourseById)
    .put(protect, admin, updateCourse)
    .delete(protect, admin, deleteCourse); // This is for soft delete

// Admin routes for restoring or permanently deleting a course
router.route('/:id/restore').put(protect, admin, restoreCourse);
router.route('/:id/permanent-delete').delete(protect, admin, permanentlyDeleteCourse);

// User-specific course actions
router.route('/:id/enroll').post(protect, enrollInCourse);
router.route('/:id/create-checkout-session').post(protect, createCheckoutSession);

// User progress and quiz submission
router.route('/:courseId/progress').put(protect, updateUserProgress);
router.route('/:courseId/lesson/:lessonId/slide/:slideId/quiz').post(protect, submitQuiz);
router.route('/:courseId/lesson/:lessonId/final-exam').post(protect, submitFinalExam);

// Certificate saving
router.route('/:courseId/save-certificate').put(protect, saveCertificate);

module.exports = router;