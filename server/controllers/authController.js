const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const { name, email, password, idNumber, mobileNumber } = req.body;
    
    const userData = { name, email, password, idNumber };
    if (mobileNumber) {
        userData.mobileNumber = mobileNumber;
    }

    try {
        const userExists = await User.findOne({ $or: [{ email }, { idNumber }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email or ID number already exists' });
        }
        
        const user = await User.create(userData);

        if (user) {
            res.status(201).json({ message: 'User registered successfully' });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error("--- REGISTRATION FAILED ---");
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'enrolledCourses.course',
            populate: { path: 'lessons' }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user details
// @route   PUT /api/auth/update-details
// @access  Private
exports.updateDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.body.email && req.body.email !== user.email) {
            const emailExists = await User.findOne({ email: req.body.email });
            if (emailExists && emailExists._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'Email is already in use' });
            }
            user.email = req.body.email;
        }

        if (req.body.idNumber && req.body.idNumber !== user.idNumber) {
            const idNumberExists = await User.findOne({ idNumber: req.body.idNumber });
            if (idNumberExists && idNumberExists._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'ID Number is already in use' });
            }
            user.idNumber = req.body.idNumber;
        }

        user.name = req.body.name || user.name;

        if (req.body.mobileNumber === '') {
            user.mobileNumber = undefined;
        } else if (req.body.mobileNumber) {
            user.mobileNumber = req.body.mobileNumber;
        }
        
        const updatedUser = await user.save();
        
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            idNumber: updatedUser.idNumber,
            mobileNumber: updatedUser.mobileNumber,
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Update user password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');
        if (user && (await user.matchPassword(req.body.currentPassword))) {
            user.password = req.body.newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Please try again later' });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal whether the email exists
      return res
        .status(200)
        .json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Create reset token and save hash + expiry on the user
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Where the frontend lives – set this env var correctly
    const clientUrl = process.env.CLIENT_URL || process.env.CLIENT_URL_PROD || 'http://localhost:5173';
    const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    const message =
      'You are receiving this email because you (or someone else) have requested the reset of a password.\n\n' +
      'Please click on the following link, or paste it into your browser, to complete the process:\n\n' +
      `${resetUrl}\n\n` +
      'If you did not request this, please ignore this email and your password will remain unchanged.';

    // Fire-and-forget email sending so we don't block the response
    sendEmail({
      email: user.email,
      subject: 'Password Reset',
      message,
    }).catch((err) => {
      console.error('Error sending password reset email:', err && err.message ? err.message : err);
    });

    return res.status(200).json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  const { resettoken } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'New password is required' });
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(resettoken)
    .digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
