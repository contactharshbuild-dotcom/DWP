import express from 'express';
import {
  getActivePlansForClient,
  selectFreePlan,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  deleteSubscriptionPlan,
  assignPlanToOrganization
} from '../controllers/subscription-plan.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// -------------------------------------------------------------
// PUBLIC & CLIENT-AUTHENTICATED ROUTES
// -------------------------------------------------------------

/**
 * @route   GET /api/subscription-plans/active
 * @desc    Get list of active subscription plans for client selection
 * @access  Public / Client
 */
router.get('/active', getActivePlansForClient);

/**
 * @route   POST /api/subscription-plans/select-free-plan
 * @desc    Select free plan directly (no payment required)
 * @access  Client Admin (Authenticated)
 */
router.post('/select-free-plan', authenticate, selectFreePlan);

/**
 * @route   POST /api/subscription-plans/create-razorpay-order
 * @desc    Create Razorpay Order for paid subscription plan
 * @access  Client Admin (Authenticated)
 */
router.post('/create-razorpay-order', authenticate, createRazorpayOrder);

/**
 * @route   POST /api/subscription-plans/verify-razorpay-payment
 * @desc    Verify Razorpay payment signature & activate plan for organization
 * @access  Client Admin (Authenticated)
 */
router.post('/verify-razorpay-payment', authenticate, verifyRazorpayPayment);


// -------------------------------------------------------------
// MASTER ADMIN ONLY ROUTES
// -------------------------------------------------------------

/**
 * @route   GET /api/subscription-plans
 * @desc    Get list of all subscription plans with attached org counts
 * @access  MasterAdmin
 */
router.get('/', authenticate, authorizeRoles('masteradmin'), getSubscriptionPlans);

/**
 * @route   POST /api/subscription-plans
 * @desc    Create a new subscription plan (pricing, currency, resource limits)
 * @access  MasterAdmin
 */
router.post('/', authenticate, authorizeRoles('masteradmin'), createSubscriptionPlan);

/**
 * @route   PUT /api/subscription-plans/:id
 * @desc    Update existing subscription plan parameters
 * @access  MasterAdmin
 */
router.put('/:id', authenticate, authorizeRoles('masteradmin'), updateSubscriptionPlan);

/**
 * @route   PATCH /api/subscription-plans/:id/status
 * @desc    Quick toggle active / inactive status for plan
 * @access  MasterAdmin
 */
router.patch('/:id/status', authenticate, authorizeRoles('masteradmin'), toggleSubscriptionPlanStatus);

/**
 * @route   DELETE /api/subscription-plans/:id
 * @desc    Delete subscription plan
 * @access  MasterAdmin
 */
router.delete('/:id', authenticate, authorizeRoles('masteradmin'), deleteSubscriptionPlan);

/**
 * @route   PUT /api/subscription-plans/organizations/:id/assign
 * @desc    Assign subscription plan to organization with billing cycle
 * @access  MasterAdmin
 */
router.put('/organizations/:id/assign', authenticate, authorizeRoles('masteradmin'), assignPlanToOrganization);

export default router;
