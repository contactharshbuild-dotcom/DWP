import express from 'express';
import multer from 'multer';
import { 
  signup, 
  login, 
  sendLoginOtp, 
  verifyLoginOtp, 
  updateProfile, 
  uploadAvatar 
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB server-side limit for profile avatars
  }
});

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/send-otp', sendLoginOtp);
router.post('/verify-otp', verifyLoginOtp);

// Protected user routes
router.get('/me', authenticate, (req, res) => {
  return res.json({
    message: 'User authentication verified.',
    user: req.user
  });
});

router.put('/profile', authenticate, updateProfile);
router.post('/upload-avatar', authenticate, upload.single('avatar'), uploadAvatar);

export default router;
