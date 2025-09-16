const Author = require('../models/Author');
const Course = require('../models/Course');

// @desc    Get or create a profile for the logged-in user
// @route   GET /api/authors/my-profile
// @access  Private
exports.getOrCreateMyProfile = async (req, res) => {
    try {
        let author = await Author.findOne({ user: req.user.id });
        if (!author) {
            author = new Author({
                user: req.user.id,
                fullName: req.user.name,
            });
            await author.save();
        }
        res.json(author);
    } catch (error) {
        console.error("Error in getOrCreateMyProfile:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all courses for the logged-in author
// @route   GET /api/authors/my-courses
// @access  Private/Admin
exports.getMyCourses = async (req, res) => {
    try {
        // Find the author profile linked to the logged-in user
        const author = await Author.findOne({ user: req.user.id });
        if (!author) {
            // If for some reason the admin has no author profile, return empty array
            return res.json([]);
        }
        // Fetch courses where the author field specifically matches the found author's ID
        const courses = await Course.find({ author: author._id }).populate('author', 'fullName');
        res.json(courses);
    } catch (error) {
        console.error("Error fetching author's courses:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all authors
// @route   GET /api/authors
// @access  Public (or Private/Admin depending on your needs)
exports.getAllAuthors = async (req, res) => {
    try {
        const authors = await Author.find({}).populate('user', 'name email');
        res.json(authors);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};