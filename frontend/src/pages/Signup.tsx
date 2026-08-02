import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiBriefcase,
  FiLink,
  FiMail,
  FiPhone,
  FiMapPin,
  FiImage,
  FiUser,
  FiLock,
  FiUserPlus,
  FiAlertCircle
} from 'react-icons/fi';
import type { RootState } from '../store';
import { setLoading, setError, setCredentials } from '../store/authSlice';
import api from '../services/api';

const Signup: React.FC = () => {
  // Organization Info State
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');

  // Admin User State
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  // Auto-generate URL slug when organization name changes
  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word/space/hyphen chars
      .replace(/[\s_]+/g, '-')  // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
    setSlug(generatedSlug);
  };

  const handleSlugChange = (val: string) => {
    // Keep it slug-friendly (lowercase, alphanumeric, hyphens)
    const sanitizedVal = val
      .toLowerCase()
      .replace(/[^\w-]/g, '')
      .replace(/[\s_]+/g, '-');
    setSlug(sanitizedVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!orgName || !slug || !adminName || !email || !password) {
      dispatch(setError('Please fill in all required fields marked with *'));
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

    dispatch(setLoading(true));
    try {
      const payload = {
        orgName,
        slug,
        orgEmail: orgEmail || undefined,
        phone: phone || undefined,
        logoUrl: logoUrl || undefined,
        address: address || undefined,
        adminName,
        email,
        password
      };

      const response = await api.post('/auth/signup', payload);
      const { token: userToken, user, organization } = response.data;

      dispatch(setCredentials({ token: userToken, user, organization }));
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Registration failed. Please check details.';
      dispatch(setError(errMsg));
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glass-card wide">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img 
            src="/dwp-logo.png" 
            alt="DWP Logo" 
            className="dwp-auth-header-logo" 
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <h2 className="form-title" style={{ margin: 0 }}>Create LMS Organization</h2>
          <p className="form-subtitle">Set up your multi-tenant portal and owner account</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Organization Details */}
          <div className="section-divider">1. Organization Details</div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="orgName">Organization Name *</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="text"
                  id="orgName"
                  placeholder="e.g. Stanford Academy"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  required
                />
                <FiBriefcase className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="slug">Custom Slug / URL *</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="text"
                  id="slug"
                  placeholder="stanford-academy"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                />
                <FiLink className="input-icon" />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Your URL: {typeof window !== 'undefined' ? window.location.host : 'localhost:5173'}/org/{slug || 'slug'}
              </span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="orgEmail">Organization Email</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="email"
                  id="orgEmail"
                  placeholder="info@stanford.com"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                />
                <FiMail className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="tel"
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <FiPhone className="input-icon" />
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="logoUrl">Logo Image URL</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="url"
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
                <FiImage className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address">Address</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="text"
                  id="address"
                  placeholder="City, Country"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <FiMapPin className="input-icon" />
              </div>
            </div>
          </div>

          {/* Section 2: Admin Account Details */}
          <div className="section-divider">2. Admin Owner Account</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="adminName">Admin Full Name *</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="text"
                  id="adminName"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
                <FiUser className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Admin Email *</label>
              <div className="input-wrapper">
                <input
                  className="form-input"
                  type="email"
                  id="email"
                  placeholder="john.doe@stanford.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <FiMail className="input-icon" />
              </div>
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: '32px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password *</label>
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

            <div className="form-group">
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
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <FiUserPlus size={18} />
                <span>Create Organization</span>
              </>
            )}
          </button>
        </form>

        <div className="form-footer">
          Already have an organization admin account?{' '}
          <Link className="form-link" to="/login">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
