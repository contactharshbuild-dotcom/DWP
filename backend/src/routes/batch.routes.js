import express from 'express';
import { getBatches, createBatch, updateBatch, deleteBatch, getPublicBatches, getBatchStudents } from '../controllers/batch.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route for classroom join / registration
router.get('/public', getPublicBatches);

// Guard all batch routes for authenticated users
router.use(authenticate);

// List batches - accessible by admin, teacher, and student (for dropdowns)
router.get('/', authorizeRoles('admin', 'teacher', 'student'), getBatches);

// Get students for a specific batch - accessible by admin and teacher
router.get('/:id/students', authorizeRoles('admin', 'teacher'), getBatchStudents);

// Create, Update, Delete - accessible by admin and teacher
router.post('/', authorizeRoles('admin', 'teacher'), createBatch);
router.put('/:id', authorizeRoles('admin', 'teacher'), updateBatch);
router.delete('/:id', authorizeRoles('admin', 'teacher'), deleteBatch);

export default router;
