import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { 
  createMcqTest, 
  cloneMcqTest, 
  getClassroomMcqTests, 
  getMcqTestDetails, 
  startMcqAttempt, 
  logProctorEvent, 
  submitMcqAttempt, 
  getMcqAttemptDetails, 
  getMcqTestAnalytics, 
  getQuestionBank, 
  addQuestionToBank 
} from '../controllers/mcq.controller.js';

const router = express.Router();

router.use(authenticate);

// MCQ Test configurations (Teachers/Admins)
router.post('/tests', authorizeRoles('admin', 'teacher'), createMcqTest);
router.post('/tests/:testId/clone', authorizeRoles('admin', 'teacher'), cloneMcqTest);
router.get('/tests/:testId/analytics', authorizeRoles('admin', 'teacher'), getMcqTestAnalytics);

// Question Bank CRUD (Teachers/Admins)
router.get('/bank', authorizeRoles('admin', 'teacher'), getQuestionBank);
router.post('/bank', authorizeRoles('admin', 'teacher'), addQuestionToBank);

// Classroom retrieval (All roles: admin, teacher, student)
router.get('/classroom/:classroomId', getClassroomMcqTests);
router.get('/tests/:testId', getMcqTestDetails);

// Exam attempt & proctor tracking (Student)
router.post('/attempts/start', authorizeRoles('student'), startMcqAttempt);
router.post('/attempts/:attemptId/log-event', authorizeRoles('student'), logProctorEvent);
router.post('/attempts/:attemptId/submit', authorizeRoles('student'), submitMcqAttempt);

// Attempt feedback / details (All roles)
router.get('/attempts/:attemptId', getMcqAttemptDetails);

export default router;
