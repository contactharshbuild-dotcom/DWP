import React, { useState, useEffect } from 'react';
import {
  FiCopy,
  FiCheck,
  FiAlertCircle,
  FiPlus,
  FiUser,
  FiClock
} from 'react-icons/fi';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

interface Teacher {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  invite_token: string | null;
  profile_url?: string | null;
  profileUrl?: string | null;
}

const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // Generated Link State
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data.teachers);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch teachers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpenModal = () => {
    setShowModal(true);
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteError(null);
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    fetchTeachers();
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) {
      setInviteError('Name and Email are required.');
      return;
    }

    setSubmitting(true);
    setInviteError(null);
    try {
      const response = await api.post('/teachers', {
        name: inviteName,
        email: inviteEmail,
        phone: invitePhone || undefined
      });
      
      setGeneratedLink(response.data.inviteLink);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send invitation.';
      setInviteError(msg);
    } finally {
      setSubmitting(false);
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="ld-header">
        <div className="ld-header-left">
          <h2 className="ld-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiUser style={{ color: 'var(--light-primary)' }} />
            <span>Manage Teachers</span>
          </h2>
          <span className="ld-subtitle">Add and configure access for your academic staff.</span>
        </div>
        <button className="btn-ld btn-ld-primary" onClick={handleOpenModal}>
          <FiPlus size={18} />
          <span>Invite Teacher</span>
        </button>
      </div>

      {error && (
        <div className="alert-ld alert-ld-error">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Teacher List Container */}
      <div className="ld-card">
        <div className="ld-card-header">
          <h3 className="ld-card-title">Teachers Directory</h3>
          <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>
            {teachers.length} staff members
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '32px', height: '32px' }}></span>
          </div>
        ) : teachers.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
            <FiUser size={48} style={{ color: 'var(--light-text-muted)', marginBottom: '16px' }} />
            <h3>No teachers added yet</h3>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Invite your first teacher to start collaborating.</p>
          </div>
        ) : (
          <div className="ld-table-container">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {teacher.profile_url || teacher.profileUrl ? (
                        <img 
                          src={teacher.profile_url || teacher.profileUrl || ''} 
                          alt={teacher.name} 
                          className="teacher-avatar-thumb"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="ld-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                          {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                        </div>
                      )}
                      <span>{teacher.name}</span>
                    </td>
                    <td>{teacher.email}</td>
                    <td>
                      {teacher.status === 'active' ? (
                        <span className="badge-ld badge-ld-success">Active</span>
                      ) : (
                        <span className="badge-ld badge-ld-warning">
                          <FiClock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      {teacher.status === 'pending' && teacher.invite_token && (
                        <button 
                          className="btn-ld btn-ld-secondary btn-ld-small" 
                          onClick={() => copyToClipboard(`http://localhost:5173/accept-invite?token=${teacher.invite_token}`)}
                        >
                          <FiCopy size={13} />
                          <span>Copy Link</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal Overlay */}
      {showModal && (
        <div className="modal-overlay-ld" onClick={handleCloseModal}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()}>
            {!generatedLink ? (
              <>
                <h3 className="modal-title-ld">Invite New Teacher</h3>
                <p className="modal-subtitle-ld">They will receive a secure registration link to set up their password.</p>

                {inviteError && (
                  <div className="alert-ld alert-ld-error">
                    <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{inviteError}</span>
                  </div>
                )}

                <form onSubmit={handleInviteSubmit}>
                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="name">Teacher Name *</label>
                    <input
                      className="form-input-ld"
                      type="text"
                      id="name"
                      placeholder="e.g. Professor Smith"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-ld">
                    <label className="form-label-ld" htmlFor="email">Email Address *</label>
                    <input
                      className="form-input-ld"
                      type="email"
                      id="email"
                      placeholder="teacher@academy.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-ld" style={{ marginBottom: '28px' }}>
                    <label className="form-label-ld" htmlFor="phone">Phone Number</label>
                    <input
                      className="form-input-ld"
                      type="tel"
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-ld btn-ld-secondary" onClick={handleCloseModal} disabled={submitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-ld btn-ld-primary" disabled={submitting}>
                      {submitting ? 'Generating...' : 'Generate Invite'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--light-success)',
                  margin: '0 auto 16px'
                }}>
                  <FiCheck size={28} />
                </div>
                <h3 className="modal-title-ld">Invitation Generated!</h3>
                <p className="modal-subtitle-ld">Share the onboarding registration link below with the teacher.</p>

                <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-input-ld"
                      style={{ paddingRight: '48px', textOverflow: 'ellipsis' }}
                      type="text"
                      readOnly
                      value={generatedLink}
                    />
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(generatedLink)}
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

                <button type="button" className="btn-ld btn-ld-primary" style={{ width: '100%' }} onClick={handleCloseModal}>
                  Close & Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Teachers;
