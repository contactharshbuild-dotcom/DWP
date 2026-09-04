import express from 'express';
import { inviteTeacher, getTeachers, approveTeacher, deleteTeacher } from '../controllers/teacher.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Guard all routes in this router for authenticated admin owners
router.use(authenticate);
router.use(authorizeRoles('admin'));

router.post('/', inviteTeacher);
router.get('/', getTeachers);
router.post('/:id/approve', approveTeacher);
router.put('/:id/approve', approveTeacher);
router.delete('/:id', deleteTeacher);
router.post('/:id/reject', deleteTeacher);

export default router;
