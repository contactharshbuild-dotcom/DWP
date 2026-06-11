import express from 'express';
import { signup, login, sendLoginOtp, verifyLoginOtp } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/send-otp', sendLoginOtp);
router.post('/verify-otp', verifyLoginOtp);

// Protected route to test auth middleware
router.get('/me', authenticate, (req, res) => {
  return res.json({
    message: 'User authentication verified.',
    user: req.user
  });
});

export default router;
