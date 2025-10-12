const Author = require('../models/Author');
const Course = require('../models/Course');

// @desc    Get or create a profile for the logged-in user
// @route   GET /api/authors/my-profile
// @access  Private/Admin
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

// @desc    Update the logged-in user's author profile
// @route   PUT /api/authors/my-profile
// @access  Private/Admin
exports.updateMyProfile = async (req, res) => {
    try {
        const author = await Author.findOneAndUpdate(
            { user: req.user.id },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!author) {
            return res.status(404).json({ message: 'Author profile not found for this user.' });
        }
        res.json(author);
    } catch (error) {
        console.error("Error updating author profile:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Get a single author by their ID
// @route   GET /api/authors/:id
// @access  Public
exports.getAuthorById = async (req, res) => {
    try {
        const author = await Author.findById(req.params.id).populate('user', 'name');
        if (!author) {
            return res.status(404).json({ message: 'Author not found' });
        }
        res.json(author);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get all authors
// @route   GET /api/authors
// @access  Public
exports.getAllAuthors = async (req, res) => {
    try {
        const authors = await Author.find({}).populate('user', 'name email');
        res.json(authors);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Upload/update my profile photo
// @route   PUT /api/authors/my-profile/photo
// @access  Private/Admin
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    let author = await Author.findOne({ user: req.user.id });
    if (!author) {
      author = new Author({ user: req.user.id, fullName: req.user.name });
    }
    // Store as URL path to static uploads
    author.profilePicture = `/uploads/${req.file.filename}`;
    await author.save();
    res.json(author);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload/update my CV
// @route   PUT /api/authors/my-profile/cv
// @access  Private/Admin
exports.uploadCV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    let author = await Author.findOne({ user: req.user.id });
    if (!author) {
      author = new Author({ user: req.user.id, fullName: req.user.name });
    }
    author.cvUrl = `/uploads/${req.file.filename}`;
    await author.save();
    res.json(author);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};
