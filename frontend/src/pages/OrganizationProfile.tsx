import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FiBriefcase, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCamera, 
  FiUpload, 
  FiEdit2, 
  FiCheck, 
  FiAlertCircle, 
  FiSave,
  FiUsers,
  FiBookOpen,
  FiInfo,
  FiShield,
  FiTag
} from 'react-icons/fi';
import type { RootState } from '../store';
import { updateOrganization } from '../store/authSlice';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

const OrganizationProfile: React.FC = () => {
  const dispatch = useDispatch();
  const { user, organization } = useSelector((state: RootState) => state.auth);

  const isAdmin = user?.role === 'admin';

  // Form states initialized from Redux state or fetched org details
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [orgEmail, setOrgEmail] = useState(organization?.email || '');
  const [orgPhone, setOrgPhone] = useState(organization?.phone || '');
  const [orgAddress, setOrgAddress] = useState(organization?.address || '');
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url || organization?.logoUrl || '');
  
  const [logoPreview, setLogoPreview] = useState<string | null>(organization?.logo_url || organization?.logoUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [classroomsCount, setClassroomsCount] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch full organization profile & statistics
  const fetchOrgDetails = async () => {
    try {
      const res = await api.get('/organization/my-organization');
      if (res.data?.organization) {
        const org = res.data.organization;
        setOrgName(org.name || '');
        setOrgEmail(org.email || '');
        setOrgPhone(org.phone || '');
        setOrgAddress(org.address || '');
        const currentLogo = org.logo_url || org.logoUrl || '';
        setLogoUrl(currentLogo);
        setLogoPreview(currentLogo || null);
      }
    } catch (err) {
      console.error('Error fetching org profile:', err);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [teachersRes, classroomsRes] = await Promise.allSettled([
        api.get('/teachers'),
        api.get('/classrooms')
      ]);

      if (teachersRes.status === 'fulfilled' && teachersRes.value.data?.teachers) {
        setTeachersCount(teachersRes.value.data.teachers.length);
      }
      if (classroomsRes.status === 'fulfilled' && classroomsRes.value.data?.classrooms) {
        setClassroomsCount(classroomsRes.value.data.classrooms.length);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchOrgDetails();
    fetchStats();
  }, []);

  const getInitials = (str: string = '') => {
    return str
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB Limit
      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setError(`File "${file.name}" is ${sizeMB} MB, which exceeds the 5MB limit. Please choose a smaller image.`);
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setError(null);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!orgName.trim()) {
      setError('Organization name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let finalLogoUrl = logoUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('logo', selectedFile);

        const uploadRes = await api.post('/organization/upload-logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalLogoUrl = uploadRes.data.logo_url || uploadRes.data.logoUrl;
      }

      const updateRes = await api.put('/organization/my-organization', {
        name: orgName,
        email: orgEmail,
        phone: orgPhone,
        address: orgAddress,
        logo_url: finalLogoUrl
      });

      const updatedOrg = updateRes.data.organization || {};

      dispatch(updateOrganization({
        name: updatedOrg.name || orgName,
        email: updatedOrg.email || orgEmail,
        phone: updatedOrg.phone || orgPhone,
        address: updatedOrg.address || orgAddress,
        logo_url: finalLogoUrl,
        logoUrl: finalLogoUrl
      }));

      setSuccess('Organization profile and details updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update organization profile.');
    } finally {
      setSaving(false);
    }
  };

  const currentLogo = logoPreview || organization?.logo_url || organization?.logoUrl;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="ld-header">
        <div className="ld-header-left">
          <h2 className="ld-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiInfo style={{ color: 'var(--light-primary)' }} />
            <span>About Organization</span>
          </h2>
          <span className="ld-subtitle">Organization profile, academy contact information, and overview.</span>
        </div>
      </div>

      {error && (
        <div className="alert-ld alert-ld-error" style={{ marginBottom: '20px' }}>
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-ld alert-ld-success" style={{ marginBottom: '20px' }}>
          <FiCheck size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Organization Overview Stats Row */}
      <div className="ld-stats-grid">
        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
            <FiBriefcase />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{organization?.name || 'Academy'}</span>
            <span className="ld-stat-label">Organization Name</span>
          </div>
        </div>

        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--light-success)' }}>
            <FiUsers />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{loadingStats ? '...' : teachersCount}</span>
            <span className="ld-stat-label">Total Staff / Teachers</span>
          </div>
        </div>

        <div className="ld-stat-card">
          <div className="ld-stat-icon-wrapper" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: 'var(--light-warning)' }}>
            <FiBookOpen />
          </div>
          <div className="ld-stat-info">
            <span className="ld-stat-value">{loadingStats ? '...' : classroomsCount}</span>
            <span className="ld-stat-label">Active Classrooms</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Column: Logo & Branding Card */}
        <div className="ld-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ position: 'relative', margin: '16px 0 20px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              border: '2px solid var(--light-border)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc'
            }}>
              {currentLogo ? (
                <img 
                  src={currentLogo} 
                  alt={orgName} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--light-primary)' }}>
                  {getInitials(orgName || organization?.name)}
                </span>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--light-text-primary)', marginBottom: '4px' }}>
            {organization?.name || 'Academy'}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <FiTag size={13} style={{ color: 'var(--light-text-muted)' }} />
            <span style={{ fontSize: '13px', color: 'var(--light-text-muted)', fontFamily: 'monospace' }}>
              ID: {organization?.slug || organization?.id || 'org-id'}
            </span>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid var(--light-border)', paddingTop: '16px', marginTop: '8px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)', marginBottom: '12px' }}>
              <FiMail size={16} style={{ color: 'var(--light-primary)', flexShrink: 0 }} />
              <span style={{ wordBreak: 'break-all' }}>{orgEmail || 'No email specified'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)', marginBottom: '12px' }}>
              <FiPhone size={16} style={{ color: 'var(--light-primary)', flexShrink: 0 }} />
              <span>{orgPhone || 'No phone specified'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)', marginBottom: '12px' }}>
              <FiMapPin size={16} style={{ color: 'var(--light-primary)', flexShrink: 0 }} />
              <span>{orgAddress || 'No campus address specified'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
              <FiShield size={16} style={{ color: 'var(--light-success)', flexShrink: 0 }} />
              <span>Status: <strong style={{ color: 'var(--light-success)' }}>Active Institution</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Organization Details Form */}
        <div className="ld-card">
          <div className="ld-card-header">
            <h3 className="ld-card-title">
              <FiBriefcase size={18} style={{ color: 'var(--light-primary)' }} />
              <span>Organization Details</span>
            </h3>
            {!isAdmin && (
              <span className="badge-ld badge-ld-secondary">Read-Only View</span>
            )}
          </div>

          <form onSubmit={handleSaveOrganization}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="orgNameInput">Organization / Academy Name *</label>
                <input
                  id="orgNameInput"
                  type="text"
                  className="form-input-ld"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme International School"
                  disabled={!isAdmin}
                  required
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="orgSlugInput">Organization Code / Slug</label>
                <input
                  id="orgSlugInput"
                  type="text"
                  className="form-input-ld"
                  value={organization?.slug || ''}
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: 'var(--light-text-muted)', cursor: 'not-allowed', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="orgEmailInput">Official Contact Email</label>
                <input
                  id="orgEmailInput"
                  type="email"
                  className="form-input-ld"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  placeholder="contact@academy.com"
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="orgPhoneInput">Phone Number</label>
                <input
                  id="orgPhoneInput"
                  type="tel"
                  className="form-input-ld"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="form-group-ld" style={{ marginBottom: '20px' }}>
              <label className="form-label-ld" htmlFor="orgAddressInput">Campus / Office Address</label>
              <textarea
                id="orgAddressInput"
                className="form-input-ld"
                rows={2}
                value={orgAddress}
                onChange={(e) => setOrgAddress(e.target.value)}
                placeholder="123 Education Way, Tech District, City"
                disabled={!isAdmin}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Logo Settings (Admin Only) */}
            {isAdmin && (
              <div style={{ borderTop: '1px solid var(--light-border)', paddingTop: '20px', marginTop: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--light-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiCamera style={{ color: 'var(--light-primary)' }} />
                  <span>Organization Branding Logo Upload</span>
                </h4>

                <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                  <label 
                    className="org-logo-upload-dropzone" 
                    htmlFor="orgLogoFileInput"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'pointer' }}
                  >
                    <FiUpload size={24} style={{ color: 'var(--light-primary)', marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--light-text-primary)' }}>
                      {selectedFile ? selectedFile.name : 'Click to select organization logo image'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--light-text-muted)', marginTop: '2px' }}>
                      Supports PNG, JPG, WEBP or SVG (Max 5MB)
                    </div>
                  </label>
                  <input
                    id="orgLogoFileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            )}

            {isAdmin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="submit"
                  className="btn-ld btn-ld-primary"
                  disabled={saving}
                >
                  <FiSave size={16} />
                  <span>{saving ? 'Saving Details...' : 'Save Organization Details'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrganizationProfile;
