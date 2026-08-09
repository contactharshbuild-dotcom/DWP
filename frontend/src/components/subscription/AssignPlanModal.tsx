import React, { useState, useEffect } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import type { OrganizationItem, SubscriptionPlanItem } from './types';
import api from '../../services/api';

interface AssignPlanModalProps {
  isOpen: boolean;
  org: OrganizationItem | null;
  plans: SubscriptionPlanItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignPlanModal: React.FC<AssignPlanModalProps> = ({
  isOpen,
  org,
  plans,
  onClose,
  onSuccess
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedSubStatus, setSelectedSubStatus] = useState<string>('active');
  const [assigningSaving, setAssigningSaving] = useState(false);
  const [assigningError, setAssigningError] = useState<string | null>(null);

  useEffect(() => {
    if (org) {
      setSelectedPlanId(org.subscription_plan_id || (plans.length > 0 ? plans[0].id : ''));
      setSelectedBillingCycle(org.billing_cycle || 'monthly');
      setSelectedSubStatus(org.subscription_status || 'active');
      setAssigningError(null);
    }
  }, [org, plans, isOpen]);

  if (!isOpen || !org) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigningSaving(true);
    setAssigningError(null);

    try {
      const response = await api.put(`/masteradmin/organizations/${org.id}/assign-plan`, {
        subscription_plan_id: selectedPlanId ? Number(selectedPlanId) : null,
        billing_cycle: selectedBillingCycle,
        subscription_status: selectedSubStatus
      });

      if (response.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setAssigningError(err.response?.data?.message || 'Failed to assign plan.');
    } finally {
      setAssigningSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '480px',
        width: '100%',
        color: 'white',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Assign Plan to Organization</h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <FiX size={20} />
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
          Target Organization: <strong style={{ color: 'white' }}>{org.name}</strong>
        </div>

        {assigningError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FiAlertCircle size={16} />
            <span>{assigningError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
              Select Subscription Plan
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
            >
              <option value="">-- Choose a Plan --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.currency === 'INR' ? '₹' : '$'}{p.monthly_price}/mo - {p.currency === 'INR' ? '₹' : '$'}{p.yearly_price}/yr)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
              Billing Cycle
            </label>
            <select
              value={selectedBillingCycle}
              onChange={(e) => setSelectedBillingCycle(e.target.value as 'monthly' | 'yearly')}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="monthly">Monthly Billing</option>
              <option value="yearly">Yearly Billing</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
              Subscription Status
            </label>
            <select
              value={selectedSubStatus}
              onChange={(e) => setSelectedSubStatus(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="active">Active</option>
              <option value="trial">Trialing</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '10px 18px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigningSaving}
              style={{
                background: '#00b4d8',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {assigningSaving ? 'Assigning...' : 'Confirm Plan Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
