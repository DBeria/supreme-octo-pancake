const Course = require('../models/Course');

/**
 * Middleware to check if the logged-in admin is the owner of the course.
 * This prevents one admin from editing or deleting another admin's courses.
 */
const isCourseOwner = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // --- KEY CHANGE ---
        // This logic now checks the `createdBy` field to ensure ownership.
        // It compares the ID in the course document with the ID of the logged-in user.
        if (!course.createdBy || course.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'User not authorized to modify this course' });
        }

        // If the IDs match, allow the request to proceed to the controller.
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during ownership check' });
    }
};

module.exports = { isCourseOwner };