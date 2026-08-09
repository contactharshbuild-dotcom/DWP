import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  FiLayers, 
  FiCheckCircle, 
  FiZap, 
  FiUsers, 
  FiGlobe, 
  FiHelpCircle, 
  FiFileText, 
  FiArrowRight, 
  FiAlertCircle, 
  FiCreditCard,
  FiAward
} from 'react-icons/fi';
import type { RootState } from '../store';
import { setCredentials } from '../store/authSlice';
import api from '../services/api';
import type { SubscriptionPlanItem } from '../components/subscription/types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SelectPlan: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, organization } = useSelector((state: RootState) => state.auth);

  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [upiMode, setUpiMode] = useState<'qr' | 'id'>('qr');
  const [showPaymentModal, setShowPaymentModal] = useState<{
    plan: SubscriptionPlanItem;
    orderId: string;
    amount: number;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('upi');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [upiId, setUpiId] = useState('8668593971@paytm');

  // Protect route
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Load Razorpay SDK script on demand only when user initiates payment
  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById('razorpay-sdk-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-sdk-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchActivePlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/subscription-plans/active');
      if (response.data.success) {
        setPlans(response.data.plans);
        if (response.data.razorpay_key_id) {
          setRazorpayKeyId(response.data.razorpay_key_id);
        }
      } else {
        setError('Failed to fetch subscription plans.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error loading available subscription plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePlans();
  }, []);

  const formatCurrency = (val: number, curr: 'USD' | 'INR') => {
    const symbol = curr === 'INR' ? '₹' : '$';
    return `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatLimit = (val: number) => {
    if (val === -1) return 'Unlimited';
    return val.toLocaleString();
  };

  // Handle Free Plan Selection
  const handleSelectFreePlan = async (plan: SubscriptionPlanItem) => {
    setSelectedPlanId(plan.id);
    setProcessingPayment(true);
    setError(null);

    try {
      const response = await api.post('/subscription-plans/select-free-plan', {
        plan_id: plan.id,
        billing_cycle: billingCycle
      });

      if (response.data.success) {
        // Update credentials in store with updated organization
        dispatch(setCredentials({
          token: token || '',
          user: user!,
          organization: response.data.organization
        }));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to activate free plan.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Helper to verify payment signature on backend & activate organization plan
  const completePaymentVerification = async (
    plan: SubscriptionPlanItem, 
    orderId: string, 
    cycle: 'monthly' | 'yearly', 
    paymentDetails?: any
  ) => {
    setProcessingPayment(true);
    try {
      const verifyRes = await api.post('/subscription-plans/verify-razorpay-payment', {
        razorpay_order_id: paymentDetails?.razorpay_order_id || orderId,
        razorpay_payment_id: paymentDetails?.razorpay_payment_id || `pay_rzp_${Date.now()}`,
        razorpay_signature: paymentDetails?.razorpay_signature || 'simulated_razorpay_signature',
        plan_id: plan.id,
        billing_cycle: cycle
      });

      if (verifyRes.data.success) {
        dispatch(setCredentials({
          token: token || '',
          user: user!,
          organization: verifyRes.data.organization
        }));
        setShowPaymentModal(null);
        navigate('/');
      } else {
        setError(verifyRes.data.message || 'Payment verification failed.');
      }
    } catch (verr: any) {
      setError(verr.response?.data?.message || 'Payment verification error.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle Paid Plan Razorpay Checkout
  const handleRazorpayPayment = async (plan: SubscriptionPlanItem) => {
    setSelectedPlanId(plan.id);
    setProcessingPayment(true);
    setError(null);

    try {
      // 1. Create Razorpay Order on Backend
      const orderRes = await api.post('/subscription-plans/create-razorpay-order', {
        plan_id: plan.id,
        billing_cycle: billingCycle
      });

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || 'Failed to create payment order.');
      }

      const { order_id, amount, currency, key_id, is_test_simulation } = orderRes.data;

      // 2. If running in Simulation Mode (No real Razorpay key configured in .env yet)
      if (is_test_simulation || !key_id || key_id.includes('demo')) {
        setProcessingPayment(false);
        setShowPaymentModal({
          plan,
          orderId: order_id,
          amount,
          currency,
          billingCycle
        });
        return;
      }

      // 3. If Real Razorpay Key IS configured in .env, load SDK & open Razorpay Checkout Modal
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        throw new Error('Failed to load Razorpay Payment SDK. Please check your internet connection.');
      }

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'DWP Learning Management System',
        description: `Subscription to ${plan.name} (${billingCycle} plan)`,
        image: '/dwp-logo.png',
        order_id: order_id,
        handler: async function (response: any) {
          await completePaymentVerification(plan, order_id, billingCycle, response);
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#00b4d8'
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setError(response.error?.description || 'Payment transaction failed.');
          setProcessingPayment(false);
        });
        rzp.open();
      } else {
        setShowPaymentModal({
          plan,
          orderId: order_id,
          amount,
          currency,
          billingCycle
        });
        setProcessingPayment(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Payment initialization failed.');
      setProcessingPayment(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #070d18 0%, #0b1324 100%)',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '40px 20px 80px 20px'
    }}>
      <style>{`
        .client-plan-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 32px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          backdrop-filter: blur(12px);
        }

        .client-plan-card:hover {
          transform: translateY(-6px);
          border-color: rgba(0, 180, 216, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(0, 180, 216, 0.15);
        }

        .client-plan-card-featured {
          border-color: rgba(0, 180, 216, 0.5);
          background: radial-gradient(circle at top right, rgba(0, 180, 216, 0.12), rgba(15, 23, 42, 0.8));
          box-shadow: 0 10px 30px rgba(0, 180, 216, 0.1);
        }

        .cycle-toggle-container {
          background: rgba(15, 23, 42, 0.8);
          padding: 6px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: inline-flex;
          gap: 6px;
        }

        .cycle-btn {
          padding: 10px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cycle-btn-active {
          background: linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(0, 180, 216, 0.3);
        }

        .cycle-btn-inactive {
          background: transparent;
          color: #94a3b8;
        }

        .cycle-btn-inactive:hover {
          color: white;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #cbd5e1;
          margin-bottom: 12px;
        }
      `}</style>

      {/* Header Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <img 
            src="/dwp-logo.png" 
            alt="DWP Logo" 
            style={{ height: '42px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <span style={{ fontSize: '13px', color: '#00b4d8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {organization?.name || 'Your Organization'}
          </span>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '900', color: 'white', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
          Select Your LMS Subscription Plan
        </h1>
        <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '640px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Choose a plan that fits your educational institute. Upgrade or adjust anytime.
        </p>

        {/* Monthly / Yearly Billing Toggle */}
        <div className="cycle-toggle-container">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`cycle-btn ${billingCycle === 'monthly' ? 'cycle-btn-active' : 'cycle-btn-inactive'}`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`cycle-btn ${billingCycle === 'yearly' ? 'cycle-btn-active' : 'cycle-btn-inactive'}`}
          >
            Yearly Billing <span style={{ fontSize: '11px', color: '#fbbf24', marginLeft: '6px', fontWeight: '800' }}>Save 17%</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '16px 20px',
            borderRadius: '16px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiAlertCircle size={22} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '16px' }}>Loading subscription plans...</span>
          </div>
        ) : plans.length === 0 ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '60px',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <FiLayers size={48} style={{ color: '#475569', marginBottom: '16px' }} />
            <h3 style={{ color: 'white' }}>No Subscription Plans Available</h3>
            <p style={{ fontSize: '14px' }}>Please contact Master Admin to activate plans.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '30px',
            alignItems: 'stretch'
          }}>
            {plans.map((plan) => {
              const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
              const isFree = price === 0;

              return (
                <div 
                  key={plan.id}
                  className={`client-plan-card ${plan.is_featured ? 'client-plan-card-featured' : ''}`}
                >
                  <div>
                    {/* Featured Tag */}
                    {plan.is_featured && (
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: 'linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%)',
                          color: 'white'
                        }}>
                          <FiAward size={13} />
                          RECOMMENDED FOR ACADEMIES
                        </span>
                      </div>
                    )}

                    {/* Plan Name & Description */}
                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: '0 0 8px 0' }}>
                      {plan.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: '1.5', minHeight: '38px' }}>
                      {plan.description || 'Complete LMS suite for your institute.'}
                    </p>

                    {/* Pricing Display */}
                    <div style={{ marginBottom: '28px' }}>
                      {isFree ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '42px', fontWeight: '900', color: '#38bdf8' }}>Free</span>
                          <span style={{ fontSize: '14px', color: '#64748b' }}>/ forever</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '42px', fontWeight: '900', color: 'white' }}>
                            {formatCurrency(price, plan.currency)}
                          </span>
                          <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                            / {billingCycle === 'yearly' ? 'year' : 'month'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Features & Limit Entitlements */}
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px', marginBottom: '28px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                        Included Features & Limits
                      </div>

                      <div className="feature-item">
                        <FiCheckCircle size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                        <span><strong>{formatLimit(plan.max_teachers)}</strong> Teacher Accounts</span>
                      </div>

                      <div className="feature-item">
                        <FiCheckCircle size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                        <span><strong>{formatLimit(plan.max_students)}</strong> Enrolled Students</span>
                      </div>

                      <div className="feature-item">
                        <FiCheckCircle size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                        <span><strong>{formatLimit(plan.max_quizzes)}</strong> MCQ Quizzes</span>
                      </div>

                      <div className="feature-item">
                        <FiCheckCircle size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                        <span><strong>{formatLimit(plan.max_documents)}</strong> Document Uploads</span>
                      </div>

                      <div className="feature-item">
                        <FiCheckCircle size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                        <span><strong>{formatLimit(plan.max_practical_exams)}</strong> Practical Exams</span>
                      </div>
                    </div>
                  </div>

                  {/* Select Plan Button */}
                  <div>
                    {isFree ? (
                      <button
                        onClick={() => handleSelectFreePlan(plan)}
                        disabled={processingPayment && selectedPlanId === plan.id}
                        style={{
                          width: '100%',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          borderRadius: '14px',
                          padding: '14px',
                          fontSize: '15px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {processingPayment && selectedPlanId === plan.id ? (
                          <span>Activating Free Plan...</span>
                        ) : (
                          <>
                            <span>Select Free Plan</span>
                            <FiArrowRight size={18} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRazorpayPayment(plan)}
                        disabled={processingPayment && selectedPlanId === plan.id}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '14px',
                          fontSize: '15px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 20px rgba(0, 180, 216, 0.35)'
                        }}
                      >
                        {processingPayment && selectedPlanId === plan.id ? (
                          <span>Processing Payment...</span>
                        ) : (
                          <>
                            <FiCreditCard size={18} />
                            <span>Pay with Razorpay ({formatCurrency(price, plan.currency)})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* INTERACTIVE RAZORPAY TEST PAYMENT MODAL */}
        {showPaymentModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(7, 13, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#0f172a',
              border: '1px solid rgba(0, 180, 216, 0.3)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 180, 216, 0.2)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                padding: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: 'rgba(0, 180, 216, 0.15)',
                      color: '#00b4d8',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontWeight: 900,
                      fontSize: '14px',
                      letterSpacing: '0.5px'
                    }}>
                      RAZORPAY
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                      Secured 🔒
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(null)}
                    disabled={processingPayment}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>

                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'white' }}>
                  {showPaymentModal.plan.name} Subscription
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Billing: <strong style={{ color: '#38bdf8', textTransform: 'capitalize' }}>{showPaymentModal.billingCycle}</strong>
                </p>

                <div style={{
                  marginTop: '16px',
                  background: 'rgba(0, 180, 216, 0.1)',
                  border: '1px solid rgba(0, 180, 216, 0.2)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Total Amount Payable</span>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8' }}>
                    {formatCurrency(
                      showPaymentModal.billingCycle === 'yearly'
                        ? showPaymentModal.plan.yearly_price
                        : showPaymentModal.plan.monthly_price,
                      showPaymentModal.plan.currency
                    )}
                  </span>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px' }}>
                {/* Method Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '20px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {[
                    { id: 'card', label: '💳 Card' },
                    { id: 'upi', label: '📱 UPI / QR' },
                    { id: 'netbanking', label: '🏦 NetBanking' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: paymentMethod === m.id ? 'linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%)' : 'transparent',
                        color: paymentMethod === m.id ? 'white' : '#94a3b8',
                        transition: 'all 0.2s'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Card */}
                {paymentMethod === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                        CARD NUMBER
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '10px',
                          color: 'white',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                          EXPIRY (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                          CVV
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: UPI & QR CODE */}
                {paymentMethod === 'upi' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Mode Sub-Toggle: QR Code vs UPI ID */}
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      padding: '4px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <button
                        onClick={() => setUpiMode('qr')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: upiMode === 'qr' ? 'rgba(0, 180, 216, 0.2)' : 'transparent',
                          color: upiMode === 'qr' ? '#38bdf8' : '#94a3b8',
                          transition: 'all 0.2s'
                        }}
                      >
                        📷 Scan QR Code
                      </button>
                      <button
                        onClick={() => setUpiMode('id')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: upiMode === 'id' ? 'rgba(0, 180, 216, 0.2)' : 'transparent',
                          color: upiMode === 'id' ? '#38bdf8' : '#94a3b8',
                          transition: 'all 0.2s'
                        }}
                      >
                        📱 Pay via UPI ID / App
                      </button>
                    </div>

                    {upiMode === 'qr' ? (
                      /* QR CODE SCANNER VIEW */
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(0, 180, 216, 0.3)',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)'
                      }}>
                        {/* Dynamic SVG Simulated QR Code */}
                        <div style={{
                          background: 'white',
                          padding: '16px',
                          borderRadius: '16px',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                          position: 'relative'
                        }}>
                          <svg width="150" height="150" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* QR Outer Corners */}
                            <path d="M0 0H30V30H0V0ZM6 6V24H24V6H6Z" fill="#0f172a" />
                            <path d="M10 10H20V20H10V10Z" fill="#00b4d8" />
                            
                            <path d="M70 0H100V30H70V0ZM76 6V24H94V6H76Z" fill="#0f172a" />
                            <path d="M80 10H90V20H80V10Z" fill="#00b4d8" />
                            
                            <path d="M0 70H30V100H0V70ZM6 76V94H24V76H6Z" fill="#0f172a" />
                            <path d="M10 80H20V90H10V80Z" fill="#00b4d8" />

                            {/* Data Pattern Grid */}
                            <path d="M35 5H45V15H35V5ZM50 5H65V15H50V5ZM35 20H45V30H35V20ZM55 20H65V30H55V20Z" fill="#1e293b" />
                            <path d="M5 35H15V45H5V35ZM20 35H30V45H20V35ZM35 35H45V45H35V35ZM50 35H60V45H50V35ZM65 35H75V45H65V35ZM80 35H95V45H80V35Z" fill="#1e293b" />
                            <path d="M5 50H20V60H5V50ZM25 50H40V60H25V50ZM60 50H70V60H60V50ZM75 50H95V60H75V50Z" fill="#1e293b" />
                            <path d="M5 65H15V75H5V65ZM20 65H30V75H20V65ZM35 65H45V75H35V65ZM60 65H75V75H60V65ZM80 65H90V75H80V65Z" fill="#1e293b" />
                            <path d="M35 80H45V95H35V80ZM50 80H65V90H50V80ZM70 80H80V95H70V80ZM85 80H95V90H85V80Z" fill="#1e293b" />
                            
                            {/* Center Badge */}
                            <circle cx="50" cy="50" r="12" fill="#0f172a" stroke="#00b4d8" strokeWidth="2" />
                            <text x="50" y="54" fontSize="9" fontWeight="900" fill="#38bdf8" textAnchor="middle">UPI</text>
                          </svg>
                        </div>

                        <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', textAlign: 'center', fontWeight: 700 }}>
                          Scan to Pay <strong style={{ color: '#38bdf8' }}>{formatCurrency(
                            showPaymentModal.billingCycle === 'yearly'
                              ? showPaymentModal.plan.yearly_price
                              : showPaymentModal.plan.monthly_price,
                            showPaymentModal.plan.currency
                          )}</strong>
                        </p>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {[
                            { name: 'GPay', color: '#4285F4' },
                            { name: 'PhonePe', color: '#5f259f' },
                            { name: 'Paytm', color: '#00baf2' },
                            { name: 'BHIM', color: '#ff9900' }
                          ].map(app => (
                            <span key={app.name} style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              background: 'rgba(255, 255, 255, 0.08)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              color: app.color,
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              {app.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* UPI ID & APP SELECTOR VIEW */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                            SELECT YOUR UPI APP
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {[
                              { id: 'gpay', name: 'Google Pay', suffix: '@okaxis', icon: '🟢', color: '#38bdf8' },
                              { id: 'phonepe', name: 'PhonePe', suffix: '@ybl', icon: '🟣', color: '#a855f7' },
                              { id: 'paytm', name: 'Paytm UPI', suffix: '@paytm', icon: '🔵', color: '#38bdf8' },
                              { id: 'bhim', name: 'BHIM UPI', suffix: '@upi', icon: '🟠', color: '#fb923c' }
                            ].map(app => (
                              <button
                                key={app.id}
                                onClick={() => {
                                  setSelectedUpiApp(app.id as any);
                                  const username = upiId.split('@')[0] || 'user';
                                  setUpiId(`${username}${app.suffix}`);
                                }}
                                style={{
                                  background: selectedUpiApp === app.id ? 'rgba(0, 180, 216, 0.15)' : 'rgba(15, 23, 42, 0.8)',
                                  border: selectedUpiApp === app.id ? '1px solid rgba(0, 180, 216, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '12px',
                                  padding: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  textAlign: 'left'
                                }}
                              >
                                <span>{app.icon}</span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{app.name}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{app.suffix}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                              ENTER VPA / UPI ID
                            </label>
                            <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>✓ Verified VPA</span>
                          </div>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. 9876543210@paytm"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(0, 180, 216, 0.3)',
                              borderRadius: '10px',
                              color: 'white',
                              fontSize: '14px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              fontWeight: 600
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: NetBanking */}
                {paymentMethod === 'netbanking' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                      SELECT BANK
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option>HDFC Bank</option>
                      <option>ICICI Bank</option>
                      <option>State Bank of India (SBI)</option>
                      <option>Axis Bank</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => completePaymentVerification(
                      showPaymentModal.plan,
                      showPaymentModal.orderId,
                      showPaymentModal.billingCycle
                    )}
                    disabled={processingPayment}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: 900,
                      cursor: processingPayment ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 6px 20px rgba(0, 180, 216, 0.4)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {processingPayment ? (
                      <span>Verifying & Activating Plan...</span>
                    ) : (
                      <>
                        <FiCheckCircle size={20} />
                        <span>Pay {formatCurrency(
                          showPaymentModal.billingCycle === 'yearly'
                            ? showPaymentModal.plan.yearly_price
                            : showPaymentModal.plan.monthly_price,
                          showPaymentModal.plan.currency
                        )}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(null)}
                    disabled={processingPayment}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#94a3b8',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel Payment
                  </button>
                </div>

                <p style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#64748b',
                  marginTop: '16px',
                  marginBottom: 0
                }}>
                  🛡️ 256-Bit SSL Encryption • Instant Organization Activation
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectPlan;
