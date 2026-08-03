import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FiUser, 
  FiMail, 
  FiShield, 
  FiBriefcase, 
  FiCamera, 
  FiUpload, 
  FiEdit2, 
  FiCheck, 
  FiAlertCircle,
  FiSave,
  FiHash,
  FiCalendar
} from 'react-icons/fi';
import type { RootState } from '../store';
import { updateUserProfile } from '../store/authSlice';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

const UserProfile: React.FC = () => {
  const dispatch = useDispatch();
  const { user, organization } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [batch, setBatch] = useState(user?.batch || '');
  const [profileUrl, setProfileUrl] = useState(user?.profile_url || user?.profileUrl || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.profile_url || user?.profileUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper to extract initials
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
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full Name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let finalAvatarUrl = profileUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('avatar', selectedFile);

        const uploadRes = await api.post('/auth/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalAvatarUrl = uploadRes.data.profile_url || uploadRes.data.profileUrl;
      }

      const updateRes = await api.put('/auth/profile', {
        name,
        batch,
        profile_url: finalAvatarUrl
      });

      const updatedUser = updateRes.data.user || {};

      dispatch(updateUserProfile({
        name: updatedUser.name || name,
        batch: updatedUser.batch || batch,
        profile_url: finalAvatarUrl,
        profileUrl: finalAvatarUrl
      }));

      setSuccess('User profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || user?.profile_url || user?.profileUrl;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="ld-header">
        <div className="ld-header-left">
          <h2 className="ld-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUser style={{ color: 'var(--light-primary)' }} />
            <span>User Profile</span>
          </h2>
          <span className="ld-subtitle">View and manage your personal account details and profile avatar.</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Column: Avatar & Summary Card */}
        <div className="ld-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ position: 'relative', margin: '16px 0 20px' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              border: '3px solid var(--light-primary)',
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f1f5f9'
            }}>
              {currentAvatar ? (
                <img 
                  src={currentAvatar} 
                  alt={name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <span style={{ fontSize: '36px', fontWeight: 700, color: 'var(--light-primary)' }}>
                  {getInitials(name || user?.name)}
                </span>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--light-text-primary)', marginBottom: '4px' }}>
            {user?.name}
          </h3>
          
          <span className="badge-ld badge-ld-primary" style={{ textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
            {user?.role}
          </span>

          <div style={{ width: '100%', borderTop: '1px solid var(--light-border)', paddingTop: '16px', marginTop: '8px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)', marginBottom: '12px' }}>
              <FiMail size={16} style={{ color: 'var(--light-primary)' }} />
              <span style={{ wordBreak: 'break-all' }}>{user?.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)', marginBottom: '12px' }}>
              <FiBriefcase size={16} style={{ color: 'var(--light-primary)' }} />
              <span>{organization?.name || 'Academy Organization'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
              <FiShield size={16} style={{ color: 'var(--light-success)' }} />
              <span>Status: <strong style={{ color: 'var(--light-success)' }}>Active Account</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="ld-card">
          <div className="ld-card-header">
            <h3 className="ld-card-title">
              <FiEdit2 size={18} style={{ color: 'var(--light-primary)' }} />
              <span>Basic Profile Details</span>
            </h3>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="userFullName">Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="userFullName"
                    type="text"
                    className="form-input-ld"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="userEmail">Email Address (Account Identifier)</label>
                <input
                  id="userEmail"
                  type="email"
                  className="form-input-ld"
                  value={user?.email || ''}
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: 'var(--light-text-muted)', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="userRole">Account Role</label>
                <input
                  id="userRole"
                  type="text"
                  className="form-input-ld"
                  value={(user?.role || '').toUpperCase()}
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: 'var(--light-text-muted)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="userBatch">Batch / Academic Group</label>
                <input
                  id="userBatch"
                  type="text"
                  className="form-input-ld"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="e.g. 2026 Batch / Class A"
                />
              </div>
            </div>

            {/* Profile Avatar Upload Section */}
            <div style={{ borderTop: '1px solid var(--light-border)', paddingTop: '20px', marginTop: '24px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--light-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiCamera style={{ color: 'var(--light-primary)' }} />
                <span>Profile Picture Upload</span>
              </h4>

              <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                <label 
                  className="org-logo-upload-dropzone" 
                  htmlFor="profileAvatarFileInput"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'pointer' }}
                >
                  <FiUpload size={24} style={{ color: 'var(--light-primary)', marginBottom: '6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--light-text-primary)' }}>
                    {selectedFile ? selectedFile.name : 'Click to select profile avatar image'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--light-text-muted)', marginTop: '2px' }}>
                    Supports PNG, JPG, WEBP or SVG (Max 5MB)
                  </div>
                </label>
                <input
                  id="profileAvatarFileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="submit"
                className="btn-ld btn-ld-primary"
                disabled={saving}
              >
                <FiSave size={16} />
                <span>{saving ? 'Saving Profile...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;
