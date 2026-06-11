import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUserPlus,
  FiMail,
  FiPhone,
  FiCopy,
  FiCheck,
  FiArrowLeft,
  FiAlertCircle,
  FiPlus,
  FiUser,
  FiClock
} from 'react-icons/fi';
import api from '../services/api';

interface Teacher {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  invite_token: string | null;
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

  const navigate = useNavigate();

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
    <div className="dashboard-container" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '10px' }}
            onClick={() => navigate('/')}
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="dashboard-title">
            <span>Manage Teachers</span>
          </div>
        </div>
        <button className="btn" style={{ width: 'auto' }} onClick={handleOpenModal}>
          <FiPlus size={18} />
          <span>Invite Teacher</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Teacher List */}
      {loading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
        </div>
      ) : teachers.length === 0 ? (
        <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FiUser size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No teachers added yet</h3>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Invite your first teacher to start collaborating.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.01)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: 'var(--primary-glow)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--primary)'
                    }}>
                      <FiUser size={16} />
                    </div>
                    <span style={{ fontWeight: '500' }}>{teacher.name}</span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{teacher.email}</td>
                  <td style={{ padding: '16px 24px' }}>
                    {teacher.status === 'active' ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <FiClock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Pending
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {teacher.status === 'pending' && teacher.invite_token && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => copyToClipboard(`http://localhost:5173/accept-invite?token=${teacher.invite_token}`)}
                      >
                        <FiCopy size={13} style={{ marginRight: '4px' }} />
                        Copy Link
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal Overlay */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', transform: 'scale(1)' }}>
            {!generatedLink ? (
              <>
                <h3 className="form-title" style={{ fontSize: '24px' }}>Invite New Teacher</h3>
                <p className="form-subtitle">They will receive a secure registration link to create their password.</p>

                {inviteError && (
                  <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                    <FiAlertCircle size={20} />
                    <span>{inviteError}</span>
                  </div>
                )}

                <form onSubmit={handleInviteSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="name">Teacher Name *</label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="text"
                        id="name"
                        placeholder="e.g. Professor Smith"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        required
                      />
                      <FiUser className="input-icon" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email Address *</label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="email"
                        id="email"
                        placeholder="teacher@academy.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                      <FiMail className="input-icon" />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="form-label" htmlFor="phone">Phone Number</label>
                    <div className="input-wrapper">
                      <input
                        className="form-input"
                        type="tel"
                        id="phone"
                        placeholder="+1 (555) 000-0000"
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                      />
                      <FiPhone className="input-icon" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn" disabled={submitting}>
                      {submitting ? (
                        <span className="spinner"></span>
                      ) : (
                        <>
                          <FiUserPlus size={18} />
                          <span>Generate Invite</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--success)',
                  margin: '0 auto 20px'
                }}>
                  <FiCheck size={32} />
                </div>
                <h3 className="form-title" style={{ fontSize: '24px' }}>Invitation Generated!</h3>
                <p className="form-subtitle">Share the onboarding registration link below with the teacher.</p>

                <div className="form-group" style={{ marginBottom: '32px' }}>
                  <div className="input-wrapper" style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(generatedLink)}>
                    <input
                      className="form-input"
                      style={{ paddingRight: '48px', textOverflow: 'ellipsis' }}
                      type="text"
                      readOnly
                      value={generatedLink}
                    />
                    <button 
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: copied ? 'var(--success)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    </button>
                  </div>
                  {copied && (
                    <span style={{ fontSize: '12px', color: 'var(--success)', marginTop: '6px', display: 'block' }}>
                      Copied link to clipboard!
                    </span>
                  )}
                </div>

                <button type="button" className="btn" onClick={handleCloseModal}>
                  Close & Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
