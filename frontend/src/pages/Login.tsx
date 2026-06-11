import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import type { RootState } from '../store';
import { setLoading, setError, setCredentials } from '../store/authSlice';
import api from '../services/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, loading, error } = useSelector((state: RootState) => state.auth);

  // Clear errors on mount
  useEffect(() => {
    dispatch(setError(null));
  }, [dispatch]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      dispatch(setError('Please fill in all fields.'));
      return;
    }

    dispatch(setLoading(true));
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: userToken, user, organization } = response.data;
      
      dispatch(setCredentials({ token: userToken, user, organization }));
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      dispatch(setError(errMsg));
    }
  };

  return (
    <div className="glass-card">
      <h2 className="form-title">Welcome Back</h2>
      <p className="form-subtitle">Sign in to access your LMS organization portal</p>

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <input
              className="form-input"
              type="email"
              id="email"
              placeholder="name@organization.com"
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

      <div className="form-footer">
        Don't have an organization?{' '}
        <Link className="form-link" to="/signup">
          Register Organization
        </Link>
      </div>
    </div>
  );
};

export default Login;
