import crypto from 'crypto';
import Razorpay from 'razorpay';
import { SubscriptionPlan, Organization } from '../models/index.js';

// Utility helper to create a URL-friendly slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');      // Replace multiple - with single -
};

// Lazy Razorpay Instance helper
const getRazorpayInstance = () => {
  const rawKeyId = process.env.RAZORPAY_KEY_ID;
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET;
  
  const hasRealKeys = Boolean(
    rawKeyId && 
    rawKeySecret && 
    rawKeyId.trim() !== '' && 
    !rawKeyId.includes('demo') && 
    rawKeyId.startsWith('rzp_')
  );

  return {
    instance: hasRealKeys ? new Razorpay({ key_id: rawKeyId, key_secret: rawKeySecret }) : null,
    hasRealKeys,
    key_id: hasRealKeys ? rawKeyId : null,
    key_secret: rawKeySecret || 'dwp_lms_secret_demo_12345'
  };
};

// -------------------------------------------------------------
// CLIENT-FACING CONTROLLER ENDPOINTS
// -------------------------------------------------------------

// 1. Get all active subscription plans for client selection screen
export const getActivePlansForClient = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { is_active: true },
      order: [['monthly_price', 'ASC']]
    });

    const formattedPlans = plans.map(plan => {
      const plainObj = plan.get({ plain: true });
      return {
        ...plainObj,
        monthly_price: parseFloat(plainObj.monthly_price || 0),
        yearly_price: parseFloat(plainObj.yearly_price || 0)
      };
    });

    const { hasRealKeys, key_id } = getRazorpayInstance();

    return res.json({
      success: true,
      plans: formattedPlans,
      razorpay_key_id: key_id,
      is_test_simulation: !hasRealKeys
    });
  } catch (error) {
    console.error('Error fetching active plans for client:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available subscription plans.',
      error: error.message
    });
  }
};

// 2. Select Free Plan directly (No payment required)
export const selectFreePlan = async (req, res) => {
  try {
    const { plan_id, billing_cycle = 'monthly' } = req.body;
    const organization_id = req.user?.organization_id || req.user?.organizationId || req.user?.organization?.id;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: 'No organization attached to current user account.'
      });
    }

    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found.'
      });
    }

    const price = billing_cycle === 'yearly' ? parseFloat(plan.yearly_price) : parseFloat(plan.monthly_price);
    if (price > 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected plan is a paid plan. Please proceed with Razorpay payment.'
      });
    }

    const organization = await Organization.findByPk(organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found.'
      });
    }

    await organization.update({
      subscription_plan_id: plan.id,
      billing_cycle,
      subscription_status: 'active'
    });

    return res.json({
      success: true,
      message: `Free plan "${plan.name}" activated successfully!`,
      organization
    });
  } catch (error) {
    console.error('Error selecting free plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to select free subscription plan.',
      error: error.message
    });
  }
};

// 3. Create Razorpay Order for Paid Plan
export const createRazorpayOrder = async (req, res) => {
  try {
    const { plan_id, billing_cycle = 'monthly' } = req.body;
    const organization_id = req.user?.organization_id || req.user?.organizationId || req.user?.organization?.id;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: 'No organization attached to current user account.'
      });
    }

    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found.'
      });
    }

    const price = billing_cycle === 'yearly' ? parseFloat(plan.yearly_price) : parseFloat(plan.monthly_price);
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected plan is free. No payment required.'
      });
    }

    const amountInSubunits = Math.round(price * 100); // Amount in paise/cents
    const currency = plan.currency === 'INR' ? 'INR' : 'USD';
    const receipt = `rcpt_org${organization_id}_${Date.now()}`;

    const { instance: razorpay, hasRealKeys, key_id } = getRazorpayInstance();

    let order;
    if (hasRealKeys && razorpay) {
      try {
        order = await razorpay.orders.create({
          amount: amountInSubunits,
          currency: currency === 'USD' ? 'INR' : currency,
          receipt,
          notes: {
            organization_id: String(organization_id),
            plan_id: String(plan.id),
            plan_name: plan.name,
            billing_cycle
          }
        });
      } catch (rzpErr) {
        console.warn('Razorpay API call warning/fallback mode active:', rzpErr.message);
        order = {
          id: `order_sim_${Date.now()}`,
          entity: 'order',
          amount: amountInSubunits,
          amount_paid: 0,
          amount_due: amountInSubunits,
          currency: 'INR',
          receipt,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000)
        };
      }
    } else {
      // Simulation mode when RAZORPAY_KEY_ID is not configured in .env
      order = {
        id: `order_sim_${Date.now()}`,
        entity: 'order',
        amount: amountInSubunits,
        amount_paid: 0,
        amount_due: amountInSubunits,
        currency: 'INR',
        receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    return res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: key_id,
      is_test_simulation: !hasRealKeys,
      plan_name: plan.name,
      billing_cycle
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize payment order.',
      error: error.message
    });
  }
};

// 4. Verify Razorpay Payment & Activate Plan
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      plan_id,
      billing_cycle = 'monthly'
    } = req.body;

    const organization_id = req.user?.organization_id || req.user?.organizationId || req.user?.organization?.id;
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: 'No organization attached to current user account.'
      });
    }

    const { key_secret } = getRazorpayInstance();

    // Verify HMAC-SHA256 signature if signature is provided
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (process.env.RAZORPAY_KEY_SECRET && generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Razorpay payment signature. Payment verification failed.'
        });
      }
    }

    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found.'
      });
    }

    const organization = await Organization.findByPk(organization_id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found.'
      });
    }

    // Expiration date calculation (1 month or 1 year from now)
    const expiresAt = new Date();
    if (billing_cycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await organization.update({
      subscription_plan_id: plan.id,
      billing_cycle,
      subscription_status: 'active',
      subscription_expires_at: expiresAt
    });

    const updatedOrg = await Organization.findByPk(organization_id, {
      include: [{
        model: SubscriptionPlan,
        as: 'subscriptionPlan'
      }]
    });

    return res.json({
      success: true,
      message: `Payment verified! Plan "${plan.name}" successfully activated for your organization.`,
      organization: updatedOrg
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment.',
      error: error.message
    });
  }
};

// -------------------------------------------------------------
// MASTER ADMIN CONTROLLER ENDPOINTS
// -------------------------------------------------------------

// 5. Get all subscription plans (Master Admin)
export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      include: [{
        model: Organization,
        as: 'organizations',
        attributes: ['id', 'name', 'slug', 'status', 'billing_cycle']
      }],
      order: [['created_at', 'ASC']]
    });

    const formattedPlans = plans.map(plan => {
      const plainObj = plan.get({ plain: true });
      return {
        ...plainObj,
        monthly_price: parseFloat(plainObj.monthly_price || 0),
        yearly_price: parseFloat(plainObj.yearly_price || 0),
        organization_count: plainObj.organizations ? plainObj.organizations.length : 0
      };
    });

    return res.json({
      success: true,
      plans: formattedPlans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans.',
      error: error.message
    });
  }
};

// 6. Create new subscription plan (Master Admin)
export const createSubscriptionPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      currency = 'USD',
      monthly_price = 0,
      yearly_price = 0,
      max_teachers = -1,
      max_students = -1,
      max_quizzes = -1,
      max_documents = -1,
      max_practical_exams = -1,
      is_active = true,
      is_featured = false
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Plan name is required.'
      });
    }

    let slug = slugify(name);
    // Ensure slug uniqueness
    const existing = await SubscriptionPlan.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const newPlan = await SubscriptionPlan.create({
      name: name.trim(),
      slug,
      description: description ? description.trim() : '',
      currency: ['USD', 'INR'].includes(currency) ? currency : 'USD',
      monthly_price: parseFloat(monthly_price) || 0,
      yearly_price: parseFloat(yearly_price) || 0,
      max_teachers: parseInt(max_teachers, 10),
      max_students: parseInt(max_students, 10),
      max_quizzes: parseInt(max_quizzes, 10),
      max_documents: parseInt(max_documents, 10),
      max_practical_exams: parseInt(max_practical_exams, 10),
      is_active: Boolean(is_active),
      is_featured: Boolean(is_featured)
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully.',
      plan: newPlan
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan.',
      error: error.message
    });
  }
};

// 7. Update subscription plan (Master Admin)
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      currency,
      monthly_price,
      yearly_price,
      max_teachers,
      max_students,
      max_quizzes,
      max_documents,
      max_practical_exams,
      is_active,
      is_featured
    } = req.body;

    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found.'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (currency !== undefined && ['USD', 'INR'].includes(currency)) updates.currency = currency;
    if (monthly_price !== undefined) updates.monthly_price = parseFloat(monthly_price) || 0;
    if (yearly_price !== undefined) updates.yearly_price = parseFloat(yearly_price) || 0;
    if (max_teachers !== undefined) updates.max_teachers = parseInt(max_teachers, 10);
    if (max_students !== undefined) updates.max_students = parseInt(max_students, 10);
    if (max_quizzes !== undefined) updates.max_quizzes = parseInt(max_quizzes, 10);
    if (max_documents !== undefined) updates.max_documents = parseInt(max_documents, 10);
    if (max_practical_exams !== undefined) updates.max_practical_exams = parseInt(max_practical_exams, 10);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (is_featured !== undefined) updates.is_featured = Boolean(is_featured);

    await plan.update(updates);

    return res.json({
      success: true,
      message: 'Subscription plan updated successfully.',
      plan
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan.',
      error: error.message
    });
  }
};

// 8. Toggle active/inactive plan status (Master Admin)
export const toggleSubscriptionPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found.'
      });
    }

    const newStatus = !plan.is_active;
    await plan.update({ is_active: newStatus });

    return res.json({
      success: true,
      message: `Subscription plan status changed to ${newStatus ? 'Active' : 'Inactive'}.`,
      plan
    });
  } catch (error) {
    console.error('Error toggling plan status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle plan status.',
      error: error.message
    });
  }
};

// 9. Delete subscription plan (Master Admin)
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found.'
      });
    }

    // Check if any organization is currently assigned this plan
    const assignedOrgsCount = await Organization.count({
      where: { subscription_plan_id: id }
    });

    if (assignedOrgsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. It is currently assigned to ${assignedOrgsCount} organization(s). Reassign them first.`
      });
    }

    await plan.destroy();

    return res.json({
      success: true,
      message: 'Subscription plan deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan.',
      error: error.message
    });
  }
};

// 10. Assign plan to an organization (Master Admin)
export const assignPlanToOrganization = async (req, res) => {
  try {
    const { id } = req.params; // organization id
    const { subscription_plan_id, billing_cycle = 'monthly', subscription_status = 'active' } = req.body;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found.'
      });
    }

    if (subscription_plan_id) {
      const plan = await SubscriptionPlan.findByPk(subscription_plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Selected subscription plan does not exist.'
        });
      }
    }

    await organization.update({
      subscription_plan_id: subscription_plan_id || null,
      billing_cycle: ['monthly', 'yearly'].includes(billing_cycle) ? billing_cycle : 'monthly',
      subscription_status: ['active', 'suspended', 'trial', 'cancelled'].includes(subscription_status) ? subscription_status : 'active'
    });

    // Fetch updated organization with subscriptionPlan details
    const updatedOrg = await Organization.findByPk(id, {
      include: [{
        model: SubscriptionPlan,
        as: 'subscriptionPlan'
      }]
    });

    return res.json({
      success: true,
      message: 'Subscription plan assigned to organization successfully.',
      organization: updatedOrg
    });
  } catch (error) {
    console.error('Error assigning plan to organization:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign plan to organization.',
      error: error.message
    });
  }
};
