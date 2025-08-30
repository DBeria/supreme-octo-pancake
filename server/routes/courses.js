const express = require('express');
const router = express.Router();
const {
    createCourse,
    getAllCourses,
    getAdminAllCourses,
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
    createCheckoutSession
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.route('/admin-courses').get(protect, admin, getAdminAllCourses);
router.route('/').get(getAllCourses).post(protect, admin, createCourse);

router.route('/:id').get(getCourseById).put(protect, admin, updateCourse).delete(protect, admin, deleteCourse);

router.route('/:id/restore').put(protect, admin, restoreCourse);
router.route('/:id/permanent-delete').delete(protect, admin, permanentlyDeleteCourse);

router.route('/:id/enroll').post(protect, enrollInCourse);
router.route('/:id/create-checkout-session').post(protect, createCheckoutSession);
router.route('/:courseId/progress').put(protect, updateUserProgress);

router.route('/:courseId/lesson/:lessonId/slide/:slideId/quiz').post(protect, submitQuiz);

router.route('/:courseId/lesson/:lessonId/final-exam').post(protect, submitFinalExam);

router.route('/:courseId/save-certificate').put(protect, saveCertificate);

module.exports = router;
