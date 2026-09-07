import express from 'express';
import { inviteTeacher, getTeachers, approveTeacher, deleteTeacher } from '../controllers/teacher.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Guard all routes in this router for authenticated users
router.use(authenticate);

// Read action: Admin and Teacher can access the teachers list
router.get('/', authorizeRoles('admin', 'teacher'), getTeachers);

// Admin-only management actions
router.post('/', authorizeRoles('admin'), inviteTeacher);
router.post('/:id/approve', authorizeRoles('admin'), approveTeacher);
router.put('/:id/approve', authorizeRoles('admin'), approveTeacher);
router.delete('/:id', authorizeRoles('admin'), deleteTeacher);
router.post('/:id/reject', authorizeRoles('admin'), deleteTeacher);

export default router;
