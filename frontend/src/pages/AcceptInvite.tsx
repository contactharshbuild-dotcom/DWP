import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiLock, FiUserCheck, FiAlertCircle, FiUser, FiMail, FiPhone } from 'react-icons/fi';
import type { RootState } from '../store';
import { setLoading, setError, setCredentials, logout } from '../store/authSlice';
import api from '../services/api';

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Invitation info
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [invitedRole, setInvitedRole] = useState('');
  
  // Form state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);
 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token: authSessionToken, loading, error } = useSelector((state: RootState) => state.auth);
 
  // If already logged in, log out to allow accepting invitation
  useEffect(() => {
    if (authSessionToken) {
      dispatch(logout());
    }
  }, [authSessionToken, dispatch]);
 
  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValidationError('Invitation token is missing from the URL.');
        setValidatingToken(false);
        return;
      }
 
      try {
        const response = await api.get(`/invitations/details?token=${token}`);
        setTeacherName(response.data.name);
        setTeacherEmail(response.data.email);
        setInvitedRole(response.data.role || 'teacher');
        setOrgName(response.data.organizationName);
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Invalid or expired invitation link.';
        setTokenValidationError(msg);
      } finally {
        setValidatingToken(false);
      }
    };
 
    validateToken();
    dispatch(setError(null));
  }, [token, dispatch]);
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
 
    if (!password || !confirmPassword) {
      dispatch(setError('Please enter and confirm your password.'));
      return;
    }
 
    if (password !== confirmPassword) {
      dispatch(setError('Passwords do not match.'));
      return;
    }
 
    if (password.length < 6) {
      dispatch(setError('Password must be at least 6 characters long.'));
      return;
    }

    if (invitedRole === 'student' && !phone) {
      dispatch(setError('Phone number is required.'));
      return;
    }
 
    dispatch(setLoading(true));
    try {
      const response = await api.post('/invitations/accept', {
        token,
        password,
        phone: invitedRole === 'student' ? phone : undefined
      });
 
      const { token: loginToken, user, organization } = response.data;
 
      // Set credentials to authenticate user
      dispatch(setCredentials({ token: loginToken, user, organization }));
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to complete registration.';
      dispatch(setError(msg));
    }
  };

  if (validatingToken) {
    return (
      <div className="auth-page-wrapper">
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
        </div>
      </div>
    );
  }

  if (tokenValidationError) {
    return (
      <div className="auth-page-wrapper">
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--error)',
            margin: '0 auto 20px'
          }}>
            <FiAlertCircle size={32} />
          </div>
          <h3 className="form-title" style={{ fontSize: '24px' }}>Invitation Error</h3>
          <p className="form-subtitle" style={{ marginBottom: '24px' }}>{tokenValidationError}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="glass-card">
        <h2 className="form-title">Join {orgName}</h2>
        <p className="form-subtitle">
          {invitedRole === 'student' 
            ? 'Create your student account to get started' 
            : 'Create your teacher account password to get started'}
        </p>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrapper">
              <input
                className="form-input"
                style={{ background: 'rgba(255, 255, 255, 0.01)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                type="text"
                readOnly
                value={teacherName}
              />
              <FiUser className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <input
                className="form-input"
                style={{ background: 'rgba(255, 255, 255, 0.01)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                type="email"
                readOnly
                value={teacherEmail}
              />
              <FiMail className="input-icon" />
            </div>
          </div>

          {invitedRole === 'student' && (
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number *</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="tel"
                  id="phone"
                  placeholder="e.g. +1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <FiPhone className="input-icon" />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="password">Set Password *</label>
            <div className="input-wrapper">
              <input
                className="form-input"
                type="password"
                id="password"
                placeholder="•••••••• (Min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FiLock className="input-icon" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="confirmPassword">Confirm Password *</label>
            <div className="input-wrapper">
              <input
                className="form-input"
                type="password"
                id="confirmPassword"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <FiLock className="input-icon" />
            </div>
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <FiUserCheck size={18} />
                <span>Complete Setup</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvite;
