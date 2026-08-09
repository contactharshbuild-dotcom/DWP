import express from 'express';
import {
  createModule,
  getModules,
  deleteModule,
  createSessions,
  updateSessionStatus,
  deleteSession,
  updateSession,
  bulkAssign,
  getSessionAttendance,
  saveSessionAttendance,
  getClassroomAttendanceSummary,
  getModuleSessionsPaginated
} from '../controllers/session.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// Read-only access for classrooms
router.get('/classrooms/:classroomId', getModules);
router.get('/modules/:moduleId/sessions', getModuleSessionsPaginated);
router.get('/classrooms/:classroomId/attendance-summary', getClassroomAttendanceSummary);

// Session Attendance endpoints
router.get('/:sessionId/attendance', getSessionAttendance);
router.post('/:sessionId/attendance', authorizeRoles('admin', 'teacher'), saveSessionAttendance);

// Write operations (further checked in controller to filter out co-teachers)
router.post('/modules', authorizeRoles('admin', 'teacher'), createModule);
router.delete('/modules/:id', authorizeRoles('admin', 'teacher'), deleteModule);
router.post('/', authorizeRoles('admin', 'teacher'), createSessions);
router.put('/:id/status', authorizeRoles('admin', 'teacher'), updateSessionStatus);
router.put('/:id', authorizeRoles('admin', 'teacher'), updateSession);
router.post('/bulk-assign', authorizeRoles('admin', 'teacher'), bulkAssign);
router.delete('/:id', authorizeRoles('admin', 'teacher'), deleteSession);

export default router;
