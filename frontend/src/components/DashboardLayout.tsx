import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiPlus, 
  FiLogOut, 
  FiBookOpen, 
  FiAlertCircle,
  FiHelpCircle,
  FiFolder,
  FiCamera,
  FiUpload,
  FiEdit2,
  FiCheck,
  FiX
} from 'react-icons/fi';
import type { RootState } from '../store';
import { logout, updateOrganization, updateUserProfile } from '../store/authSlice';
import api from '../services/api';
import { useClassrooms } from './ClassroomContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, organization } = useSelector((state: RootState) => state.auth);
  const { classrooms, loadingClassrooms, fetchClassrooms } = useClassrooms();

  // Create Classroom Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Organization Logo Modal State
  const [showOrgLogoModal, setShowOrgLogoModal] = useState(false);
  const [logoInputType, setLogoInputType] = useState<'upload' | 'url'>('upload');
  const [customLogoUrl, setCustomLogoUrl] = useState(organization?.logo_url || organization?.logoUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(organization?.logo_url || organization?.logoUrl || null);
  const [orgSaveLoading, setOrgSaveLoading] = useState(false);
  const [orgModalError, setOrgModalError] = useState<string | null>(null);
  const [orgModalSuccess, setOrgModalSuccess] = useState<string | null>(null);

  // User Profile Picture Modal State (for Students, Teachers, & Admins)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [userAvatarInputType, setUserAvatarInputType] = useState<'upload' | 'url'>('upload');
  const [userCustomAvatarUrl, setUserCustomAvatarUrl] = useState(user?.profile_url || user?.profileUrl || '');
  const [userSelectedFile, setUserSelectedFile] = useState<File | null>(null);
  const [userAvatarPreview, setUserAvatarPreview] = useState<string | null>(user?.profile_url || user?.profileUrl || null);
  const [userProfileSaving, setUserProfileSaving] = useState(false);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [userProfileSuccess, setUserProfileSuccess] = useState<string | null>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleCreateClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !classSubject) {
      setCreateError('Classroom name and subject are required.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const response = await api.post('/classrooms', {
        name: className,
        subject: classSubject
      });
      const newClassroom = response.data.classroom;
      
      setShowCreateModal(false);
      setClassName('');
      setClassSubject('');
      
      await fetchClassrooms();
      navigate(`/classrooms/${newClassroom.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create classroom.';
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  // Helper to extract initials for avatar
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle File Selection for Org Logo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB Limit
      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setOrgModalError(`File "${file.name}" is ${sizeMB} MB, which exceeds the 5MB limit. Please choose a smaller image.`);
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setOrgModalError(null);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Organization Logo
  const handleSaveOrgLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaveLoading(true);
    setOrgModalError(null);
    setOrgModalSuccess(null);

    try {
      let finalLogoUrl = customLogoUrl;

      if (logoInputType === 'upload') {
        if (!selectedFile && !currentOrgLogo) {
          setOrgModalError('Please select a logo image file to upload.');
          setOrgSaveLoading(false);
          return;
        }

        if (selectedFile) {
          const formData = new FormData();
          formData.append('logo', selectedFile);

          const uploadRes = await api.post('/organization/upload-logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalLogoUrl = uploadRes.data.logo_url || uploadRes.data.logoUrl;
        }
      } else {
        const updateRes = await api.put('/organization/my-organization', {
          logo_url: finalLogoUrl
        });
        finalLogoUrl = updateRes.data.organization?.logo_url || updateRes.data.organization?.logoUrl || finalLogoUrl;
      }

      dispatch(updateOrganization({
        logo_url: finalLogoUrl,
        logoUrl: finalLogoUrl
      }));

      setOrgModalSuccess('Organization logo updated successfully!');
      setTimeout(() => {
        setShowOrgLogoModal(false);
        setOrgModalSuccess(null);
      }, 1200);
    } catch (err: any) {
      setOrgModalError(err.response?.data?.message || 'Failed to update organization logo. Make sure the file is under 5MB.');
    } finally {
      setOrgSaveLoading(false);
    }
  };

  // Handle User Avatar File Selection
  const handleUserAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB Limit
      if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setUserProfileError(`File "${file.name}" is ${sizeMB} MB, which exceeds the 5MB limit. Please choose a smaller image.`);
        setUserSelectedFile(null);
        e.target.value = '';
        return;
      }
      setUserProfileError(null);
      setUserSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save User Profile Picture (Student, Teacher, Admin)
  const handleSaveUserProfilePicture = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfileSaving(true);
    setUserProfileError(null);
    setUserProfileSuccess(null);

    try {
      let finalAvatarUrl = userCustomAvatarUrl;

      if (userAvatarInputType === 'upload') {
        if (!userSelectedFile && !currentProfileLogo) {
          setUserProfileError('Please select an avatar image file to upload.');
          setUserProfileSaving(false);
          return;
        }

        if (userSelectedFile) {
          const formData = new FormData();
          formData.append('avatar', userSelectedFile);

          const uploadRes = await api.post('/auth/upload-avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          finalAvatarUrl = uploadRes.data.profile_url || uploadRes.data.profileUrl;
        }
      } else {
        const updateRes = await api.put('/auth/profile', {
          profile_url: finalAvatarUrl
        });
        finalAvatarUrl = updateRes.data.user?.profile_url || updateRes.data.user?.profileUrl || finalAvatarUrl;
      }

      dispatch(updateUserProfile({
        profile_url: finalAvatarUrl,
        profileUrl: finalAvatarUrl
      }));

      setUserProfileSuccess('Profile picture updated successfully!');
      setTimeout(() => {
        setShowUserProfileModal(false);
        setUserProfileSuccess(null);
      }, 1200);
    } catch (err: any) {
      setUserProfileError(err.response?.data?.message || 'Failed to update profile picture. Make sure the file is under 5MB.');
    } finally {
      setUserProfileSaving(false);
    }
  };

  const currentOrgLogo = organization?.logo_url || organization?.logoUrl;
  const currentProfileLogo = user?.profile_url || user?.profileUrl;

  return (
    <div className="light-dashboard">
      <div className="ld-container">
        {/* Left Sidebar */}
        <aside className="ld-sidebar">
          <div className="ld-sidebar-top">

            {/* Organization Logo & Details Section */}
            <div className="ld-logo-section">
              <div className="ld-org-logo-wrapper">
                {currentOrgLogo ? (
                  <img 
                    src={currentOrgLogo} 
                    alt={organization?.name || 'Org Logo'} 
                    className="ld-org-logo-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="ld-logo-icon">
                    {getInitials(organization?.name)}
                  </div>
                )}
                
                {user?.role === 'admin' && (
                  <button 
                    className="ld-org-logo-edit-badge"
                    onClick={() => {
                      setPreviewUrl(currentOrgLogo || null);
                      setCustomLogoUrl(currentOrgLogo || '');
                      setSelectedFile(null);
                      setOrgModalError(null);
                      setOrgModalSuccess(null);
                      setShowOrgLogoModal(true);
                    }}
                    title="Change Organization Logo"
                  >
                    <FiCamera size={11} />
                  </button>
                )}
              </div>

              <div className="ld-org-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="ld-org-name">{organization?.name || 'Academy'}</span>
                  {user?.role === 'admin' && (
                    <button 
                      className="ld-org-edit-btn"
                      onClick={() => {
                        setPreviewUrl(currentOrgLogo || null);
                        setCustomLogoUrl(currentOrgLogo || '');
                        setSelectedFile(null);
                        setOrgModalError(null);
                        setOrgModalSuccess(null);
                        setShowOrgLogoModal(true);
                      }}
                      title="Organization Logo Settings"
                    >
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="ld-nav">
              <span className="ld-nav-label">Menu</span>
              <Link 
                to="/" 
                className={`ld-nav-item ${location.pathname === '/' ? 'active' : ''}`}
              >
                <FiHome size={18} />
                <span>Overview</span>
              </Link>
              
              {user?.role !== 'student' && (
                <Link 
                  to="/teachers" 
                  className={`ld-nav-item ${location.pathname === '/teachers' ? 'active' : ''}`}
                >
                  <FiUsers size={18} />
                  <span>Teachers</span>
                </Link>
              )}

              {user?.role !== 'student' && (
                <>
                  <Link 
                    to="/quiz-builder" 
                    className={`ld-nav-item ${location.pathname === '/quiz-builder' ? 'active' : ''}`}
                  >
                    <FiHelpCircle size={18} />
                    <span>Quiz Builder</span>
                  </Link>

                  <Link 
                    to="/material-bank" 
                    className={`ld-nav-item ${location.pathname === '/material-bank' ? 'active' : ''}`}
                  >
                    <FiFolder size={18} />
                    <span>Material Bank</span>
                  </Link>
                </>
              )}

              {/* Classrooms Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
                <span className="ld-nav-label" style={{ margin: 0 }}>Classrooms</span>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setShowCreateModal(true);
                      setCreateError(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--light-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    title="Create Classroom"
                  >
                    <FiPlus size={16} />
                  </button>
                )}
              </div>

              {/* Sidebar Classrooms List */}
              <div className="ld-sidebar-classrooms">
                {loadingClassrooms && classrooms.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '12px', color: 'var(--light-text-muted)', textAlign: 'center' }}>
                    Loading...
                  </div>
                ) : classrooms.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--light-text-muted)', fontStyle: 'italic' }}>
                    No classrooms
                  </div>
                ) : (
                  classrooms.map((cls) => {
                    const isActive = location.pathname === `/classrooms/${cls.id}`;
                    return (
                      <Link
                        key={cls.id}
                        to={`/classrooms/${cls.id}`}
                        className={`ld-nav-item ${isActive ? 'active' : ''}`}
                        style={{ padding: '8px 12px' }}
                      >
                        <FiBookOpen size={16} style={{ flexShrink: 0 }} />
                        <div className="ld-classroom-item-sub">
                          <span className="ld-classroom-item-sub-title">{cls.name}</span>
                          <span className="ld-classroom-item-sub-id">ID: {cls.classroom_id}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </nav>
          </div>

          {/* User Profile Footer & Logout */}
          <div className="ld-sidebar-footer">
            <div className="ld-user-card">
              {/* User Profile Avatar with Edit Badge */}
              <div 
                className="ld-user-avatar-wrapper"
                onClick={() => {
                  setUserAvatarPreview(currentProfileLogo || null);
                  setUserCustomAvatarUrl(currentProfileLogo || '');
                  setUserSelectedFile(null);
                  setUserProfileError(null);
                  setUserProfileSuccess(null);
                  setShowUserProfileModal(true);
                }}
                title="Change Profile Picture"
              >
                {currentProfileLogo ? (
                  <img 
                    src={currentProfileLogo} 
                    alt={user?.name || 'User Profile'} 
                    className="ld-user-avatar-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="ld-avatar">
                    {getInitials(user?.name)}
                  </div>
                )}
                <div className="ld-user-avatar-edit-badge">
                  <FiCamera size={10} />
                </div>
              </div>

              <div className="ld-user-info">
                <span className="ld-username">{user?.name}</span>
                <span className="ld-useremail" style={{ textTransform: 'capitalize' }}>
                  {user?.role} • {user?.email}
                </span>
              </div>
            </div>
            
            <button 
              className="btn-ld btn-ld-secondary btn-ld-small" 
              onClick={handleLogout}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FiLogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className="ld-main">
          {children}
        </main>
      </div>

      {/* User Profile Picture Modal (Student, Teacher, Admin) */}
      {showUserProfileModal && (
        <div className="modal-overlay-ld" onClick={() => setShowUserProfileModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0 }}>My Profile Logo / Avatar</h3>
              <button 
                onClick={() => setShowUserProfileModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            <p className="modal-subtitle-ld">Upload or change profile picture for <strong>{user?.name}</strong> ({user?.role}).</p>

            {userProfileError && (
              <div className="alert-ld alert-ld-error">
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{userProfileError}</span>
              </div>
            )}

            {userProfileSuccess && (
              <div className="alert-ld alert-ld-success">
                <FiCheck size={18} style={{ flexShrink: 0 }} />
                <span>{userProfileSuccess}</span>
              </div>
            )}

            {/* Profile Avatar Live Preview */}
            <div className="org-logo-modal-preview-box" style={{ borderRadius: '50%', width: '90px', height: '90px' }}>
              {userAvatarPreview ? (
                <img src={userAvatarPreview} alt="Avatar Preview" className="org-logo-modal-preview-img" style={{ borderRadius: '50%' }} />
              ) : (
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--light-primary)' }}>
                  {getInitials(user?.name)}
                </div>
              )}
            </div>

            {/* Input Type Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                className={`btn-ld ${userAvatarInputType === 'upload' ? 'btn-ld-primary' : 'btn-ld-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '13px', border: 'none' }}
                onClick={() => setUserAvatarInputType('upload')}
              >
                <FiUpload size={14} style={{ marginRight: '6px' }} />
                Upload File
              </button>
              <button
                type="button"
                className={`btn-ld ${userAvatarInputType === 'url' ? 'btn-ld-primary' : 'btn-ld-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '13px', border: 'none' }}
                onClick={() => setUserAvatarInputType('url')}
              >
                <FiEdit2 size={14} style={{ marginRight: '6px' }} />
                Image URL
              </button>
            </div>

            <form onSubmit={handleSaveUserProfilePicture}>
              {userAvatarInputType === 'upload' ? (
                <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                  <label 
                    className="org-logo-upload-dropzone" 
                    htmlFor="userAvatarFileInput"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}
                  >
                    <FiUpload size={28} style={{ color: 'var(--light-primary)', marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--light-text-primary)' }}>
                      {userSelectedFile ? userSelectedFile.name : 'Click to select image file'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--light-text-muted)', marginTop: '4px' }}>
                      PNG, JPG, WEBP or SVG (Max 5MB)
                    </div>
                  </label>
                  <input
                    id="userAvatarFileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleUserAvatarFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                  <label className="form-label-ld" htmlFor="userCustomAvatarUrl">Direct Profile Image URL</label>
                  <input
                    className="form-input-ld"
                    type="url"
                    id="userCustomAvatarUrl"
                    placeholder="https://example.com/avatar.png"
                    value={userCustomAvatarUrl}
                    onChange={(e) => {
                      setUserCustomAvatarUrl(e.target.value);
                      setUserAvatarPreview(e.target.value || null);
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setShowUserProfileModal(false)}
                  disabled={userProfileSaving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={userProfileSaving}
                >
                  {userProfileSaving ? 'Saving...' : 'Save Profile Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organization Logo & Branding Modal */}
      {showOrgLogoModal && (
        <div className="modal-overlay-ld" onClick={() => setShowOrgLogoModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0 }}>Organization Logo</h3>
              <button 
                onClick={() => setShowOrgLogoModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            <p className="modal-subtitle-ld">Upload or update the official logo for <strong>{organization?.name}</strong>.</p>

            {orgModalError && (
              <div className="alert-ld alert-ld-error">
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{orgModalError}</span>
              </div>
            )}

            {orgModalSuccess && (
              <div className="alert-ld alert-ld-success">
                <FiCheck size={18} style={{ flexShrink: 0 }} />
                <span>{orgModalSuccess}</span>
              </div>
            )}

            {/* Logo Live Preview Box */}
            <div className="org-logo-modal-preview-box">
              {previewUrl ? (
                <img src={previewUrl} alt="Logo Preview" className="org-logo-modal-preview-img" />
              ) : (
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--light-primary)' }}>
                  {getInitials(organization?.name)}
                </div>
              )}
            </div>

            {/* Input Type Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                className={`btn-ld ${logoInputType === 'upload' ? 'btn-ld-primary' : 'btn-ld-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '13px', border: 'none' }}
                onClick={() => setLogoInputType('upload')}
              >
                <FiUpload size={14} style={{ marginRight: '6px' }} />
                Upload Image
              </button>
              <button
                type="button"
                className={`btn-ld ${logoInputType === 'url' ? 'btn-ld-primary' : 'btn-ld-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '13px', border: 'none' }}
                onClick={() => setLogoInputType('url')}
              >
                <FiEdit2 size={14} style={{ marginRight: '6px' }} />
                Image URL
              </button>
            </div>

            <form onSubmit={handleSaveOrgLogo}>
              {logoInputType === 'upload' ? (
                <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                  <label 
                    className="org-logo-upload-dropzone" 
                    htmlFor="orgLogoFileInput"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}
                  >
                    <FiUpload size={28} style={{ color: 'var(--light-primary)', marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--light-text-primary)' }}>
                      {selectedFile ? selectedFile.name : 'Click to select logo file'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--light-text-muted)', marginTop: '4px' }}>
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
              ) : (
                <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                  <label className="form-label-ld" htmlFor="customLogoUrl">Direct Logo Image URL</label>
                  <input
                    className="form-input-ld"
                    type="url"
                    id="customLogoUrl"
                    placeholder="https://example.com/logo.png"
                    value={customLogoUrl}
                    onChange={(e) => {
                      setCustomLogoUrl(e.target.value);
                      setPreviewUrl(e.target.value || null);
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setShowOrgLogoModal(false)}
                  disabled={orgSaveLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={orgSaveLoading}
                >
                  {orgSaveLoading ? 'Saving...' : 'Save Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Classroom Modal Overlay */}
      {showCreateModal && (
        <div className="modal-overlay-ld" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title-ld">Create New Classroom</h3>
            <p className="modal-subtitle-ld">Set up a new classroom like Teachmint. A unique numeric Classroom ID will be auto-generated.</p>

            {createError && (
              <div className="alert-ld alert-ld-error">
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClassroomSubmit}>
              <div className="form-group-ld">
                <label className="form-label-ld" htmlFor="className">Classroom Name *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="className"
                  placeholder="e.g. Grade 10 - Mathematics"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-ld" style={{ marginBottom: '28px' }}>
                <label className="form-label-ld" htmlFor="classSubject">Subject *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="classSubject"
                  placeholder="e.g. Algebra / Trigonometry"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
