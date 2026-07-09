import express from 'express';
import { 
  createClassroom, 
  getClassrooms, 
  getClassroomById, 
  joinClassroom,
  signupStep1Phone,
  signupStep2VerifyOtp,
  signupStep3Password,
  signupStep4Profile,
  getClassroomJoinStatus,
  approveTeacher, 
  rejectTeacher,
  upgradeTeacherRole,
  inviteStudent,
  removeStudent,
  approveStudent,
  rejectStudent
} from '../controllers/classroom.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public endpoints (no token required)
router.post('/join/signup-step1', signupStep1Phone);
router.post('/join/signup-step2', signupStep2VerifyOtp);
router.post('/join/signup-step3', signupStep3Password);
router.post('/join/signup-step4', signupStep4Profile);

// Guard all other classroom routes for authenticated users
router.use(authenticate);

// Read actions: Admin, Teacher, and Student can access
router.get('/', authorizeRoles('admin', 'teacher', 'student'), getClassrooms);
router.get('/:id', authorizeRoles('admin', 'teacher', 'student'), getClassroomById);

// Join request and status checks
router.post('/join', authorizeRoles('teacher', 'student'), joinClassroom);
router.get('/status/:numericId', authorizeRoles('teacher', 'student'), getClassroomJoinStatus);

// Admin write actions
router.post('/', authorizeRoles('admin'), createClassroom);
router.post('/:id/teachers/:teacherId/approve', authorizeRoles('admin'), approveTeacher);
router.post('/:id/teachers/:teacherId/upgrade', authorizeRoles('admin'), upgradeTeacherRole);
router.delete('/:id/teachers/:teacherId/reject', authorizeRoles('admin'), rejectTeacher);

// Admin/Teacher student invitation, enrollment and approval management
router.post('/:id/students/invite', authorizeRoles('admin', 'teacher'), inviteStudent);
router.delete('/:id/students/:studentId', authorizeRoles('admin', 'teacher'), removeStudent);
router.post('/:id/students/:studentId/approve', authorizeRoles('admin', 'teacher'), approveStudent);
router.delete('/:id/students/:studentId/reject', authorizeRoles('admin', 'teacher'), rejectStudent);

export default router;
