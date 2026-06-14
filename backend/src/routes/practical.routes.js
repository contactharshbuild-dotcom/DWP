import express from 'express';
import multer from 'multer';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import { 
  createPracticalExam, 
  getClassroomPracticalExams, 
  submitPracticalExam, 
  getPracticalSubmissions, 
  gradePracticalSubmission 
} from '../controllers/practical.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit per file
  }
});

router.use(authenticate);

// Practical creation & grading (Teachers/Admins)
router.post('/', authorizeRoles('admin', 'teacher'), createPracticalExam);
router.get('/:practicalId/submissions', authorizeRoles('admin', 'teacher'), getPracticalSubmissions);
router.post('/submissions/:submissionId/grade', authorizeRoles('admin', 'teacher'), gradePracticalSubmission);

// Classroom retrieval (All roles)
router.get('/classroom/:classroomId', getClassroomPracticalExams);

// Student Submission (supports multiple files simultaneously)
router.post('/:practicalId/submit', authorizeRoles('student'), upload.array('files', 10), submitPracticalExam);

export default router;
