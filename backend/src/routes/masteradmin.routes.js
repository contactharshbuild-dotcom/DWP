import express from 'express';
import { 
  getOrganizations, 
  toggleOrganizationStatus, 
  updateOrganization 
} from '../controllers/masteradmin.controller.js';
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  deleteSubscriptionPlan,
  assignPlanToOrganization
} from '../controllers/subscription-plan.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth protection to all routes in this router
router.use(authenticate);
router.use(authorizeRoles('masteradmin'));

// Masteradmin organization routes
router.get('/organizations', getOrganizations);
router.put('/organizations/:id/status', toggleOrganizationStatus);
router.put('/organizations/:id', updateOrganization);
router.put('/organizations/:id/assign-plan', assignPlanToOrganization);

// Masteradmin subscription plan routes
router.get('/subscription-plans', getSubscriptionPlans);
router.post('/subscription-plans', createSubscriptionPlan);
router.put('/subscription-plans/:id', updateSubscriptionPlan);
router.patch('/subscription-plans/:id/status', toggleSubscriptionPlanStatus);
router.delete('/subscription-plans/:id', deleteSubscriptionPlan);

export default router;
