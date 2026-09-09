import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getMaterialBank,
  createFolder,
  renameFolder,
  deleteFolder,
  uploadMaterialFile,
  addYoutubeLink,
  renameItem,
  deleteItem,
  reorderItems,
  reorderFolders
} from '../controllers/material-bank.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

// Guard all endpoints with authentication
router.use(authenticate);

// Get folders & items
router.get('/', getMaterialBank);

// Create folder
router.post('/folders', createFolder);

// Rename folder
router.put('/folders/:folderId', renameFolder);

// Delete folder
router.delete('/folders/:folderId', deleteFolder);

// Reorder folders
router.put('/folders/reorder', reorderFolders);

// Upload file
router.post('/upload', upload.single('file'), uploadMaterialFile);

// Add YouTube link
router.post('/link', addYoutubeLink);

// Reorder items (files & links)
router.put('/items/reorder', reorderItems);

// Rename item
router.put('/items/:itemId', renameItem);

// Delete item
router.delete('/items/:itemId', deleteItem);

export default router;
