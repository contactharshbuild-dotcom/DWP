import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  FiBookOpen, 
  FiUsers, 
  FiArrowRight, 
  FiActivity, 
  FiAlertCircle,
  FiAward
} from 'react-icons/fi';
import type { RootState } from '../store';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useClassrooms } from '../components/ClassroomContext';





const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const { classrooms, loadingClassrooms } = useClassrooms();
  const [teachersCount, setTeachersCount] = useState(0);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeachersCount = async () => {
      if (user?.role !== 'admin') return;
      setLoadingTeachers(true);
      setError(null);
      try {
        const teachersRes = await api.get('/teachers');
        setTeachersCount(teachersRes.data.teachers.length);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load dashboard teachers count.');
      } finally {
        setLoadingTeachers(false);
      }
    };

    fetchTeachersCount();
  }, [user]);

  return (
    <DashboardLayout>
      {/* Header section */}
      <div className="ld-header">
        <div className="ld-header-left">
          <h2 className="ld-title">Welcome back, {user?.name}!</h2>
          <span className="ld-subtitle">Here is what is happening with your organization.</span>
        </div>
      </div>

      {error && (
        <div className="alert-ld alert-ld-error">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Analytics stats */}
      <div className="ld-stats-grid">
        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
            <FiBookOpen />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{loadingClassrooms ? '...' : classrooms.length}</span>
            <span className="ld-stat-label">
              {user?.role === 'admin' ? 'Total Classrooms' : 'My Classrooms'}
            </span>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="ld-stat-card">
            <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--light-success)' }}>
              <FiUsers />
            </div>
            <div className="ld-stat-info">
              <span className="ld-stat-value">{loadingTeachers ? '...' : teachersCount}</span>
              <span className="ld-stat-label">Active Teachers</span>
            </div>
          </div>
        )}

        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: 'var(--light-warning)' }}>
            <FiActivity />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">Active</span>
            <span className="ld-stat-label">System Status</span>
          </div>
        </div>
      </div>

      {/* Classrooms list card */}
      <div className="ld-card">
        <div className="ld-card-header">
          <h3 className="ld-card-title">
            <FiAward style={{ color: 'var(--light-primary)' }} />
            <span>Classrooms Directory</span>
          </h3>
          <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>
            {classrooms.length} Active Classrooms
          </span>
        </div>

        {loadingClassrooms ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '32px', height: '32px' }}></span>
          </div>
        ) : classrooms.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
            <FiBookOpen size={48} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
            <h4>No classrooms created yet</h4>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Click the "+" next to Classrooms in the sidebar to create your first classroom.</p>
          </div>
        ) : (
          <div className="ld-table-container">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Classroom ID</th>
                  <th>Classroom Name</th>
                  <th>Subject</th>
                  <th>Assigned Teachers</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((cls) => (
                  <tr key={cls.id}>
                    <td style={{ fontWeight: '600', color: 'var(--light-primary)' }}>
                      {cls.classroom_id}
                    </td>
                    <td style={{ fontWeight: '500' }}>{cls.name}</td>
                    <td>{cls.subject}</td>
                    <td>
                      {cls.teachers && cls.teachers.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {cls.teachers.map((t) => (
                            <span key={t.id} className="badge-ld badge-ld-primary">
                              {t.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--light-text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                          No teacher assigned
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/classrooms/${cls.id}`} 
                        className="btn-ld btn-ld-secondary btn-ld-small"
                      >
                        <span>Manage</span>
                        <FiArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
