import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getMaterialBank,
  createFolder,
  deleteFolder,
  uploadMaterialFile,
  addYoutubeLink,
  deleteItem
} from '../controllers/material-bank.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Guard all endpoints with authentication
router.use(authenticate);

// Get folders & items
router.get('/', getMaterialBank);

// Create folder
router.post('/folders', createFolder);

// Delete folder
router.delete('/folders/:folderId', deleteFolder);

// Upload file
router.post('/upload', upload.single('file'), uploadMaterialFile);

// Add YouTube link
router.post('/link', addYoutubeLink);

// Delete item
router.delete('/items/:itemId', deleteItem);

export default router;
