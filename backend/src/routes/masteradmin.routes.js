import express from 'express';
import { 
  getOrganizations, 
  toggleOrganizationStatus, 
  updateOrganization 
} from '../controllers/masteradmin.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth protection to all routes in this router
router.use(authenticate);
router.use(authorizeRoles('masteradmin'));

// Masteradmin routes
router.get('/organizations', getOrganizations);
router.put('/organizations/:id/status', toggleOrganizationStatus);
router.put('/organizations/:id', updateOrganization);

export default router;
