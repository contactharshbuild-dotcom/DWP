import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { 
  uploadResource, 
  getClassroomResources, 
  deleteResource 
} from '../controllers/resource.controller.js';

const router = express.Router();

// Configure multer in-memory storage (we upload file buffers directly to Google Drive or local file system)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file limit
  }
});

// Guard all resource endpoints with authentication
router.use(authenticate);

// Upload resource
router.post('/upload', upload.single('file'), uploadResource);

// Get all resources for a classroom
router.get('/classroom/:classroomId', getClassroomResources);

// Delete a resource
router.delete('/:resourceId', deleteResource);

export default router;
