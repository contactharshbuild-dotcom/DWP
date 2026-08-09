import React, { useState } from 'react';
import { 
  FiLayers, 
  FiCheckCircle, 
  FiDollarSign, 
  FiSearch, 
  FiPlus, 
  FiActivity, 
  FiAward, 
  FiUsers, 
  FiGlobe, 
  FiHelpCircle, 
  FiFileText, 
  FiZap, 
  FiToggleLeft, 
  FiToggleRight, 
  FiEdit2, 
  FiTrash2,
  FiAlertTriangle 
} from 'react-icons/fi';
import type { SubscriptionPlanItem } from './types';
import api from '../../services/api';

interface SubscriptionPlanMakerProps {
  plans: SubscriptionPlanItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (plan: SubscriptionPlanItem) => void;
}

export const SubscriptionPlanMaker: React.FC<SubscriptionPlanMakerProps> = ({
  plans,
  loading,
  error,
  onRefresh,
  onOpenCreateModal,
  onOpenEditModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingPlanId, setTogglingPlanId] = useState<number | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null);

  const handleTogglePlanStatus = async (planId: number) => {
    setTogglingPlanId(planId);
    try {
      const response = await api.patch(`/masteradmin/subscription-plans/${planId}/status`);
      if (response.data.success) {
        onRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle plan status.');
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlanItem) => {
    if (!window.confirm(`Are you sure you want to DELETE the plan "${plan.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingPlanId(plan.id);
    try {
      const response = await api.delete(`/masteradmin/subscription-plans/${plan.id}`);
      if (response.data.success) {
        onRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subscription plan.');
    } finally {
      setDeletingPlanId(null);
    }
  };

  const formatCurrency = (val: number, curr: 'USD' | 'INR') => {
    const symbol = curr === 'INR' ? '₹' : '$';
    return `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatLimit = (val: number) => {
    if (val === -1) return 'Unlimited';
    return val.toLocaleString();
  };

  const activePlansCount = plans.filter(p => p.is_active).length;

  const filteredPlans = plans.filter(plan => {
    const q = searchQuery.toLowerCase();
    return (
      plan.name.toLowerCase().includes(q) ||
      plan.slug.toLowerCase().includes(q) ||
      (plan.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FiAlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiLayers size={26} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
              Total Subscription Plans
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
              {loading ? '...' : plans.length}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiCheckCircle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
              Active Plans
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
              {loading ? '...' : activePlansCount}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiDollarSign size={26} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
              Currencies Supported
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
              USD ($) & INR (₹)
            </div>
          </div>
        </div>
      </div>

      {/* Header Controls */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'white' }}>
            Subscription Plan Maker
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Create and manage plans with custom monthly & yearly pricing, USD/INR currencies, and feature resource limits.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <FiSearch style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b'
            }} size={18} />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="master-search-input"
              style={{
                width: '100%',
                background: 'rgba(7, 13, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px 14px 10px 42px',
                color: 'white',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={onOpenCreateModal}
            style={{
              background: 'linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(0, 180, 216, 0.3)'
            }}
          >
            <FiPlus size={18} />
            <span>Create Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Cards Grid */}
      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
          <FiActivity size={36} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '12px', color: '#00b4d8' }} />
          <div>Loading subscription plans...</div>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px border-dashed rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '60px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <FiLayers size={48} style={{ color: '#475569', marginBottom: '16px' }} />
          <h3 style={{ color: 'white', margin: '0 0 8px 0' }}>No Subscription Plans Found</h3>
          <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px auto' }}>
            Create your first plan to start offering subscriptions to educational organizations.
          </p>
          <button
            onClick={onOpenCreateModal}
            style={{
              background: '#00b4d8',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {filteredPlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`plan-card ${plan.is_featured ? 'plan-card-featured' : ''}`}
            >
              <div>
                {/* Top Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background: plan.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: plan.is_active ? '#34d399' : '#94a3b8',
                    border: plan.is_active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: plan.is_active ? '#10b981' : '#94a3b8'
                    }}></span>
                    <span>{plan.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                  </span>

                  {plan.is_featured && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '800',
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.4)'
                    }}>
                      <FiAward size={13} />
                      FEATURED
                    </span>
                  )}
                </div>

                {/* Plan Title & Description */}
                <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800', color: 'white' }}>
                  {plan.name}
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', minHeight: '40px' }}>
                  {plan.description || 'No description specified.'}
                </p>

                {/* Pricing Box */}
                <div style={{
                  background: 'rgba(7, 13, 24, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                      Monthly
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8' }}>
                      {formatCurrency(plan.monthly_price, plan.currency)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}> /mo</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '2px' }}>
                      Yearly
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }}>
                      {formatCurrency(plan.yearly_price, plan.currency)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}> /yr</span>
                  </div>
                </div>

                {/* Resource Limits List */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Resource & Limit Entitlements
                  </div>

                  {/* Limit 1: Teachers */}
                  <div className="limit-row">
                    <div className="limit-label">
                      <FiUsers size={14} style={{ color: '#818cf8' }} />
                      <span>Teacher Accounts</span>
                    </div>
                    <div className="limit-value">
                      {plan.max_teachers === -1 ? (
                        <span className="unlimited-badge">Unlimited</span>
                      ) : (
                        formatLimit(plan.max_teachers)
                      )}
                    </div>
                  </div>

                  {/* Limit 2: Students */}
                  <div className="limit-row">
                    <div className="limit-label">
                      <FiGlobe size={14} style={{ color: '#34d399' }} />
                      <span>Student Support</span>
                    </div>
                    <div className="limit-value">
                      {plan.max_students === -1 ? (
                        <span className="unlimited-badge">Unlimited</span>
                      ) : (
                        formatLimit(plan.max_students)
                      )}
                    </div>
                  </div>

                  {/* Limit 3: Quizzes */}
                  <div className="limit-row">
                    <div className="limit-label">
                      <FiHelpCircle size={14} style={{ color: '#fbbf24' }} />
                      <span>MCQ Quizzes</span>
                    </div>
                    <div className="limit-value">
                      {plan.max_quizzes === -1 ? (
                        <span className="unlimited-badge">Unlimited</span>
                      ) : (
                        formatLimit(plan.max_quizzes)
                      )}
                    </div>
                  </div>

                  {/* Limit 4: Documents */}
                  <div className="limit-row">
                    <div className="limit-label">
                      <FiFileText size={14} style={{ color: '#38bdf8' }} />
                      <span>Documents & Uploads</span>
                    </div>
                    <div className="limit-value">
                      {plan.max_documents === -1 ? (
                        <span className="unlimited-badge">Unlimited</span>
                      ) : (
                        formatLimit(plan.max_documents)
                      )}
                    </div>
                  </div>

                  {/* Limit 5: Practical Exams */}
                  <div className="limit-row">
                    <div className="limit-label">
                      <FiZap size={14} style={{ color: '#f472b6' }} />
                      <span>Practical Exams</span>
                    </div>
                    <div className="limit-value">
                      {plan.max_practical_exams === -1 ? (
                        <span className="unlimited-badge">Unlimited</span>
                      ) : (
                        formatLimit(plan.max_practical_exams)
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <button
                  onClick={() => handleTogglePlanStatus(plan.id)}
                  disabled={togglingPlanId === plan.id}
                  style={{
                    background: plan.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: plan.is_active ? '#ef4444' : '#10b981',
                    border: plan.is_active ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {plan.is_active ? <FiToggleLeft size={16} /> : <FiToggleRight size={16} />}
                  <span>{togglingPlanId === plan.id ? 'Updating...' : plan.is_active ? 'Deactivate' : 'Activate'}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onOpenEditModal(plan)}
                    style={{
                      background: 'rgba(79, 70, 229, 0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(79, 70, 229, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FiEdit2 size={14} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeletePlan(plan)}
                    disabled={deletingPlanId === plan.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Delete Plan"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
