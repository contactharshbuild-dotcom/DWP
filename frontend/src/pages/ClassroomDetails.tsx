import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiTrash2, 
  FiAlertCircle, 
  FiCheck, 
  FiCopy, 
  FiBookOpen, 
  FiUserPlus,
  FiUserCheck,
  FiX
} from 'react-icons/fi';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

interface Teacher {
  id: number;
  name: string;
  email: string;
  status: string; // user account status (active/pending)
  ClassroomTeacher: {
    status: string; // join status (pending/approved)
  };
}

interface Classroom {
  id: number;
  classroom_id: number;
  name: string;
  subject: string;
  teachers: Teacher[];
}

const ClassroomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Classroom Detail State
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

  // Share Modal State
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Classroom details
  const fetchClassroomDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/classrooms/${id}`);
      setClassroom(response.data.classroom);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch classroom details. It may not exist or you do not have permission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomDetails();
  }, [id]);

  const handleApproveTeacher = async (teacherId: number) => {
    try {
      await api.post(`/classrooms/${id}/teachers/${teacherId}/approve`);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve teacher request.');
    }
  };

  const handleRejectTeacher = async (teacherId: number, isPending: boolean = true) => {
    const confirmMessage = isPending
      ? 'Are you sure you want to reject this join request?'
      : 'Are you sure you want to remove this teacher from the classroom?';
      
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.delete(`/classrooms/${id}/teachers/${teacherId}/reject`);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove/reject teacher.');
    }
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Partition teachers by join status
  const activeTeachers = classroom?.teachers.filter(t => t.ClassroomTeacher?.status === 'approved') || [];
  const pendingRequests = classroom?.teachers.filter(t => t.ClassroomTeacher?.status === 'pending') || [];

  // Generate generic shareable link for this classroom ID
  const inviteLink = classroom ? `http://localhost:5173/join-classroom/${classroom.classroom_id}` : '';

  return (
    <DashboardLayout>
      {/* Header / Navigation bar */}
      <div className="ld-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn-ld btn-ld-secondary btn-ld-small" 
            style={{ padding: '8px' }}
            onClick={() => navigate('/')}
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="ld-header-left">
            <h2 className="ld-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiBookOpen style={{ color: 'var(--light-primary)' }} />
              <span>{classroom?.name || 'Classroom Details'}</span>
            </h2>
            <span className="ld-subtitle">
              Subject: {classroom?.subject} • Classroom ID: {classroom?.classroom_id}
            </span>
          </div>
        </div>

        {classroom && user?.role === 'admin' && (
          <button className="btn-ld btn-ld-primary" onClick={() => setShowModal(true)}>
            <FiPlus size={18} />
            <span>Invite Teacher</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-ld alert-ld-error">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '40px', height: '40px' }}></span>
        </div>
      ) : classroom ? (
        <div className="ld-card">
          {/* Tabs header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--light-border)', marginBottom: '24px' }}>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'active' ? '2px solid var(--light-primary)' : '2px solid transparent',
                color: activeTab === 'active' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              Active Teachers ({activeTeachers.length})
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('pending')}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'pending' ? '2px solid var(--light-primary)' : '2px solid transparent',
                  color: activeTab === 'pending' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>Join Requests</span>
                {pendingRequests.length > 0 && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    fontWeight: '700'
                  }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Active Teachers Tab */}
          {activeTab === 'active' && (
            activeTeachers.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
                <FiUserPlus size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                <h4>No active teachers in this classroom</h4>
                {user?.role === 'admin' ? (
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Click "Invite Teacher" above to copy the shareable link for teachers to join.</p>
                ) : (
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Waiting for the administrator to assign teachers.</p>
                )}
              </div>
            ) : (
              <div className="ld-table-container">
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th>Teacher Name</th>
                      <th>Email Address</th>
                      <th>Account Status</th>
                      {user?.role === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTeachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td style={{ fontWeight: '600' }}>{teacher.name}</td>
                        <td>{teacher.email}</td>
                        <td>
                          {teacher.status === 'active' ? (
                            <span className="badge-ld badge-ld-success">Active</span>
                          ) : (
                            <span className="badge-ld badge-ld-warning">Pending Invite</span>
                          )}
                        </td>
                        {user?.role === 'admin' && (
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-ld btn-ld-danger btn-ld-small"
                              onClick={() => handleRejectTeacher(teacher.id, false)}
                              title="Remove teacher from classroom"
                            >
                              <FiTrash2 size={13} />
                              <span>Remove</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pending Requests Tab */}
          {activeTab === 'pending' && user?.role === 'admin' && (
            pendingRequests.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
                <FiUserCheck size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                <h4>No pending join requests</h4>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>When teachers click the invite link and request access, they will appear here.</p>
              </div>
            ) : (
              <div className="ld-table-container">
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th>Teacher Name</th>
                      <th>Email Address</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((teacher) => (
                      <tr key={teacher.id}>
                        <td style={{ fontWeight: '600' }}>{teacher.name}</td>
                        <td>{teacher.email}</td>
                        <td>
                          {teacher.status === 'active' ? (
                            <span className="badge-ld badge-ld-success">Active</span>
                          ) : (
                            <span className="badge-ld badge-ld-warning">Pending Invite</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-ld btn-ld-primary btn-ld-small"
                              style={{ backgroundColor: 'var(--light-success)' }}
                              onClick={() => handleApproveTeacher(teacher.id)}
                            >
                              <FiCheck size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              className="btn-ld btn-ld-danger btn-ld-small"
                              onClick={() => handleRejectTeacher(teacher.id, true)}
                            >
                              <FiX size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      ) : null}

      {/* Shareable Invite Modal */}
      {showModal && (
        <div className="modal-overlay-ld" onClick={() => setShowModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: 'rgba(79, 70, 229, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--light-primary)',
                margin: '0 auto 16px'
              }}>
                <FiCopy size={26} />
              </div>
              
              <h3 className="modal-title-ld">Classroom Invite Link</h3>
              <p className="modal-subtitle-ld">
                Share this generic invitation link with teachers. When clicked, teachers will request to join this classroom. You can approve or reject requests in the <strong>Join Requests</strong> tab.
              </p>

              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="form-input-ld"
                    style={{ paddingRight: '48px', textOverflow: 'ellipsis', fontWeight: '500' }}
                    type="text"
                    readOnly
                    value={inviteLink}
                  />
                  <button 
                    type="button"
                    onClick={() => copyToClipboard(inviteLink)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: copied ? 'var(--light-success)' : 'var(--light-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px'
                    }}
                  >
                    {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                  </button>
                </div>
                {copied && (
                  <span style={{ fontSize: '12px', color: 'var(--light-success)', marginTop: '6px', display: 'block', textAlign: 'left' }}>
                    Copied link to clipboard!
                  </span>
                )}
              </div>

              <button 
                type="button" 
                className="btn-ld btn-ld-primary" 
                onClick={() => setShowModal(false)}
                style={{ width: '100%' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ClassroomDetails;
