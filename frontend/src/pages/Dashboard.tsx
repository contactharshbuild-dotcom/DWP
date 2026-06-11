import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiUser, FiBriefcase, FiLogOut, FiActivity, FiGlobe, FiUsers } from 'react-icons/fi';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { user, organization } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <FiActivity style={{ color: 'var(--primary)' }} />
          <span>LMS Portal Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/teachers" className="btn" style={{ width: 'auto', textDecoration: 'none', padding: '10px 16px', fontSize: '14px' }}>
            <FiUsers size={16} />
            <span>Manage Teachers</span>
          </Link>
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 16px', fontSize: '14px' }} onClick={handleLogout}>
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="grid">
        {/* User Card */}
        <div className="card">
          <h3 className="card-title">
            <FiUser />
            <span>Administrator Profile</span>
          </h3>
          <div className="data-row">
            <span className="data-label">Full Name</span>
            <span className="data-value">{user?.name}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Email Address</span>
            <span className="data-value">{user?.email}</span>
          </div>
          <div className="data-row">
            <span className="data-label">System Role</span>
            <span className="data-value">
              <span className="badge badge-primary">{user?.role}</span>
            </span>
          </div>
        </div>

        {/* Organization Card */}
        <div className="card">
          <h3 className="card-title">
            <FiBriefcase />
            <span>Organization Profile</span>
          </h3>
          <div className="data-row">
            <span className="data-label">Name</span>
            <span className="data-value">{organization?.name}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Slug / URL Slug</span>
            <span className="data-value">{organization?.slug}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Portal Address</span>
            <span className="data-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiGlobe size={14} style={{ color: 'var(--text-muted)' }} />
              <span>org/{organization?.slug}</span>
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">Status</span>
            <span className="data-value">
              <span className="badge badge-success">{organization?.status}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
