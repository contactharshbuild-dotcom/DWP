import express from 'express';
import {
  createModule,
  getModules,
  deleteModule,
  createSessions,
  updateSessionStatus,
  deleteSession,
  updateSession,
  bulkAssign
} from '../controllers/session.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// Read-only access for classrooms
router.get('/classrooms/:classroomId', getModules);

// Write operations (further checked in controller to filter out co-teachers)
router.post('/modules', authorizeRoles('admin', 'teacher'), createModule);
router.delete('/modules/:id', authorizeRoles('admin', 'teacher'), deleteModule);
router.post('/', authorizeRoles('admin', 'teacher'), createSessions);
router.put('/:id/status', authorizeRoles('admin', 'teacher'), updateSessionStatus);
router.put('/:id', authorizeRoles('admin', 'teacher'), updateSession);
router.post('/bulk-assign', authorizeRoles('admin', 'teacher'), bulkAssign);
router.delete('/:id', authorizeRoles('admin', 'teacher'), deleteSession);

export default router;
