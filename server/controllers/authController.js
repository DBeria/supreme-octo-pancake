const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Pick the correct client URL (origin of the request if allowed; else fallbacks)
function resolveClientUrl(req) {
  const candidate = req.headers.origin || req.headers.referer || '';
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (candidate && allowed.includes(candidate)) return candidate;

  // Fallback order: PROD → LOCAL → single CLIENT_URL → localhost
  return process.env.CLIENT_URL_PROD
      || process.env.CLIENT_URL_LOCAL
      || process.env.CLIENT_URL
      || 'http://localhost:5173';
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, idNumber, mobileNumber } = req.body;

  const userData = { name, email, password, idNumber };
  if (mobileNumber) userData.mobileNumber = mobileNumber;

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
    console.error('--- REGISTRATION FAILED ---');
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
    if (!user) return res.status(404).json({ message: 'User not found' });
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
    if (!user) return res.status(404).json({ message: 'User not found' });

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
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Build client base from request origin (local or prod)
    const baseClient = resolveClientUrl(req);
    const resetUrl = `${baseClient.replace(/\/+$/, '')}/reset-password/${resetToken}`;

    const subject = 'Password Reset';
    const text = `You requested a password reset. Open this link to set a new password: ${resetUrl}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Reset your password</h2>
        <p>You (or someone else) requested a password reset for your account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">
            Set a new password
          </a>
        </p>
        <p style="margin-top:12px">If the button doesn’t work, copy and paste this link:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color:#64748b;margin-top:12px">This link expires in 15 minutes.</p>
      </div>
    `;

    // Use explicit "to" and provide both html/text
    await sendEmail({ to: user.email, subject, text, html });

    res.status(200).json({ message: 'Email sent' });
  } catch (err) {
    console.error('[forgotPassword] error:', err?.message || err);
    res.status(500).json({ message: 'Email could not be sent' });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
