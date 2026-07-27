import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiPlus, 
  FiLogOut, 
  FiBookOpen, 
  FiAlertCircle,
  FiHelpCircle
} from 'react-icons/fi';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';
import api from '../services/api';
import { useClassrooms } from './ClassroomContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, organization } = useSelector((state: RootState) => state.auth);

  const { classrooms, loadingClassrooms, fetchClassrooms } = useClassrooms();

  // Create Classroom Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleCreateClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !classSubject) {
      setCreateError('Classroom name and subject are required.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const response = await api.post('/classrooms', {
        name: className,
        subject: classSubject
      });
      const newClassroom = response.data.classroom;
      
      // Close modal & reset
      setShowCreateModal(false);
      setClassName('');
      setClassSubject('');
      
      // Refresh list and navigate to details of new classroom
      await fetchClassrooms();
      navigate(`/classrooms/${newClassroom.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create classroom.';
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // Helper to extract initials for avatar
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="light-dashboard">
      <div className="ld-container">
        {/* Left Sidebar */}
        <aside className="ld-sidebar">
          <div className="ld-sidebar-top">
            {/* Logo / Org Section */}
            <div className="ld-logo-section">
              <div className="ld-logo-icon">
                {getInitials(organization?.name)}
              </div>
              <div className="ld-org-details">
                <span className="ld-org-name">{organization?.name || 'Academy'}</span>
                <span className="ld-org-slug">org/{organization?.slug}</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="ld-nav">
              <span className="ld-nav-label">Menu</span>
              <Link 
                to="/" 
                className={`ld-nav-item ${location.pathname === '/' ? 'active' : ''}`}
              >
                <FiHome size={18} />
                <span>Overview</span>
              </Link>
              
              <Link 
                to="/teachers" 
                className={`ld-nav-item ${location.pathname === '/teachers' ? 'active' : ''}`}
              >
                <FiUsers size={18} />
                <span>Teachers</span>
              </Link>

              {user?.role !== 'student' && (
                <Link 
                  to="/quiz-builder" 
                  className={`ld-nav-item ${location.pathname === '/quiz-builder' ? 'active' : ''}`}
                >
                  <FiHelpCircle size={18} />
                  <span>Quiz Builder</span>
                </Link>
              )}

              {/* Classrooms Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
                <span className="ld-nav-label" style={{ margin: 0 }}>Classrooms</span>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setShowCreateModal(true);
                      setCreateError(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--light-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    title="Create Classroom"
                  >
                    <FiPlus size={16} />
                  </button>
                )}
              </div>

              {/* Sidebar Classrooms List */}
              <div className="ld-sidebar-classrooms">
                {loadingClassrooms && classrooms.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '12px', color: 'var(--light-text-muted)', textAlign: 'center' }}>
                    Loading...
                  </div>
                ) : classrooms.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                    No classrooms
                  </div>
                ) : (
                  classrooms.map((cls) => {
                    const isActive = location.pathname === `/classrooms/${cls.id}`;
                    return (
                      <Link
                        key={cls.id}
                        to={`/classrooms/${cls.id}`}
                        className={`ld-nav-item ${isActive ? 'active' : ''}`}
                        style={{ padding: '8px 12px' }}
                      >
                        <FiBookOpen size={16} style={{ flexShrink: 0 }} />
                        <div className="ld-classroom-item-sub">
                          <span className="ld-classroom-item-sub-title">{cls.name}</span>
                          <span className="ld-classroom-item-sub-id">ID: {cls.classroom_id}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </nav>
          </div>

          {/* User Profile Footer & Logout */}
          <div className="ld-sidebar-footer">
            <div className="ld-user-card">
              <div className="ld-avatar">
                {getInitials(user?.name)}
              </div>
              <div className="ld-user-info">
                <span className="ld-username">{user?.name}</span>
                <span className="ld-useremail">{user?.email}</span>
              </div>
            </div>
            
            <button 
              className="btn-ld btn-ld-secondary btn-ld-small" 
              onClick={handleLogout}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FiLogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className="ld-main">
          {children}
        </main>
      </div>

      {/* Create Classroom Modal Overlay */}
      {showCreateModal && (
        <div className="modal-overlay-ld" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title-ld">Create New Classroom</h3>
            <p className="modal-subtitle-ld">Set up a new classroom like Teachmint. A unique numeric Classroom ID will be auto-generated.</p>

            {createError && (
              <div className="alert-ld alert-ld-error">
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClassroomSubmit}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="className">Classroom Name *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="className"
                  placeholder="e.g. Grade 10 - Mathematics"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-ld" style={{ marginBottom: '28px' }}>
                <label className="form-label-ld" htmlFor="classSubject">Subject *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="classSubject"
                  placeholder="e.g. Algebra / Trigonometry"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
