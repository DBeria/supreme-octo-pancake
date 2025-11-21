const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword,
    updateDetails,
    updatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.put('/update-details', protect, updateDetails);
router.put('/update-password', protect, updatePassword);

// Test email route for debugging SMTP
router.get('/test-email', async (req, res) => {
    try {
        const to = req.query.to || process.env.TEST_EMAIL_TO || '';
        const target = to || (process.env.EMAIL_USER || process.env.SMTP_USER);

        if (!target) {
            return res.status(400).json({
                ok: false,
                message: 'No target email specified. Pass ?to=your@email.com or set TEST_EMAIL_TO.'
            });
        }

        await sendEmail({
            email: target,
            subject: 'POCUS World test email',
            message: 'If you see this, SMTP is working 🎉',
        });

        return res.json({ ok: true, message: `Test email sent to ${target}` });
    } catch (err) {
        console.error('TEST EMAIL ERROR:', err);
        return res.status(500).json({
            ok: false,
            message: err && err.message ? err.message : 'Unknown error',
            code: err && err.code ? err.code : null,
        });
    }
});

module.exports = router;
