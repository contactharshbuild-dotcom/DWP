import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getQuizzes,
  getQuizDetails,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  assignQuiz,
  getClassroomQuizzes,
  manualStart,
  manualEnd,
  releaseScores
} from './quiz-builder.controller.js';

const router = express.Router();

// Require authentication for all routes
router.use(authenticate);

// List all quizzes for the authenticated user's organization
router.get('/', authorizeRoles('admin', 'teacher'), getQuizzes);

// Clone quiz template
router.post('/:id/clone', authorizeRoles('admin', 'teacher'), cloneQuiz);

// Classroom specific assignment routes
router.post('/assign', authorizeRoles('admin', 'teacher'), assignQuiz);
router.get('/classroom/:classroomId', getClassroomQuizzes);
router.post('/:id/manual-start', authorizeRoles('admin', 'teacher'), manualStart);
router.post('/:id/manual-end', authorizeRoles('admin', 'teacher'), manualEnd);
router.post('/:id/release-scores', authorizeRoles('admin', 'teacher'), releaseScores);

// Get specific quiz details
router.get('/:id', authorizeRoles('admin', 'teacher'), getQuizDetails);

// Create a new quiz
router.post('/', authorizeRoles('admin', 'teacher'), createQuiz);

// Update a quiz
router.put('/:id', authorizeRoles('admin', 'teacher'), updateQuiz);

// Delete a quiz
router.delete('/:id', authorizeRoles('admin', 'teacher'), deleteQuiz);

export default router;
