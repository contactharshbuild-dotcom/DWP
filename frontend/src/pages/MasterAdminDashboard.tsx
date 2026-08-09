import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  FiGlobe, 
  FiUsers, 
  FiSearch, 
  FiLogOut, 
  FiAlertTriangle, 
  FiActivity,
  FiMail,
  FiShield,
  FiEdit2,
  FiX,
  FiAlertCircle,
  FiLayers
} from 'react-icons/fi';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';
import api from '../services/api';

// Dedicated Subscription Components & Types
import type { SubscriptionPlanItem, OrganizationItem } from '../components/subscription/types';
import { SubscriptionPlanMaker } from '../components/subscription/SubscriptionPlanMaker';
import { SubscriptionPlanModal } from '../components/subscription/SubscriptionPlanModal';
import { AssignPlanModal } from '../components/subscription/AssignPlanModal';

const MasterAdminDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  // Tabs state: 'plans' (default) or 'orgs'
  const [activeTab, setActiveTab] = useState<'plans' | 'orgs'>('plans');

  // Organizations state
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [updatingOrgId, setUpdatingOrgId] = useState<number | null>(null);

  // Subscription Plans state
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Modals state
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgEmail, setEditOrgEmail] = useState('');
  const [editOrgPhone, setEditOrgPhone] = useState('');
  const [editOrgLogoUrl, setEditOrgLogoUrl] = useState('');
  const [editOrgStatus, setEditOrgStatus] = useState('active');
  const [editOrgSaving, setEditOrgSaving] = useState(false);
  const [editOrgError, setEditOrgError] = useState<string | null>(null);

  const [assigningOrg, setAssigningOrg] = useState<OrganizationItem | null>(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);

  // Security guard: protect client-side route
  useEffect(() => {
    if (!token || user?.role !== 'masteradmin') {
      navigate('/master-login');
    }
  }, [token, user, navigate]);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    setOrgsError(null);
    try {
      const response = await api.get('/masteradmin/organizations');
      if (response.data.success) {
        setOrganizations(response.data.organizations);
      } else {
        setOrgsError('Failed to fetch organizations.');
      }
    } catch (err: any) {
      console.error(err);
      setOrgsError(err.response?.data?.message || 'Error loading organizations.');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    setPlansError(null);
    try {
      const response = await api.get('/masteradmin/subscription-plans');
      if (response.data.success) {
        setPlans(response.data.plans);
      } else {
        setPlansError('Failed to fetch subscription plans.');
      }
    } catch (err: any) {
      console.error(err);
      setPlansError(err.response?.data?.message || 'Error loading subscription plans.');
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'masteradmin') {
      fetchOrganizations();
      fetchPlans();
    }
  }, [token, user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/master-login');
  };

  // Toggle Organization Active/Suspended
  const handleToggleOrgStatus = async (orgId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = `Are you sure you want to ${nextStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'} this organization?`;
    
    if (!window.confirm(confirmMsg)) return;

    setUpdatingOrgId(orgId);
    try {
      const response = await api.put(`/masteradmin/organizations/${orgId}/status`, { status: nextStatus });
      if (response.data.success) {
        setOrganizations(prev => prev.map(org => {
          if (org.id === orgId) return { ...org, status: nextStatus };
          return org;
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update organization status.');
    } finally {
      setUpdatingOrgId(null);
    }
  };

  // Edit Organization Details Modal
  const openEditOrgModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
    setEditOrgEmail(org.email === 'N/A' ? '' : org.email);
    setEditOrgPhone(org.phone === 'N/A' ? '' : org.phone);
    setEditOrgLogoUrl(org.logo_url || org.logoUrl || '');
    setEditOrgStatus(org.status);
    setEditOrgError(null);
  };

  const handleSaveOrgEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setEditOrgSaving(true);
    setEditOrgError(null);

    try {
      const response = await api.put(`/masteradmin/organizations/${editingOrg.id}`, {
        name: editOrgName,
        email: editOrgEmail,
        phone: editOrgPhone,
        logo_url: editOrgLogoUrl,
        status: editOrgStatus
      });

      if (response.data.success) {
        await fetchOrganizations();
        setEditingOrg(null);
      }
    } catch (err: any) {
      setEditOrgError(err.response?.data?.message || 'Failed to update organization details.');
    } finally {
      setEditOrgSaving(false);
    }
  };

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredOrgs = organizations.filter(org => {
    const q = orgSearchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.slug.toLowerCase().includes(q) ||
      org.email.toLowerCase().includes(q) ||
      org.adminName.toLowerCase().includes(q) ||
      (org.subscriptionPlan?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070d18',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        .master-search-input:focus {
          border-color: #00b4d8 !important;
          box-shadow: 0 0 15px rgba(0, 180, 216, 0.25) !important;
          outline: none;
        }

        .master-table th {
          background: rgba(15, 23, 42, 0.9);
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 16px 20px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .master-table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 14px;
          vertical-align: middle;
        }

        .master-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .tab-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid transparent;
        }

        .tab-btn-active {
          background: linear-gradient(135deg, rgba(0, 180, 216, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%);
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 4px 15px rgba(0, 180, 216, 0.15);
        }

        .tab-btn-inactive {
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .tab-btn-inactive:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .plan-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 180, 216, 0.3);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 180, 216, 0.1);
        }

        .plan-card-featured {
          border-color: rgba(245, 158, 11, 0.4);
          background: radial-gradient(circle at top right, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.7));
        }

        .limit-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          margin-bottom: 6px;
        }

        .limit-label {
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .limit-value {
          font-weight: 700;
          color: #f1f5f9;
        }

        .unlimited-badge {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.15);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
        }
      `}</style>

      {/* Header Bar */}
      <header style={{
        background: 'rgba(11, 19, 36, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/dwp-logo.png" 
            alt="DWP Logo" 
            style={{ height: '36px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(0, 180, 216, 0.15)',
            border: '1px solid rgba(0, 180, 216, 0.3)',
            color: '#00b4d8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FiShield size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px' }}>
              DWP Control Center
            </h1>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
              Subscription & Multi-Tenant Governance
            </span>
          </div>
        </div>

        {/* Center Tabs Navigation */}
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(7, 13, 24, 0.6)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setActiveTab('plans')}
            className={`tab-btn ${activeTab === 'plans' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            <FiLayers size={16} />
            <span>Subscription Plan Maker</span>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: activeTab === 'plans' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)'
            }}>
              {plans.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orgs')}
            className={`tab-btn ${activeTab === 'orgs' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            <FiGlobe size={16} />
            <span>Organizations Registry</span>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: activeTab === 'orgs' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)'
            }}>
              {organizations.length}
            </span>
          </button>
        </div>

        {/* Right User Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{user?.name || 'Master Admin'}</div>
            <div style={{ fontSize: '11px', color: '#00b4d8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Root Administrator
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <FiLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px 24px' }}>
        
        {/* TAB 1: DEDICATED SUBSCRIPTION PLAN MAKER COMPONENT */}
        {activeTab === 'plans' && (
          <SubscriptionPlanMaker
            plans={plans}
            loading={loadingPlans}
            error={plansError}
            onRefresh={fetchPlans}
            onOpenCreateModal={() => {
              setEditingPlan(null);
              setPlanModalOpen(true);
            }}
            onOpenEditModal={(plan) => {
              setEditingPlan(plan);
              setPlanModalOpen(true);
            }}
          />
        )}

        {/* TAB 2: ORGANIZATIONS REGISTRY */}
        {activeTab === 'orgs' && (
          <div>
            {orgsError && (
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
                <span>{orgsError}</span>
              </div>
            )}

            {/* Organizations Table Container */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              overflow: 'hidden'
            }}>
              {/* Controls Bar */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white' }}>
                    Organizations Registry
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Manage client organizations, assign subscription plans, and toggle system access.
                  </p>
                </div>

                <div style={{ position: 'relative', width: '320px' }}>
                  <FiSearch style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b'
                  }} size={18} />
                  <input
                    type="text"
                    placeholder="Search organizations or plans..."
                    value={orgSearchQuery}
                    onChange={(e) => setOrgSearchQuery(e.target.value)}
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
              </div>

              {/* Table */}
              {loadingOrgs ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                  <FiActivity size={32} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '12px', color: '#00b4d8' }} />
                  <div>Loading organizations registry...</div>
                </div>
              ) : filteredOrgs.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                  <h3>No Organizations Found</h3>
                  <p style={{ fontSize: '13px' }}>Try refining your search query.</p>
                </div>
              ) : (
                <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Admin Contact</th>
                      <th>Assigned Subscription Plan</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((org) => {
                      const logoSrc = org.logo_url || org.logoUrl;
                      const plan = org.subscriptionPlan;
                      return (
                        <tr key={org.id}>
                          {/* Name & Logo */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {logoSrc ? (
                                <img 
                                  src={logoSrc} 
                                  alt={org.name} 
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    background: '#1e293b'
                                  }}
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #4f46e5 0%, #00b4d8 100%)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '14px',
                                  fontWeight: '700'
                                }}>
                                  {getInitials(org.name)}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>{org.name}</div>
                                <div style={{ fontSize: '12px', color: '#00b4d8', marginTop: '2px', fontWeight: '500' }}>
                                  org/{org.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Admin Contact */}
                          <td>
                            <div style={{ fontWeight: '600', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiUsers size={14} style={{ color: '#94a3b8' }} />
                              <span>{org.adminName}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiMail size={13} style={{ color: '#64748b' }} />
                              <span>{org.adminEmail}</span>
                            </div>
                          </td>

                          {/* Assigned Subscription Plan */}
                          <td>
                            {plan ? (
                              <div>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  fontWeight: '700',
                                  fontSize: '13px'
                                }}>
                                  <FiLayers size={14} />
                                  <span>{plan.name}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                  Cycle: <strong style={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{org.billing_cycle || 'monthly'}</strong> ({plan.currency === 'INR' ? '₹' : '$'}{org.billing_cycle === 'yearly' ? plan.yearly_price : plan.monthly_price})
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                No plan assigned
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: org.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: org.status === 'active' ? '#34d399' : '#f87171',
                              border: org.status === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: org.status === 'active' ? '#10b981' : '#ef4444'
                              }}></span>
                              <span style={{ textTransform: 'capitalize' }}>{org.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                              {/* Assign Plan Button */}
                              <button
                                onClick={() => setAssigningOrg(org)}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
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
                                <FiLayers size={14} />
                                <span>Assign Plan</span>
                              </button>

                              {/* Edit Org Details Button */}
                              <button
                                onClick={() => openEditOrgModal(org)}
                                style={{
                                  background: 'rgba(79, 70, 229, 0.15)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(79, 70, 229, 0.3)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <FiEdit2 size={13} />
                                <span>Edit</span>
                              </button>

                              {/* Suspend / Activate Toggle Button */}
                              <button
                                onClick={() => handleToggleOrgStatus(org.id, org.status)}
                                disabled={updatingOrgId === org.id}
                                style={{
                                  background: org.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  color: org.status === 'active' ? '#ef4444' : '#10b981',
                                  border: org.status === 'active' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                {updatingOrgId === org.id 
                                  ? 'Updating...' 
                                  : org.status === 'active' ? 'Suspend' : 'Activate'
                                }
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* DEDICATED SUBSCRIPTION PLAN MODAL */}
      <SubscriptionPlanModal
        isOpen={planModalOpen}
        editingPlan={editingPlan}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={() => {
          fetchPlans();
        }}
      />

      {/* DEDICATED ASSIGN PLAN TO ORGANIZATION MODAL */}
      <AssignPlanModal
        isOpen={Boolean(assigningOrg)}
        org={assigningOrg}
        plans={plans}
        onClose={() => setAssigningOrg(null)}
        onSuccess={() => {
          fetchOrganizations();
          fetchPlans();
        }}
      />

      {/* MASTER ADMIN EDIT ORGANIZATION DETAILS MODAL */}
      {editingOrg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
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
            maxWidth: '500px',
            width: '100%',
            color: 'white',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Edit Organization Details</h3>
              <button 
                onClick={() => setEditingOrg(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {editOrgError && (
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
                <span>{editOrgError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOrgEdit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                  Organization Logo URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={editOrgLogoUrl}
                  onChange={(e) => setEditOrgLogoUrl(e.target.value)}
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
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editOrgEmail}
                    onChange={(e) => setEditOrgEmail(e.target.value)}
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
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editOrgPhone}
                    onChange={(e) => setEditOrgPhone(e.target.value)}
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
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                  Account Status
                </label>
                <select
                  value={editOrgStatus}
                  onChange={(e) => setEditOrgStatus(e.target.value)}
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
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
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
                  disabled={editOrgSaving}
                  style={{
                    background: '#4f46e5',
                    border: 'none',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {editOrgSaving ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MasterAdminDashboard;
