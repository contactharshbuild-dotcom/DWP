import React, { useState, useEffect } from 'react';
import {
  FiLayers,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiUsers,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiEye,
  FiCalendar,
  FiRefreshCw
} from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../store';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useBatches, type Batch } from '../context/BatchContext';

interface BatchStudent {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  created_at: string;
  profile_url?: string | null;
}

const Batches: React.FC = () => {
  const { user, organization } = useSelector((state: RootState) => state.auth);
  const { batches, loadingBatches, fetchBatches, createBatch, updateBatch, deleteBatch } = useBatches();

  // Guard: Students cannot access batch management
  if (user?.role === 'student') {
    return <Navigate to="/" replace />;
  }

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');

  // Create Batch Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit / Rename Modal State
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // View Batch Details State (Viewing students & batch info)
  const [viewTarget, setViewTarget] = useState<Batch | null>(null);
  const [viewStudents, setViewStudents] = useState<BatchStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [viewError, setViewError] = useState<string | null>(null);

  // Fetch batches on mount
  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a batch is selected to view, fetch its students
  useEffect(() => {
    if (!viewTarget) {
      setViewStudents([]);
      setStudentSearch('');
      setViewError(null);
      return;
    }

    const fetchStudentsForBatch = async () => {
      setLoadingStudents(true);
      setViewError(null);
      try {
        const response = await api.get(`/batches/${viewTarget.id}/students`);
        setViewStudents(response.data.students || []);
      } catch (err: any) {
        console.error('Failed to fetch batch students:', err);
        setViewError(err.response?.data?.message || 'Failed to load students in this batch.');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsForBatch();
  }, [viewTarget]);

  // Handle Create Batch Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      setCreateError('Batch name is required.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      await createBatch(newBatchName.trim());
      setNewBatchName('');
      setCreateSuccess('Batch created successfully!');
      setTimeout(() => {
        setCreateSuccess(null);
        setShowCreateModal(false);
      }, 1000);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create batch.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) {
      setEditError('Batch name is required.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      await updateBatch(editTarget.id, editName.trim());
      if (viewTarget && viewTarget.id === editTarget.id) {
        setViewTarget(prev => prev ? { ...prev, name: editName.trim() } : null);
      }
      setEditTarget(null);
      setEditName('');
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Failed to rename batch.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteBatch(deleteTarget.id);
      if (viewTarget && viewTarget.id === deleteTarget.id) {
        setViewTarget(null);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to delete batch.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered batches
  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Filtered students inside view modal
  const filteredStudents = viewStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.trim().toLowerCase()) ||
    (s.phone && s.phone.includes(studentSearch.trim()))
  );

  // Total enrolled students across all batches
  const totalEnrolled = batches.reduce((sum, b) => sum + (b.studentCount || 0), 0);

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="ld-header">
        <div className="ld-header-left">
          <h2 className="ld-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiLayers style={{ color: 'var(--light-primary)' }} />
            <span>Batches</span>
          </h2>
          <span className="ld-subtitle">
            Create and organize student batches for assignments, tests, and classroom workflows.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn-ld btn-ld-secondary"
            onClick={() => fetchBatches()}
            disabled={loadingBatches}
            title="Refresh batches list"
          >
            <FiRefreshCw size={16} className={loadingBatches ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            className="btn-ld btn-ld-primary"
            onClick={() => {
              setNewBatchName('');
              setCreateError(null);
              setCreateSuccess(null);
              setShowCreateModal(true);
            }}
          >
            <FiPlus size={18} />
            <span>Create Batch</span>
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="ld-stats-grid">
        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--light-primary)' }}>
            <FiLayers />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{batches.length}</span>
            <span className="ld-stat-label">Total Batches</span>
          </div>
        </div>

        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <FiUsers />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{totalEnrolled}</span>
            <span className="ld-stat-label">Enrolled Students</span>
          </div>
        </div>

        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FiCalendar />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{organization?.name || 'Academic Org'}</span>
            <span className="ld-stat-label">Active Organization</span>
          </div>
        </div>
      </div>

      {/* Batches Table & Directory Card */}
      <div className="ld-card">
        <div className="ld-card-header" style={{ flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div>
            <h3 className="ld-card-title">Batches Directory</h3>
            <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>
              {filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'} registered
            </span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <FiSearch 
              size={16} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--light-text-muted)', pointerEvents: 'none' }} 
            />
            <input 
              type="text" 
              placeholder="Search batches..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input-ld"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', width: '100%' }}
            />
          </div>
        </div>

        {loadingBatches && batches.length === 0 ? (
          <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <span className="spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--light-primary)', width: '36px', height: '36px' }}></span>
            <span style={{ fontSize: '14px', color: 'var(--light-text-muted)' }}>Loading batches...</span>
          </div>
        ) : batches.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--light-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <FiLayers size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--light-text-primary)', marginBottom: '8px' }}>
              No Batches Created Yet
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--light-text-muted)', maxWidth: '440px', margin: '0 auto 20px' }}>
              Create student batches like "Batch 2026-A" or "Evening Section" to easily organize classrooms, tests, and resource distribution.
            </p>
            <button 
              className="btn-ld btn-ld-primary"
              onClick={() => {
                setNewBatchName('');
                setCreateError(null);
                setCreateSuccess(null);
                setShowCreateModal(true);
              }}
            >
              <FiPlus size={16} />
              <span>Create Your First Batch</span>
            </button>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-muted)' }}>
            <p>No batches match the search "{searchQuery}".</p>
            <button 
              className="btn-ld btn-ld-secondary btn-ld-small" 
              onClick={() => setSearchQuery('')}
              style={{ marginTop: '10px' }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="ld-table-container">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Batch ID</th>
                  <th>Enrolled Students</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => setViewTarget(batch)}
                        title="Click to view batch details"
                      >
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '8px', 
                          backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                          color: 'var(--light-primary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FiLayers size={18} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--light-text-primary)', fontSize: '14px', display: 'block' }}>
                            {batch.name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--light-primary)', fontWeight: 500 }}>
                            View details &rarr;
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--light-text-muted)' }}>
                        #{batch.id}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge-ld" 
                        style={{ 
                          backgroundColor: (batch.studentCount || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--light-bg-subtle, #f1f5f9)', 
                          color: (batch.studentCount || 0) > 0 ? '#059669' : 'var(--light-text-muted)',
                          border: (batch.studentCount || 0) > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--light-border)',
                          cursor: 'pointer'
                        }}
                        onClick={() => setViewTarget(batch)}
                        title="Click to see students"
                      >
                        <FiUsers size={12} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                        {batch.studentCount || 0} {(batch.studentCount === 1) ? 'Student' : 'Students'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                        {new Date(batch.created_at).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="btn-ld btn-ld-secondary btn-ld-small"
                          onClick={() => setViewTarget(batch)}
                          title="View batch details & enrolled students"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <FiEye size={13} />
                          <span>View</span>
                        </button>

                        <button 
                          className="btn-ld btn-ld-secondary btn-ld-small"
                          onClick={() => {
                            setEditTarget(batch);
                            setEditName(batch.name);
                            setEditError(null);
                          }}
                          title="Rename batch"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <FiEdit2 size={13} />
                          <span>Rename</span>
                        </button>

                        <button 
                          className="btn-ld btn-ld-small"
                          onClick={() => {
                            setDeleteTarget(batch);
                            setDeleteError(null);
                          }}
                          title="Delete batch"
                          style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <FiTrash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* View Batch Details & Enrolled Students Modal */}
      {/* ========================================================================= */}
      {viewTarget && (
        <div className="modal-overlay-ld" onClick={() => setViewTarget(null)}>
          <div 
            className="modal-content-ld" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '650px', width: '92%' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                  color: 'var(--light-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  <FiLayers />
                </div>
                <div>
                  <h3 className="modal-title-ld" style={{ margin: 0 }}>
                    {viewTarget.name}
                  </h3>
                  <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>
                    Batch ID: #{viewTarget.id} • Created {new Date(viewTarget.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setViewTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)', padding: '4px' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Quick Actions Bar inside Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--light-bg-subtle, #f8fafc)', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--light-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUsers size={16} style={{ color: 'var(--light-primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--light-text-primary)' }}>
                  {viewStudents.length} {viewStudents.length === 1 ? 'Enrolled Student' : 'Enrolled Students'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-ld btn-ld-secondary btn-ld-small"
                  onClick={() => {
                    setEditTarget(viewTarget);
                    setEditName(viewTarget.name);
                    setEditError(null);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <FiEdit2 size={12} />
                  <span>Rename</span>
                </button>
                <button 
                  className="btn-ld btn-ld-small"
                  onClick={() => {
                    setDeleteTarget(viewTarget);
                    setDeleteError(null);
                  }}
                  style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <FiTrash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {viewError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} />
                <span>{viewError}</span>
              </div>
            )}

            {/* Search within student list */}
            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <FiSearch 
                size={14} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--light-text-muted)' }} 
              />
              <input 
                type="text"
                placeholder="Search enrolled students by name, email or phone..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="form-input-ld"
                style={{ paddingLeft: '34px', height: '36px', fontSize: '13px', width: '100%' }}
              />
            </div>

            {/* Students List Box */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--light-border)', borderRadius: '10px' }}>
              {loadingStudents ? (
                <div style={{ padding: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <span className="spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--light-primary)', width: '24px', height: '24px' }}></span>
                  <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>Loading batch students...</span>
                </div>
              ) : viewStudents.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-muted)' }}>
                  <FiUsers size={32} style={{ color: 'var(--light-text-muted)', marginBottom: '8px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, margin: '4px 0', color: 'var(--light-text-primary)' }}>
                    No students enrolled in this batch yet
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--light-text-muted)', margin: 0 }}>
                    Students are assigned to batches when invited or added to classrooms.
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--light-text-muted)', fontSize: '13px' }}>
                  No students found matching "{studentSearch}".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredStudents.map((student) => (
                    <div 
                      key={student.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--light-border)',
                        backgroundColor: 'var(--light-card)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {student.profile_url ? (
                          <img 
                            src={student.profile_url} 
                            alt={student.name}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="ld-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {getInitials(student.name)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--light-text-primary)' }}>
                            {student.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--light-text-muted)' }}>
                            {student.email} {student.phone ? `• ${student.phone}` : ''}
                          </div>
                        </div>
                      </div>

                      <span 
                        className={`badge-ld ${student.status === 'active' ? 'badge-ld-success' : 'badge-ld-warning'}`}
                        style={{ textTransform: 'capitalize', fontSize: '11px' }}
                      >
                        {student.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button"
                className="btn-ld btn-ld-secondary"
                onClick={() => setViewTarget(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create Batch Modal */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="modal-overlay-ld" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiLayers size={20} style={{ color: 'var(--light-primary)' }} />
                <span>Create New Batch</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="modal-subtitle-ld" style={{ marginBottom: '16px' }}>
              Create student cohorts (e.g. "Batch 2026", "Section A", "Morning Cohort") for organized classroom workflows.
            </p>

            {createError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '14px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="alert-ld alert-ld-success" style={{ marginBottom: '14px' }}>
                <FiCheck size={18} style={{ flexShrink: 0 }} />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <label className="form-label-ld" htmlFor="newBatchInput">Batch Name *</label>
                <input 
                  id="newBatchInput"
                  type="text" 
                  className="form-input-ld" 
                  placeholder="e.g. Batch 2026-A, Morning Cohort, Grade 10-B"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  disabled={createLoading}
                  autoFocus
                  required
                />
                <span style={{ fontSize: '12px', color: 'var(--light-text-muted)', marginTop: '4px', display: 'block' }}>
                  This batch will be available across classroom enrollment, assignment modals, and quiz distributions.
                </span>
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
                  disabled={createLoading || !newBatchName.trim()}
                >
                  {createLoading ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Rename Batch Modal */}
      {/* ========================================================================= */}
      {editTarget && (
        <div className="modal-overlay-ld" onClick={() => setEditTarget(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit2 size={18} style={{ color: 'var(--light-primary)' }} />
                <span>Rename Batch</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="modal-subtitle-ld" style={{ marginBottom: '16px' }}>
              Change the name of batch <strong>"{editTarget.name}"</strong>. Existing students enrolled in this batch will be updated automatically.
            </p>

            {editError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '14px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <label className="form-label-ld" htmlFor="editBatchInput">New Batch Name *</label>
                <input 
                  id="editBatchInput"
                  type="text" 
                  className="form-input-ld" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editLoading}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setEditTarget(null)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary"
                  disabled={editLoading || !editName.trim()}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Delete Batch Confirmation Modal */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="modal-overlay-ld" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle size={22} />
                <span>Delete Batch</span>
              </h3>
              <button 
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="modal-subtitle-ld" style={{ marginBottom: '16px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete batch <strong>"{deleteTarget.name}"</strong>?
              {(deleteTarget.studentCount || 0) > 0 && (
                <span style={{ display: 'block', marginTop: '8px', color: '#b45309', fontWeight: 500 }}>
                  Note: There are currently {deleteTarget.studentCount} student(s) associated with this batch.
                </span>
              )}
            </p>

            {deleteError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-ld btn-ld-secondary" 
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-ld" 
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}
                onClick={handleDeleteSubmit}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Batches;
