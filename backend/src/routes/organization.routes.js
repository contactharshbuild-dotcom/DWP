import express from 'express';
import multer from 'multer';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getMyOrganization,
  updateMyOrganization,
  uploadOrgLogo
} from '../controllers/organization.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB server-side limit for logos
  }
});

router.use(authenticate);

router.get('/my-organization', getMyOrganization);
router.put('/my-organization', authorizeRoles('admin'), updateMyOrganization);
router.post('/upload-logo', authorizeRoles('admin'), upload.single('logo'), uploadOrgLogo);

export default router;
