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
    <div className="auth-page-wrapper" style={{
      background: 'radial-gradient(ellipse at bottom, #0d1d30 0%, #050a12 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <style>{`
        .master-glow-card {
          position: relative;
          background: rgba(10, 20, 38, 0.65) !important;
          border: 1px solid rgba(0, 180, 216, 0.2) !important;
          box-shadow: 0 0 40px rgba(0, 180, 216, 0.15), inset 0 0 15px rgba(0, 180, 216, 0.05) !important;
          backdrop-filter: blur(16px);
          max-width: 440px;
          width: 100%;
          border-radius: 24px;
          padding: 40px;
        }

        .master-glow-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, rgba(0, 180, 216, 0.4), transparent 40%, transparent 60%, rgba(79, 70, 229, 0.4));
          border-radius: 24px;
          z-index: -1;
          pointer-events: none;
        }

        .master-input:focus {
          border-color: #00b4d8 !important;
          box-shadow: 0 0 10px rgba(0, 180, 216, 0.3) !important;
        }

        .btn-master {
          background: linear-gradient(135deg, #00b4d8 0%, #4f46e5 100%) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 4px 20px rgba(0, 180, 216, 0.3) !important;
          transition: all 0.3s ease !important;
        }

        .btn-master:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0, 180, 216, 0.5) !important;
          filter: brightness(1.1);
        }

        .btn-master:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <div className="master-glow-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/dwp-logo.png" 
            alt="DWP Logo" 
            className="dwp-auth-header-logo" 
            style={{ margin: '0 auto 12px auto', display: 'block' }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'rgba(0, 180, 216, 0.1)',
            border: '1px solid rgba(0, 180, 216, 0.2)',
            color: '#00b4d8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 20px rgba(0, 180, 216, 0.2)'
          }}>
            <FiShield size={28} />
          </div>
          <h2 style={{ color: 'white', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            System Core Control
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Master Administrator Secure Access Portal
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            display: 'flex',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <FiAlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" htmlFor="email" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>
              Master Email Address
            </label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <input
                className="form-input master-input"
                type="email"
                id="email"
                placeholder="master@system.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: 'white',
                  paddingLeft: '40px',
                  height: '46px',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
              <FiMail className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="password" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: '600' }}>
              Security Keyphrase
            </label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <input
                className="form-input master-input"
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: 'white',
                  paddingLeft: '40px',
                  height: '46px',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
              <FiLock className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>

          <button className="btn btn-master" type="submit" disabled={loading} style={{
            width: '100%',
            height: '46px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
            {loading ? (
              <span className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%' }}></span>
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
