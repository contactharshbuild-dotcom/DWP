import React, { useState, useEffect } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import type { SubscriptionPlanItem } from './types';
import api from '../../services/api';

interface SubscriptionPlanModalProps {
  isOpen: boolean;
  editingPlan: SubscriptionPlanItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubscriptionPlanModal: React.FC<SubscriptionPlanModalProps> = ({
  isOpen,
  editingPlan,
  onClose,
  onSuccess
}) => {
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCurrency, setFormCurrency] = useState<'USD' | 'INR'>('USD');
  const [formMonthlyPrice, setFormMonthlyPrice] = useState<string>('0');
  const [formYearlyPrice, setFormYearlyPrice] = useState<string>('0');

  // Limits form fields (number or -1 for unlimited)
  const [formTeachers, setFormTeachers] = useState<string>('10');
  const [unlimitedTeachers, setUnlimitedTeachers] = useState(false);

  const [formStudents, setFormStudents] = useState<string>('200');
  const [unlimitedStudents, setUnlimitedStudents] = useState(false);

  const [formQuizzes, setFormQuizzes] = useState<string>('50');
  const [unlimitedQuizzes, setUnlimitedQuizzes] = useState(false);

  const [formDocuments, setFormDocuments] = useState<string>('100');
  const [unlimitedDocuments, setUnlimitedDocuments] = useState(false);

  const [formPracticals, setFormPracticals] = useState<string>('20');
  const [unlimitedPracticals, setUnlimitedPracticals] = useState(false);

  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  const [planSaving, setPlanSaving] = useState(false);
  const [planFormError, setPlanFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingPlan) {
      setFormName(editingPlan.name);
      setFormDescription(editingPlan.description || '');
      setFormCurrency(editingPlan.currency || 'USD');
      setFormMonthlyPrice(String(editingPlan.monthly_price));
      setFormYearlyPrice(String(editingPlan.yearly_price));

      setUnlimitedTeachers(editingPlan.max_teachers === -1);
      setFormTeachers(editingPlan.max_teachers === -1 ? '10' : String(editingPlan.max_teachers));

      setUnlimitedStudents(editingPlan.max_students === -1);
      setFormStudents(editingPlan.max_students === -1 ? '200' : String(editingPlan.max_students));

      setUnlimitedQuizzes(editingPlan.max_quizzes === -1);
      setFormQuizzes(editingPlan.max_quizzes === -1 ? '50' : String(editingPlan.max_quizzes));

      setUnlimitedDocuments(editingPlan.max_documents === -1);
      setFormDocuments(editingPlan.max_documents === -1 ? '100' : String(editingPlan.max_documents));

      setUnlimitedPracticals(editingPlan.max_practical_exams === -1);
      setFormPracticals(editingPlan.max_practical_exams === -1 ? '20' : String(editingPlan.max_practical_exams));

      setFormIsActive(editingPlan.is_active);
      setFormIsFeatured(editingPlan.is_featured);
    } else {
      setFormName('');
      setFormDescription('');
      setFormCurrency('USD');
      setFormMonthlyPrice('29');
      setFormYearlyPrice('290');
      setFormTeachers('10');
      setUnlimitedTeachers(false);
      setFormStudents('200');
      setUnlimitedStudents(false);
      setFormQuizzes('50');
      setUnlimitedQuizzes(false);
      setFormDocuments('100');
      setUnlimitedDocuments(false);
      setFormPracticals('20');
      setUnlimitedPracticals(false);
      setFormIsActive(true);
      setFormIsFeatured(false);
    }
    setPlanFormError(null);
  }, [editingPlan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSaving(true);
    setPlanFormError(null);

    const payload = {
      name: formName,
      description: formDescription,
      currency: formCurrency,
      monthly_price: parseFloat(formMonthlyPrice) || 0,
      yearly_price: parseFloat(formYearlyPrice) || 0,
      max_teachers: unlimitedTeachers ? -1 : (parseInt(formTeachers, 10) || 0),
      max_students: unlimitedStudents ? -1 : (parseInt(formStudents, 10) || 0),
      max_quizzes: unlimitedQuizzes ? -1 : (parseInt(formQuizzes, 10) || 0),
      max_documents: unlimitedDocuments ? -1 : (parseInt(formDocuments, 10) || 0),
      max_practical_exams: unlimitedPracticals ? -1 : (parseInt(formPracticals, 10) || 0),
      is_active: formIsActive,
      is_featured: formIsFeatured
    };

    try {
      if (editingPlan) {
        const res = await api.put(`/masteradmin/subscription-plans/${editingPlan.id}`, payload);
        if (res.data.success) {
          onSuccess();
          onClose();
        }
      } else {
        const res = await api.post('/masteradmin/subscription-plans', payload);
        if (res.data.success) {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setPlanFormError(err.response?.data?.message || 'Failed to save subscription plan.');
    } finally {
      setPlanSaving(false);
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
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '680px',
        width: '100%',
        color: 'white',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: 'white' }}>
              {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
            </h3>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Configure plan pricing, currency, and feature allocation limits.
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <FiX size={22} />
          </button>
        </div>

        {planFormError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FiAlertCircle size={16} />
            <span>{planFormError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Plan Name & Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                Plan Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Starter, Pro Educator, Enterprise"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'white',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                Currency *
              </label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value as 'USD' | 'INR')}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'white',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
              Description
            </label>
            <textarea
              placeholder="Brief summary of who this plan is for..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '10px 14px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Pricing Row: Monthly & Yearly */}
          <div style={{
            background: 'rgba(7, 13, 24, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', marginBottom: '12px' }}>
              Pricing Structure ({formCurrency === 'INR' ? 'Rupee ₹' : 'Dollar $'})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#94a3b8' }}>
                  Monthly Amount ({formCurrency === 'INR' ? '₹' : '$'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMonthlyPrice}
                  onChange={(e) => setFormMonthlyPrice(e.target.value)}
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
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#94a3b8' }}>
                  Yearly Amount ({formCurrency === 'INR' ? '₹' : '$'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formYearlyPrice}
                  onChange={(e) => setFormYearlyPrice(e.target.value)}
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
                />
              </div>
            </div>
          </div>

          {/* Resource Entitlement Limits */}
          <div style={{
            background: 'rgba(7, 13, 24, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginBottom: '12px' }}>
              Resource & Feature Allocation Limits
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Limit 1: Teachers */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                    Teacher Support Limit
                  </label>
                  <label style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={unlimitedTeachers}
                      onChange={(e) => setUnlimitedTeachers(e.target.checked)}
                    />
                    Unlimited
                  </label>
                </div>
                {!unlimitedTeachers && (
                  <input
                    type="number"
                    min="0"
                    value={formTeachers}
                    onChange={(e) => setFormTeachers(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* Limit 2: Students */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                    Student Support Limit
                  </label>
                  <label style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={unlimitedStudents}
                      onChange={(e) => setUnlimitedStudents(e.target.checked)}
                    />
                    Unlimited
                  </label>
                </div>
                {!unlimitedStudents && (
                  <input
                    type="number"
                    min="0"
                    value={formStudents}
                    onChange={(e) => setFormStudents(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* Limit 3: Quizzes */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                    Quiz Creation Limit
                  </label>
                  <label style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={unlimitedQuizzes}
                      onChange={(e) => setUnlimitedQuizzes(e.target.checked)}
                    />
                    Unlimited
                  </label>
                </div>
                {!unlimitedQuizzes && (
                  <input
                    type="number"
                    min="0"
                    value={formQuizzes}
                    onChange={(e) => setFormQuizzes(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* Limit 4: Documents */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                    Document & File Upload Limit
                  </label>
                  <label style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={unlimitedDocuments}
                      onChange={(e) => setUnlimitedDocuments(e.target.checked)}
                    />
                    Unlimited
                  </label>
                </div>
                {!unlimitedDocuments && (
                  <input
                    type="number"
                    min="0"
                    value={formDocuments}
                    onChange={(e) => setFormDocuments(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* Limit 5: Practical Exams */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                    Practical Exam Creation Limit
                  </label>
                  <label style={{ fontSize: '11px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="checkbox"
                      checked={unlimitedPracticals}
                      onChange={(e) => setUnlimitedPracticals(e.target.checked)}
                    />
                    Unlimited
                  </label>
                </div>
                {!unlimitedPracticals && (
                  <input
                    type="number"
                    min="0"
                    value={formPracticals}
                    onChange={(e) => setFormPracticals(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Toggles Row */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
              />
              <span>Active Plan (Available for selection)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
              />
              <span style={{ color: '#fbbf24', fontWeight: '600' }}>Featured / Recommended Plan</span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '10px',
                padding: '10px 20px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={planSaving}
              style={{
                background: 'linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%)',
                border: 'none',
                color: 'white',
                borderRadius: '10px',
                padding: '10px 24px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {planSaving ? 'Saving Plan...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
