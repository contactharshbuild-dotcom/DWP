import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn, FiAlertCircle, FiShield } from 'react-icons/fi';
import type { RootState } from '../store';
import { setLoading, setError, setCredentials } from '../store/authSlice';
import api from '../services/api';

const MasterAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user, loading, error } = useSelector((state: RootState) => state.auth);

  // Clear errors on mount
  useEffect(() => {
    dispatch(setError(null));
  }, [dispatch]);

  // Redirect if already logged in as masteradmin
  useEffect(() => {
    if (token && user?.role === 'masteradmin') {
      navigate('/master-admin');
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      dispatch(setError('Please fill in all fields.'));
      return;
    }

    // High security boundary: Ensure only the official master admin email attempts login here
    if (email.trim().toLowerCase() !== 'harshkumbhare75@gmail.com') {
      dispatch(setError('Unauthorized access. Invalid Master Admin credentials.'));
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: userToken, user: loggedUser, organization } = response.data;

      if (loggedUser.role !== 'masteradmin') {
        dispatch(setError('Access Denied. You do not have master administrator privileges.'));
        return;
      }

      dispatch(setCredentials({ token: userToken, user: loggedUser, organization: organization || null }));
      navigate('/master-admin');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      dispatch(setError(errMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glass-card" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img 
            src="/dwp-logo.png" 
            alt="DWP Logo" 
            className="dwp-auth-header-logo" 
            style={{ margin: '0 auto 12px auto', display: 'block' }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: '#e0e7ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <FiShield size={26} />
          </div>
          <h2 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.4px', marginBottom: '6px' }}>
            System Core Control
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px' }}>
            Master Administrator Secure Access Portal
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Master Email Address
            </label>
            <div className="input-wrapper">
              <input
                className="form-input"
                type="email"
                id="email"
                placeholder="master@system.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FiMail className="input-icon" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">
              Security Keyphrase
            </label>
            <div className="input-wrapper">
              <input
                className="form-input"
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <FiLogIn size={18} />
                <span>Verify & Authorize</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MasterAdminLogin;
