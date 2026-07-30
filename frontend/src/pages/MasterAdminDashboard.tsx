import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  FiGlobe, 
  FiUsers, 
  FiSearch, 
  FiLogOut, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiActivity,
  FiPhone,
  FiMail,
  FiShield,
  FiCalendar,
  FiEdit2,
  FiX,
  FiAlertCircle
} from 'react-icons/fi';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';
import api from '../services/api';

interface OrganizationItem {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  logo_url?: string;
  logoUrl?: string;
}

const MasterAdminDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status changing state
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Edit Organization Modal State
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Security guard: protect client-side route
  useEffect(() => {
    if (!token || user?.role !== 'masteradmin') {
      navigate('/master-login');
    }
  }, [token, user, navigate]);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/masteradmin/organizations');
      if (response.data.success) {
        setOrganizations(response.data.organizations);
      } else {
        setError('Failed to fetch organizations.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while loading organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === 'masteradmin') {
      fetchOrganizations();
    }
  }, [token, user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/master-login');
  };

  const handleToggleStatus = async (orgId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = `Are you sure you want to ${nextStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'} this organization?`;
    
    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(orgId);
    try {
      const response = await api.put(`/masteradmin/organizations/${orgId}/status`, { status: nextStatus });
      if (response.data.success) {
        setOrganizations(prev => prev.map(org => {
          if (org.id === orgId) {
            return { ...org, status: nextStatus };
          }
          return org;
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update organization status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openEditModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setEditName(org.name);
    setEditEmail(org.email === 'N/A' ? '' : org.email);
    setEditPhone(org.phone === 'N/A' ? '' : org.phone);
    setEditLogoUrl(org.logo_url || org.logoUrl || '');
    setEditStatus(org.status);
    setEditError(null);
  };

  const handleSaveOrgEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setEditSaving(true);
    setEditError(null);

    try {
      const response = await api.put(`/masteradmin/organizations/${editingOrg.id}`, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        logo_url: editLogoUrl,
        status: editStatus
      });

      if (response.data.success) {
        await fetchOrganizations();
        setEditingOrg(null);
      }
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update organization details.');
    } finally {
      setEditSaving(false);
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

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.status === 'active').length;
  const suspendedOrgs = organizations.filter(o => o.status === 'suspended').length;

  const filteredOrgs = organizations.filter(org => {
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.slug.toLowerCase().includes(q) ||
      org.email.toLowerCase().includes(q) ||
      org.adminName.toLowerCase().includes(q) ||
      org.adminEmail.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-active {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-suspended {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-status-toggle {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-suspend {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-suspend:hover:not(:disabled) {
          background: #ef4444;
          color: white;
        }

        .btn-activate {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .btn-activate:hover:not(:disabled) {
          background: #10b981;
          color: white;
        }

        .org-master-thumb {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: #1e293b;
        }

        .org-master-initials {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: linear-gradient(135deg, #4f46e5 0%, #00b4d8 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
              Global System Governance
            </span>
          </div>
        </div>

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

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Card 1 */}
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
              background: 'rgba(79, 70, 229, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiGlobe size={26} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                Total Organizations
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                {loading ? '...' : totalOrgs}
              </div>
            </div>
          </div>

          {/* Card 2 */}
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
                Active Organizations
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                {loading ? '...' : activeOrgs}
              </div>
            </div>
          </div>

          {/* Card 3 */}
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
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FiAlertTriangle size={26} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                Suspended Organizations
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
                {loading ? '...' : suspendedOrgs}
              </div>
            </div>
          </div>
        </div>

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
                View, audit, and toggle access for registered organization accounts.
              </p>
            </div>

            {/* Search Input */}
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
                placeholder="Search organizations or admins..."
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
          </div>

          {/* Table */}
          {loading ? (
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
                  <th>Phone</th>
                  <th>Registered Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => {
                  const logoSrc = org.logo_url || org.logoUrl;
                  return (
                    <tr key={org.id}>
                      {/* Name & Logo */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {logoSrc ? (
                            <img 
                              src={logoSrc} 
                              alt={org.name} 
                              className="org-master-thumb" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="org-master-initials">
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

                      {/* Admin Info */}
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

                      {/* Phone */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <FiPhone size={13} style={{ color: '#94a3b8' }} />
                          <span>{org.phone || org.adminPhone || 'No Phone'}</span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}>
                          <FiCalendar size={13} style={{ color: '#94a3b8' }} />
                          <span>{formatDate(org.createdAt)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`status-badge status-${org.status}`}>
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
                          <button
                            onClick={() => openEditModal(org)}
                            style={{
                              background: 'rgba(79, 70, 229, 0.15)',
                              color: '#818cf8',
                              border: '1px solid rgba(79, 70, 229, 0.3)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Edit Organization Details & Logo"
                          >
                            <FiEdit2 size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(org.id, org.status)}
                            disabled={updatingId === org.id}
                            className={`btn-status-toggle ${org.status === 'active' ? 'btn-suspend' : 'btn-activate'}`}
                          >
                            {updatingId === org.id 
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
      </main>

      {/* Master Admin Edit Organization Modal */}
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
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Edit Organization</h3>
              <button 
                onClick={() => setEditingOrg(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {editError && (
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
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOrgEdit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
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
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
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
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
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
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#4f46e5',
                    border: 'none',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  disabled={editSaving}
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
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
