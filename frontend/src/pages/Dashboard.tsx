import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  FiBookOpen, 
  FiUsers, 
  FiArrowRight, 
  FiActivity, 
  FiAlertCircle,
  FiAward,
  FiTrash2,
  FiEdit2,
  FiX
} from 'react-icons/fi';
import type { RootState } from '../store';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useClassrooms } from '../components/ClassroomContext';

const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const { classrooms, loadingClassrooms, fetchClassrooms } = useClassrooms();
  const [teachersCount, setTeachersCount] = useState(0);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete Classroom Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Rename Classroom Modal State
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string; subject?: string } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameSubject, setRenameSubject] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const handleRenameClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    if (!renameName.trim()) {
      setRenameError('Classroom name is required.');
      return;
    }

    setRenaming(true);
    setRenameError(null);
    try {
      await api.put(`/classrooms/${renameTarget.id}`, {
        name: renameName.trim(),
        subject: renameSubject.trim() || undefined
      });
      setRenameTarget(null);
      await fetchClassrooms();
    } catch (err: any) {
      console.error(err);
      setRenameError(err.response?.data?.message || 'Failed to rename classroom.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/classrooms/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchClassrooms();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.response?.data?.message || 'Failed to delete classroom.');
    } finally {
      setDeleting(false);
    }
  };

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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link 
                          to={`/classrooms/${cls.id}`} 
                          className="btn-ld btn-ld-secondary btn-ld-small"
                        >
                          <span>Manage</span>
                          <FiArrowRight size={14} />
                        </Link>
                        {user?.role === 'admin' && (
                          <>
                            <button 
                              type="button"
                              className="btn-ld btn-ld-secondary btn-ld-small"
                              style={{ padding: '6px 10px' }}
                              onClick={() => {
                                setRenameError(null);
                                setRenameName(cls.name);
                                setRenameSubject(cls.subject || '');
                                setRenameTarget({ id: cls.id, name: cls.name, subject: cls.subject });
                              }}
                              title="Rename Classroom"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button 
                              type="button"
                              className="btn-ld btn-ld-small"
                              style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 10px' }}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget({ id: cls.id, name: cls.name });
                              }}
                              title="Delete Classroom"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rename Classroom Modal */}
      {renameTarget && (
        <div className="modal-overlay-ld" onClick={() => setRenameTarget(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit2 size={20} style={{ color: 'var(--light-primary)' }} />
                <span>Rename Classroom</span>
              </h3>
              <button 
                onClick={() => setRenameTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="modal-subtitle-ld" style={{ marginBottom: '20px' }}>
              Update the name or subject for <strong>{renameTarget.name}</strong>.
            </p>

            {renameError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{renameError}</span>
              </div>
            )}

            <form onSubmit={handleRenameClassroom}>
              <div className="form-group-ld" style={{ marginBottom: '16px' }}>
                <label className="form-label-ld" htmlFor="tableRenameClassName">Classroom Name *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="tableRenameClassName"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  placeholder="e.g. Mathematics Grade 10"
                  required
                />
              </div>

              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <label className="form-label-ld" htmlFor="tableRenameClassSubject">Subject</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="tableRenameClassSubject"
                  value={renameSubject}
                  onChange={(e) => setRenameSubject(e.target.value)}
                  placeholder="e.g. Algebra / Trigonometry"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setRenameTarget(null)}
                  disabled={renaming}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={renaming}
                >
                  {renaming ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Classroom Modal */}
      {deleteTarget && (
        <div className="modal-overlay-ld" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle size={22} />
                <span>Delete Classroom</span>
              </h3>
              <button 
                onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="modal-subtitle-ld" style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>? All associated modules, resources, and test data will be removed.
            </p>

            {deleteError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-ld btn-ld-secondary" 
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-ld" 
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}
                onClick={handleDeleteClassroom}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
