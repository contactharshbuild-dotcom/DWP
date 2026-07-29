import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { 
  uploadResource, 
  getClassroomResources, 
  deleteResource,
  addLinkResource,
  createFolder,
  deleteFolder,
  assignResource
} from '../controllers/resource.controller.js';

const router = express.Router();

// Configure multer in-memory storage (upload file buffers directly to storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB server-side limit
  }
});

// Guard all resource endpoints with authentication
router.use(authenticate);

// Upload resource
router.post('/upload', upload.single('file'), uploadResource);

// Add link/YouTube resource
router.post('/link', addLinkResource);

// Get all resources for a classroom
router.get('/classroom/:classroomId', getClassroomResources);

// Delete a resource
router.delete('/:resourceId', deleteResource);

// Assign resource
router.put('/:resourceId/assign', assignResource);

// Folders endpoints
router.post('/folders', createFolder);
router.delete('/folders/:folderId', deleteFolder);

export default router;
