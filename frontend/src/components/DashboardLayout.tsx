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
  FiX,
  FiInfo,
  FiTrash2
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

  // Delete Classroom Modal State
  const [deleteClassroomTarget, setDeleteClassroomTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Rename Classroom Modal State
  const [renameClassroomTarget, setRenameClassroomTarget] = useState<{ id: number; name: string; subject?: string } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameSubject, setRenameSubject] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Organization Logo Modal State
  const [showOrgLogoModal, setShowOrgLogoModal] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState(organization?.logo_url || organization?.logoUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(organization?.logo_url || organization?.logoUrl || null);
  const [orgSaveLoading, setOrgSaveLoading] = useState(false);
  const [orgModalError, setOrgModalError] = useState<string | null>(null);
  const [orgModalSuccess, setOrgModalSuccess] = useState<string | null>(null);

  // User Profile Picture Modal State (for Students, Teachers, & Admins)
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
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

  const handleDeleteClassroom = async () => {
    if (!deleteClassroomTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/classrooms/${deleteClassroomTarget.id}`);
      const isViewingDeleted = location.pathname === `/classrooms/${deleteClassroomTarget.id}`;
      setDeleteClassroomTarget(null);
      await fetchClassrooms();
      if (isViewingDeleted) {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.response?.data?.message || 'Failed to delete classroom.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRenameClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameClassroomTarget) return;
    if (!renameName.trim()) {
      setRenameError('Classroom name is required.');
      return;
    }

    setRenameLoading(true);
    setRenameError(null);
    try {
      await api.put(`/classrooms/${renameClassroomTarget.id}`, {
        name: renameName.trim(),
        subject: renameSubject.trim() || undefined
      });
      setRenameClassroomTarget(null);
      await fetchClassrooms();
    } catch (err: any) {
      console.error(err);
      setRenameError(err.response?.data?.message || 'Failed to rename classroom.');
    } finally {
      setRenameLoading(false);
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
            <div 
              className="ld-logo-section"
              onClick={() => {
                if (user?.role === 'admin') navigate('/about');
              }}
              style={{ cursor: user?.role === 'admin' ? 'pointer' : 'default' }}
              title={user?.role === 'admin' ? 'View Organization Details (About)' : undefined}
            >
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
                    onClick={(e) => {
                      e.stopPropagation();
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

              {user?.role === 'admin' && (
                <Link 
                  to="/about" 
                  className={`ld-nav-item ${location.pathname === '/about' ? 'active' : ''}`}
                >
                  <FiInfo size={18} />
                  <span>About</span>
                </Link>
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
                      <div 
                        key={cls.id} 
                        style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '2px' }}
                      >
                        <Link
                          to={`/classrooms/${cls.id}`}
                          className={`ld-nav-item ${isActive ? 'active' : ''}`}
                          style={{ padding: '8px 12px', flex: 1, minWidth: 0, textDecoration: 'none' }}
                        >
                          <FiBookOpen size={16} style={{ flexShrink: 0 }} />
                          <div className="ld-classroom-item-sub">
                            <span className="ld-classroom-item-sub-title">{cls.name}</span>
                            <span className="ld-classroom-item-sub-id">ID: {cls.classroom_id}</span>
                          </div>
                        </Link>
                        {user?.role === 'admin' && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setRenameError(null);
                                setRenameName(cls.name);
                                setRenameSubject(cls.subject || '');
                                setRenameClassroomTarget({ id: cls.id, name: cls.name, subject: cls.subject });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--light-text-secondary)',
                                cursor: 'pointer',
                                padding: '6px 4px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.6,
                                transition: 'opacity 0.2s'
                              }}
                              title={`Rename ${cls.name}`}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setDeleteError(null);
                                setDeleteClassroomTarget({ id: cls.id, name: cls.name });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '6px 6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.6,
                                transition: 'opacity 0.2s'
                              }}
                              title={`Delete ${cls.name}`}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
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
                onClick={() => navigate('/profile')}
                style={{ cursor: 'pointer' }}
                title="View User Profile"
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
                <div 
                  className="ld-user-avatar-edit-badge"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserAvatarPreview(currentProfileLogo || null);
                    setUserCustomAvatarUrl(currentProfileLogo || '');
                    setUserSelectedFile(null);
                    setUserProfileError(null);
                    setUserProfileSuccess(null);
                    setShowUserProfileModal(true);
                  }}
                  title="Quick Avatar Change"
                >
                  <FiCamera size={10} />
                </div>
              </div>

              <div 
                className="ld-user-info"
                onClick={() => navigate('/profile')}
                style={{ cursor: 'pointer' }}
                title="View User Profile"
              >
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

            <form onSubmit={handleSaveUserProfilePicture} style={{ marginTop: '16px' }}>
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

            <form onSubmit={handleSaveOrgLogo} style={{ marginTop: '16px' }}>
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

      {/* Rename Classroom Modal Overlay */}
      {renameClassroomTarget && (
        <div className="modal-overlay-ld" onClick={() => setRenameClassroomTarget(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit2 size={20} style={{ color: 'var(--light-primary)' }} />
                <span>Rename Classroom</span>
              </h3>
              <button 
                onClick={() => setRenameClassroomTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="modal-subtitle-ld" style={{ marginBottom: '20px' }}>
              Update the name or subject for this classroom.
            </p>

            {renameError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{renameError}</span>
              </div>
            )}

            <form onSubmit={handleRenameClassroomSubmit}>
              <div className="form-group-ld" style={{ marginBottom: '16px' }}>
                <label className="form-label-ld" htmlFor="renameClassName">Classroom Name *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="renameClassName"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  placeholder="e.g. Mathematics Grade 10"
                  required
                />
              </div>

              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <label className="form-label-ld" htmlFor="renameClassSubject">Subject</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="renameClassSubject"
                  value={renameSubject}
                  onChange={(e) => setRenameSubject(e.target.value)}
                  placeholder="e.g. Algebra / Trigonometry"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setRenameClassroomTarget(null)}
                  disabled={renameLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={renameLoading}
                >
                  {renameLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation Modal Overlay */}
      {deleteClassroomTarget && (
        <div className="modal-overlay-ld" onClick={() => setDeleteClassroomTarget(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle size={22} />
                <span>Delete Classroom</span>
              </h3>
              <button 
                onClick={() => setDeleteClassroomTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="modal-subtitle-ld" style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong>{deleteClassroomTarget.name}</strong>? All associated modules, resources, and test data will be removed.
            </p>

            {deleteError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-ld btn-ld-secondary" 
                onClick={() => setDeleteClassroomTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-ld" 
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}
                onClick={handleDeleteClassroom}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
