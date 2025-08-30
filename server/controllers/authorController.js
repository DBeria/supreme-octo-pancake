const Author = require('../models/Author');

// Get or Create Author Profile for the logged-in user
exports.getOrCreateMyProfile = async (req, res) => {
    try {
        let author = await Author.findOne({ user: req.user.id });
        if (!author) {
            author = await Author.create({
                user: req.user.id,
                fullName: req.user.name
            });
        }
        res.json(author);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get a public author profile by ID
exports.getAuthorById = async (req, res) => {
    try {
        const author = await Author.findById(req.params.id).populate('user', 'email');
        if(!author) return res.status(404).json({ message: 'Author not found' });
        res.json(author);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Update My Profile (including CV and Profile Picture)
exports.updateMyProfile = async (req, res) => {
    const { fullName, profilePicture, cv, bio } = req.body;
    try {
        const author = await Author.findOne({ user: req.user.id });
        if (!author) {
            return res.status(404).json({ message: 'Author profile not found.' });
        }
        if (fullName) author.fullName = fullName;
        
        // Use hasOwnProperty to check if the key was included in the request
        // This allows us to update a field to a null/empty value
        if (req.body.hasOwnProperty('bio')) author.bio = bio;
        
        if (req.body.hasOwnProperty('profilePicture')) {
            // If profilePicture is null/falsy, revert to default. Otherwise, update.
            author.profilePicture = profilePicture || 'https://via.placeholder.com/150';
        }
        
        if (req.body.hasOwnProperty('cv')) {
             // If cv is null/falsy, set to undefined to remove it. Otherwise, update.
            author.cv = cv || undefined;
        }

        const updatedAuthor = await author.save();
        res.json(updatedAuthor);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};