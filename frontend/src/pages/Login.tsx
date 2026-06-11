import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn, FiAlertCircle, FiPhone, FiKey } from 'react-icons/fi';
import type { RootState } from '../store';
import { setLoading, setError, setCredentials } from '../store/authSlice';
import api from '../services/api';

const Login: React.FC = () => {
  // Login tabs: 'otp' for teachers, 'password' for admins
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');

  // Traditional password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP login state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpHelp, setOtpHelp] = useState<string | null>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user, loading, error } = useSelector((state: RootState) => state.auth);

  // Clear errors on mount
  useEffect(() => {
    dispatch(setError(null));
  }, [dispatch]);

  // If already logged in, check for redirects or go to dashboard
  useEffect(() => {
    if (token) {
      const pendingClassroomId = localStorage.getItem('pending_join_classroom_id');
      if (pendingClassroomId && user?.role === 'teacher') {
        navigate(`/join-classroom/${pendingClassroomId}`);
      } else {
        navigate('/');
      }
    }
  }, [token, user, navigate]);

  // Traditional password login submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      dispatch(setError('Please fill in all fields.'));
      return;
    }

    dispatch(setLoading(true));
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: userToken, user: loggedUser, organization } = response.data;
      
      dispatch(setCredentials({ token: userToken, user: loggedUser, organization }));
      
      const pendingClassroomId = localStorage.getItem('pending_join_classroom_id');
      if (pendingClassroomId && loggedUser.role === 'teacher') {
        navigate(`/join-classroom/${pendingClassroomId}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      dispatch(setError(errMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // OTP request submit
  const handleSendOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!phone) {
      dispatch(setError('Please enter your phone number.'));
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await api.post('/auth/send-otp', { phone });
      setOtpSent(true);
      setOtpHelp(response.data.otpCode);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to send OTP code.';
      dispatch(setError(errMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // OTP login verification submit
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !otp) {
      dispatch(setError('Please enter your phone number and OTP code.'));
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp });
      const { token: userToken, user: loggedUser, organization } = response.data;

      dispatch(setCredentials({ token: userToken, user: loggedUser, organization }));

      const pendingClassroomId = localStorage.getItem('pending_join_classroom_id');
      if (pendingClassroomId && loggedUser.role === 'teacher') {
        navigate(`/join-classroom/${pendingClassroomId}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Invalid OTP code.';
      dispatch(setError(errMsg));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glass-card">
        <h2 className="form-title">Welcome Back</h2>
        <p className="form-subtitle">Sign in to access your LMS organization portal</p>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Segmented Login Control */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              background: loginMethod === 'otp' ? 'var(--primary)' : 'transparent',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            onClick={() => { dispatch(setError(null)); setLoginMethod('otp'); }}
          >
            Teacher OTP Login
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              background: loginMethod === 'password' ? 'var(--primary)' : 'transparent',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            onClick={() => { dispatch(setError(null)); setLoginMethod('password'); }}
          >
            Admin Password Login
          </button>
        </div>

        {/* OTP Login Form */}
        {loginMethod === 'otp' && (
          <form onSubmit={handleVerifyOtpSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <div className="input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    className="form-input"
                    type="tel"
                    id="phone"
                    placeholder="e.g. +1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={otpSent}
                  />
                  <FiPhone className="input-icon" />
                </div>
                {!otpSent && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flexShrink: 0, padding: '0 16px', margin: 0, height: '42px' }}
                    onClick={handleSendOtp}
                    disabled={loading || !phone}
                  >
                    Send OTP
                  </button>
                )}
              </div>
            </div>

            {otpSent && (
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" htmlFor="otp">OTP Code</label>
                <div className="input-wrapper">
                  <input
                    className="form-input"
                    type="text"
                    id="otp"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <FiKey className="input-icon" />
                </div>
                {otpHelp && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '6px', textAlign: 'left' }}>
                    🧪 Testing OTP: <strong style={{ color: 'white' }}>{otpHelp}</strong>
                  </span>
                )}
              </div>
            )}

            {otpSent && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setOtpSent(false);
                    setOtpHelp(null);
                    setOtp('');
                    dispatch(setError(null));
                  }}
                >
                  Change Phone
                </button>
                <button className="btn" type="submit" style={{ flex: 2 }} disabled={loading}>
                  {loading ? <span className="spinner"></span> : <span>Log In</span>}
                </button>
              </div>
            )}
          </form>
        )}

        {/* Traditional Password Login Form */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email, Phone, or Username</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="text"
                  id="email"
                  placeholder="Email, phone number, or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <FiMail className="input-icon" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label" htmlFor="password">Password</label>
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
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="form-footer">
          Don't have an organization?{' '}
          <Link className="form-link" to="/signup">
            Register Organization
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
