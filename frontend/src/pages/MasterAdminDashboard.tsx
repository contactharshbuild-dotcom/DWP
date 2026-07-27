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
  FiCalendar
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
}

const MasterAdminDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status changing state (tracks organization ID currently updating)
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
    const confirmMsg = `Are you sure you want to ${nextStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'} this organization? This will immediately ${nextStatus === 'suspended' ? 'block' : 'restore'} access for all users under it.`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setUpdatingId(orgId);
    try {
      const response = await api.put(`/masteradmin/organizations/${orgId}/status`, { status: nextStatus });
      if (response.data.success) {
        // Update local state
        setOrganizations(prev => prev.map(org => {
          if (org.id === orgId) {
            return { ...org, status: nextStatus };
          }
          return org;
        }));
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update organization status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Stats calculation
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.status === 'active').length;
  const suspendedOrgs = organizations.filter(o => o.status === 'suspended').length;

  // Filtered organizations
  const filteredOrgs = organizations.filter(org => {
    const query = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(query) ||
      org.slug.toLowerCase().includes(query) ||
      org.adminName.toLowerCase().includes(query) ||
      org.adminEmail.toLowerCase().includes(query) ||
      org.adminPhone.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{
      background: '#040814',
      color: '#e2e8f0',
      minHeight: '100vh',
      fontFamily: '"Inter", sans-serif'
    }}>
      <style>{`
        .glass-panel {
          background: rgba(13, 22, 46, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }

        .master-table th {
          background: rgba(20, 35, 75, 0.4);
          color: #94a3b8;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 16px 20px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .master-table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
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
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-active {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-suspended {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .btn-status-toggle {
          background: transparent;
          border: 1px solid;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-suspend {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .btn-suspend:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .btn-activate {
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .btn-activate:hover {
          background: rgba(16, 185, 129, 0.1);
          border-color: #10b981;
        }

        .stat-card {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justifyContent: center;
        }
      `}</style>

      {/* Header */}
      <header className="glass-panel" style={{
        margin: '0 0 32px 0',
        borderRadius: '0 0 16px 16px',
        borderTop: 'none',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00b4d8, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 0 15px rgba(0, 180, 216, 0.3)'
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
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
          >
            <FiLogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 60px 24px' }}>
        
        {/* Error alert */}
        {error && (
          <div className="glass-panel" style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
            padding: '16px 24px',
            marginBottom: '24px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px'
          }}>
            <FiAlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-panel stat-card">
            <div className="stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#818cf8', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
              <FiGlobe size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', lineHeight: '1.2' }}>
                {loading ? '...' : totalOrgs}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>
                Total Managed Organizations
              </div>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <FiCheckCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', lineHeight: '1.2' }}>
                {loading ? '...' : activeOrgs}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>
                Active Organizations
              </div>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <FiAlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', lineHeight: '1.2' }}>
                {loading ? '...' : suspendedOrgs}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', fontWeight: '500' }}>
                Suspended Organizations
              </div>
            </div>
          </div>
        </div>

        {/* Organizations Section */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          
          {/* Section Header Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'white' }}>
                Organizations Registry
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Monitor system tenants, administrative contacts, and access privileges.
              </p>
            </div>

            {/* Search and Reload */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by name, slug, admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '10px 16px 10px 40px',
                    fontSize: '13.5px',
                    width: '280px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00b4d8';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                />
                <FiSearch size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              <button 
                onClick={fetchOrganizations}
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                <FiActivity size={14} className={loading ? 'spin-anim' : ''} />
                <span>Reload</span>
              </button>
            </div>
          </div>

          {/* Table container */}
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {loading ? (
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <span className="spinner" style={{
                  display: 'inline-block',
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(0, 180, 216, 0.1)',
                  borderTopColor: '#00b4d8',
                  borderRadius: '50%'
                }}></span>
                <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>Loading system nodes...</p>
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
                <FiGlobe size={48} style={{ color: 'rgba(255,255,255,0.08)', marginBottom: '16px' }} />
                <h3>No Organizations Found</h3>
                <p style={{ fontSize: '13.5px', marginTop: '6px' }}>Try adjusting your search filters or reload the page.</p>
              </div>
            ) : (
              <table className="master-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Organization Details</th>
                    <th>Administrator Node</th>
                    <th>Phone Contact</th>
                    <th>Date Registered</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Security Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr key={org.id}>
                      {/* Name & Slug */}
                      <td>
                        <div style={{ fontWeight: '700', color: 'white', fontSize: '15px' }}>{org.name}</div>
                        <div style={{ fontSize: '12px', color: '#00b4d8', marginTop: '3px', fontWeight: '500' }}>
                          org/{org.slug}
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

                      {/* Toggle status */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleStatus(org.id, org.status)}
                          disabled={updatingId === org.id}
                          className={`btn-status-toggle ${org.status === 'active' ? 'btn-suspend' : 'btn-activate'}`}
                          style={{
                            minWidth: '100px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '34px'
                          }}
                        >
                          {updatingId === org.id ? (
                            <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                          ) : org.status === 'active' ? (
                            'Suspend'
                          ) : (
                            'Reactivate'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Embedded CSS animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        .spinner {
          animation: spin 0.6s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MasterAdminDashboard;
