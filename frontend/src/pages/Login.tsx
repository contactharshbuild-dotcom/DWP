import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn, FiAlertCircle, FiPhone, FiKey, FiBookOpen, FiAward, FiArrowLeft } from 'react-icons/fi';
import type { RootState } from '../store';
import { setLoading, setError, setCredentials } from '../store/authSlice';
import api from '../services/api';

const Login: React.FC = () => {
  // Selected login role
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  // Login tabs: 'otp' for teachers, 'password' for admins/students
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
      
      if (loggedUser.role === 'masteradmin') {
        dispatch(setError('Master administrators must sign in through the Master Portal (/master-login).'));
        dispatch(setLoading(false));
        return;
      }
      
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

  if (!selectedRole) {
    return (
      <div className="auth-page-wrapper">
        <style>{`
          .role-card-hover:hover {
            transform: translateY(-5px);
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
          }
        `}</style>
        <div className="glass-card" style={{ maxWidth: '640px', padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img 
              src="/dwp-logo.png" 
              alt="DWP Logo" 
              className="dwp-auth-header-logo" 
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <h2 className="form-title" style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Welcome to DWP LMS
            </h2>
            <p className="form-subtitle" style={{ fontSize: '15px' }}>
              Select your role to log in to your dashboard
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Student Card */}
            <div 
              onClick={() => {
                setSelectedRole('student');
                setLoginMethod('password');
                dispatch(setError(null));
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(5px)'
              }}
              className="role-card-hover"
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'rgba(79, 70, 229, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <FiBookOpen size={30} />
              </div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Student</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                Access courses, tests, and study materials.
              </p>
            </div>

            {/* Teacher Card */}
            <div 
              onClick={() => {
                setSelectedRole('teacher');
                setLoginMethod('password');
                dispatch(setError(null));
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(5px)'
              }}
              className="role-card-hover"
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <FiAward size={30} />
              </div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Teacher</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                Manage classes, grade tests, and review students.
              </p>
            </div>

            {/* Admin Card */}
            <div 
              onClick={() => {
                setSelectedRole('admin');
                setLoginMethod('password');
                dispatch(setError(null));
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(5px)'
              }}
              className="role-card-hover"
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <FiKey size={30} />
              </div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Admin</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                Configure organization details, approvals, and settings.
              </p>
            </div>
          </div>

          <div className="form-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', margin: '0' }}>
            Don't have an organization?{' '}
            <Link className="form-link" to="/signup">
              Register Organization
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setSelectedRole(null);
              dispatch(setError(null));
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '500',
              padding: '0',
              outline: 'none'
            }}
          >
            <FiArrowLeft size={16} />
            <span>Change Role</span>
          </button>
        </div>

        <h2 className="form-title" style={{ textTransform: 'capitalize' }}>
          {selectedRole} Login
        </h2>
        <p className="form-subtitle">
          {selectedRole === 'student' && 'Sign in to access classrooms and study materials'}
          {selectedRole === 'teacher' && 'Sign in to manage classes and grade assessments'}
          {selectedRole === 'admin' && 'Sign in using credentials to access administrator portal'}
        </p>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

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
