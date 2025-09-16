const express = require('express');
const router = express.Router();

const {
    createCourse, getAllCourses, getAdminCourses, getCourseById, updateCourse,
    deleteCourse, permanentlyDeleteCourse, restoreCourse, enrollInCourse,
    updateUserProgress, submitQuiz, submitFinalExam, saveCertificate, createCheckoutSession
} = require('../controllers/courseController');

// Import middleware
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { isCourseOwner } = require('../middleware/courseMiddleware');

// Route to get ONLY the courses for the logged-in admin dashboard
router.route('/admin-courses').get(protect, admin, getAdminCourses);

// Routes for all courses and creating a new course
router.route('/').get(getAllCourses).post(protect, admin, createCourse);

// Routes for a single course, with ownership protection on sensitive actions
router.route('/:id')
    .get(getCourseById)
    .put(protect, admin, isCourseOwner, updateCourse)       // Only owner can update
    .delete(protect, admin, isCourseOwner, deleteCourse);   // Only owner can delete

router.route('/:id/restore').put(protect, admin, isCourseOwner, restoreCourse);
router.route('/:id/permanent-delete').delete(protect, admin, isCourseOwner, permanentlyDeleteCourse);

// Routes for user actions
router.route('/:id/enroll').post(protect, enrollInCourse);
router.route('/:id/create-checkout-session').post(protect, createCheckoutSession);
router.route('/:courseId/progress').put(protect, updateUserProgress);
router.route('/:courseId/lesson/:lessonId/slide/:slideId/quiz').post(protect, submitQuiz);
router.route('/:courseId/lesson/:lessonId/final-exam').post(protect, submitFinalExam);
router.route('/:courseId/save-certificate').put(protect, saveCertificate);

module.exports = router;