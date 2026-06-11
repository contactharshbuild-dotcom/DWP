import express from 'express';
import { signup, login } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected route to test auth middleware
router.get('/me', authenticate, (req, res) => {
  return res.json({
    message: 'User authentication verified.',
    user: req.user
  });
});

export default router;
