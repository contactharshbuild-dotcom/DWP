import express from 'express';
import { inviteTeacher, getTeachers } from '../controllers/teacher.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Guard all routes in this router for authenticated admin owners
router.use(authenticate);
router.use(authorizeRoles('admin'));

router.post('/', inviteTeacher);
router.get('/', getTeachers);

export default router;
