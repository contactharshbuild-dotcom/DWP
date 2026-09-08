import React, { useState, useEffect, useRef } from 'react';
import { 
  FiChevronRight, FiPlus, FiYoutube, FiFolderPlus, FiUploadCloud, 
  FiFolder, FiTrash2, FiFileText, FiImage, FiVideo, FiLink, FiPaperclip, FiExternalLink, FiDownloadCloud,
  FiChevronDown, FiEdit2, FiX, FiMoreVertical, FiShare2
} from 'react-icons/fi';
import { getServerUrl } from '../../services/api';


interface Folder {
  id: number;
  name: string;
  order_index?: number;
  created_at: string;
}

interface Resource {
  id: number;
  name: string;
  drive_file_id: string | null;
  drive_link: string;
  mime_type: string;
  folder_id: number | null;
  module_session: string | null;
  visibility: string;
  batch: string | null;
  assigned_student_ids?: number[];
  order_index?: number;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
}

interface ResourcesTabProps {
  user: { id: number; role: string } | null;
  currentFolderId: number | null;
  setCurrentFolderId: (id: number | null) => void;
  folders: Folder[];
  currentFolders: Folder[];
  currentResources: Resource[];
  resourcesLoading: boolean;
  dragActive: boolean;
  showAddModal: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteFolder: (folderId: number, e: React.MouseEvent) => void;
  handleRenameFolder?: (folderId: number, newName: string) => Promise<any>;
  handleDeleteResource: (resourceId: number) => void;
  openAssignModal: (type: 'material' | 'folder', item: any) => void;
  isPreviewable: (res: Resource) => boolean;
  setPreviewResource: (res: Resource) => void;
  onOpenAddModal: (type: 'file' | 'link') => void;
  onOpenFolderModal: () => void;
  onOpenImportBankModal?: () => void;
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({
  user,
  currentFolderId,
  setCurrentFolderId,
  folders,
  currentFolders,
  currentResources,
  resourcesLoading,
  dragActive,
  showAddModal,
  handleDrag,
  handleDrop,
  handleFileChange,
  handleDeleteFolder,
  handleRenameFolder,
  handleDeleteResource,
  openAssignModal,
  isPreviewable,
  setPreviewResource,
  onOpenAddModal,
  onOpenFolderModal,
  onOpenImportBankModal
}) => {
  // Rename Folder modal state
  const [renameTargetFolder, setRenameTargetFolder] = useState<Folder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renameFolderLoading, setRenameFolderLoading] = useState(false);
  const [renameFolderError, setRenameFolderError] = useState<string | null>(null);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTargetFolder || !handleRenameFolder) return;
    if (!renameFolderName.trim()) {
      setRenameFolderError('Folder name is required.');
      return;
    }
    if (renameFolderName.trim() === renameTargetFolder.name.trim()) {
      setRenameTargetFolder(null);
      return;
    }

    setRenameFolderLoading(true);
    setRenameFolderError(null);
    try {
      await handleRenameFolder(renameTargetFolder.id, renameFolderName.trim());
      setRenameTargetFolder(null);
    } catch (err: any) {
      setRenameFolderError(err.response?.data?.message || err.message || 'Failed to rename folder.');
    } finally {
      setRenameFolderLoading(false);
    }
  };

  // Dropdown menu state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Row action three-dots menu state
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveActionMenu(null);
      }
    };

    if (activeActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeActionMenu]);

  // Sort resources & folders by order_index to match exact Material Bank display order
  const sortedResources = [...currentResources].sort((a, b) => {
    const orderA = a.order_index ?? 0;
    const orderB = b.order_index ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return 0;
  });

  const sortedFolders = [...currentFolders].sort((a, b) => {
    const orderA = a.order_index ?? 0;
    const orderB = b.order_index ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return 0;
  });

  return (
    <div>
      {/* Breadcrumb path navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>
        <span 
          style={{ color: currentFolderId === null ? 'var(--light-text)' : 'var(--light-primary)', cursor: currentFolderId === null ? 'default' : 'pointer' }}
          onClick={() => setCurrentFolderId(null)}
        >
          Materials
        </span>
        {currentFolderId !== null && (
          <>
            <FiChevronRight size={14} style={{ color: 'var(--light-text-muted)' }} />
            <span style={{ color: 'var(--light-text)' }}>
              {folders.find(f => Number(f.id) === Number(currentFolderId))?.name || 'Folder'}
            </span>
          </>
        )}
      </div>

      {/* Management Actions - Teachers/Admin only */}
      {user?.role !== 'student' && (
        <div style={{ marginBottom: '20px' }}>
          <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              type="button"
              className="btn-ld btn-ld-primary" 
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiPlus size={18} />
              <span>+ Add New</span>
              <FiChevronDown
                size={16}
                style={{
                  transition: 'transform 0.2s ease',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '240px',
                  backgroundColor: 'var(--light-card)',
                  border: '1px solid var(--light-border)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  padding: '6px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onOpenAddModal('file');
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)', display: 'flex', alignItems: 'center' }}>
                    <FiPlus size={16} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)' }}>
                    Add File
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenAddModal('link');
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                    <FiYoutube size={16} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                    Add YouTube / Link
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenFolderModal();
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center' }}>
                    <FiFolderPlus size={16} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)' }}>
                    New Folder
                  </span>
                </button>

                {onOpenImportBankModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImportBankModal();
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)', display: 'flex', alignItems: 'center' }}>
                      <FiDownloadCloud size={16} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-primary)' }}>
                      Import from Material Bank
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Dropzone/Upload Box */}
      {user?.role !== 'student' && !showAddModal && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: dragActive ? '2px dashed var(--light-primary)' : '2px dashed var(--light-border)',
            backgroundColor: dragActive ? 'var(--light-primary-glow)' : 'var(--light-bg-hover)',
            borderRadius: '12px',
            padding: '30px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            marginBottom: '24px'
          }}
        >
          <input 
            type="file" 
            id="resource-file-upload" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.mp4,.webm"
          />
          <label 
            htmlFor="resource-file-upload" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
          >
            <FiUploadCloud size={32} style={{ color: 'var(--light-primary)' }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--light-text-primary)' }}>
              Drag & drop files here, or <span style={{ color: 'var(--light-primary)' }}>browse</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--light-text-muted)' }}>
              Supports PDF, PPT, Word, Excel, ZIP, Videos (up to 5MB)
            </span>
          </label>
        </div>
      )}

      {/* Content Table / List */}
      {resourcesLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--light-text-secondary)' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)' }}></span>
          <p style={{ marginTop: '10px', fontSize: '13px' }}>Loading materials...</p>
        </div>
      ) : currentFolders.length === 0 && currentResources.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: 'var(--light-card)', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiFolder size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4 style={{ color: 'var(--light-text-primary)' }}>
            {currentFolderId === null ? 'No materials or folders yet' : 'This folder is empty'}
          </h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Share study materials, notes, recordings, or web links here.</p>
        </div>
      ) : (
        <div className="ld-table-container">
          <table className="ld-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Module / Session</th>
                {user?.role !== 'student' && <th>Visibility</th>}
                <th>Uploaded By</th>
                <th>Upload Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {sortedFolders.map((folder) => (
                <tr 
                  key={`folder-${folder.id}`} 
                  onClick={() => setCurrentFolderId(folder.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FiFolder style={{ color: '#d97706', flexShrink: 0 }} size={20} />
                      <span>{folder.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '500' }}>FOLDER</span>
                  </td>
                  <td>—</td>
                  {user?.role !== 'student' && <td>—</td>}
                  <td>—</td>
                  <td style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                    {new Date(folder.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    {user?.role !== 'student' && (
                      <div 
                        ref={activeActionMenu === `folder-${folder.id}` ? actionMenuRef : undefined}
                        style={{ position: 'relative', display: 'inline-block' }}
                      >
                        <button
                          type="button"
                          className="btn-ld btn-ld-secondary btn-ld-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenu(activeActionMenu === `folder-${folder.id}` ? null : `folder-${folder.id}`);
                          }}
                          style={{
                            padding: '5px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px'
                          }}
                          title="Folder actions"
                        >
                          <FiMoreVertical size={16} />
                        </button>

                        {activeActionMenu === `folder-${folder.id}` && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              minWidth: '150px',
                              backgroundColor: 'var(--light-card, #fff)',
                              border: '1px solid var(--light-border, #e2e8f0)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              zIndex: 100,
                              padding: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            {handleRenameFolder && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameTargetFolder(folder);
                                  setRenameFolderName(folder.name);
                                  setRenameFolderError(null);
                                  setActiveActionMenu(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  background: 'none',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: 'var(--light-text-primary)',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <FiEdit2 size={14} style={{ color: 'var(--light-primary)' }} />
                                <span>Rename</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                openAssignModal('folder', folder);
                                setActiveActionMenu(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: 'var(--light-text-primary)',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <FiShare2 size={14} style={{ color: '#6366f1' }} />
                              <span>Assign</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                handleDeleteFolder(folder.id, e);
                                setActiveActionMenu(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#ef4444',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <FiTrash2 size={14} style={{ color: '#ef4444' }} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* Files/Links */}
              {sortedResources.map((res) => {
                const isPDF = res.mime_type === 'application/pdf' || res.name.toLowerCase().endsWith('.pdf');
                const isImage = res.mime_type.startsWith('image/');
                const isVideo = res.mime_type.startsWith('video/') || res.name.toLowerCase().endsWith('.mp4') || res.name.toLowerCase().endsWith('.webm');
                const isYouTube = res.mime_type === 'youtube';

                const uploadDate = new Date(res.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                const serverUrl = getServerUrl();
                const fullLink = res.drive_link.startsWith('/uploads/') 
                  ? `${serverUrl}${res.drive_link}` 
                  : res.drive_link;

                return (
                  <tr 
                    key={`resource-${res.id}`}
                    onClick={() => setPreviewResource(res)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isYouTube ? (
                          <FiYoutube style={{ color: '#ef4444', flexShrink: 0 }} size={18} />
                        ) : isPDF ? (
                          <FiFileText style={{ color: '#8b5cf6', flexShrink: 0 }} size={18} />
                        ) : isImage ? (
                          <FiImage style={{ color: '#10b981', flexShrink: 0 }} size={18} />
                        ) : isVideo ? (
                          <FiVideo style={{ color: '#6366f1', flexShrink: 0 }} size={18} />
                        ) : res.mime_type === 'url' ? (
                          <FiLink style={{ color: '#3b82f6', flexShrink: 0 }} size={18} />
                        ) : (
                          <FiPaperclip style={{ color: 'var(--light-text-secondary)', flexShrink: 0 }} size={18} />
                        )}
                        <span style={{ 
                          maxWidth: '220px', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }} title={res.name}>
                          {res.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase' }}>
                        {isYouTube ? 'YOUTUBE' : res.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </td>
                    <td>
                      {res.module_session ? (
                        <span className="badge-ld badge-ld-secondary">
                          {res.module_session}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--light-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>None</span>
                      )}
                    </td>
                    {user?.role !== 'student' && (
                      <td>
                        {res.visibility === 'hidden' ? (
                          <span className="badge-ld badge-ld-warning">Hidden</span>
                        ) : res.visibility === 'specific_batch' ? (
                          <span className="badge-ld badge-ld-primary">Batch: {res.batch}</span>
                        ) : (
                          <span className="badge-ld badge-ld-success">All Students</span>
                        )}
                      </td>
                    )}
                    <td>{res.uploader?.name}</td>
                    <td style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>{uploadDate}</td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div 
                        ref={activeActionMenu === `res-${res.id}` ? actionMenuRef : undefined}
                        style={{ position: 'relative', display: 'inline-block' }}
                      >
                        <button
                          type="button"
                          className="btn-ld btn-ld-secondary btn-ld-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenu(activeActionMenu === `res-${res.id}` ? null : `res-${res.id}`);
                          }}
                          style={{
                            padding: '5px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px'
                          }}
                          title="Actions"
                        >
                          <FiMoreVertical size={16} />
                        </button>

                        {activeActionMenu === `res-${res.id}` && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              minWidth: '150px',
                              backgroundColor: 'var(--light-card, #fff)',
                              border: '1px solid var(--light-border, #e2e8f0)',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              zIndex: 100,
                              padding: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewResource(res);
                                setActiveActionMenu(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: 'var(--light-text-primary)',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <FiVideo size={14} style={{ color: 'var(--light-primary)' }} />
                              <span>Open</span>
                            </button>

                            {(user?.role === 'admin' || user?.role === 'teacher') && (
                              <button
                                type="button"
                                onClick={() => {
                                  openAssignModal('material', res);
                                  setActiveActionMenu(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  background: 'none',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: 'var(--light-text-primary)',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light-nav-hover, #f1f5f9)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <FiShare2 size={14} style={{ color: '#6366f1' }} />
                                <span>Assign</span>
                              </button>
                            )}

                            {(user?.role === 'admin' || res.uploader?.id === user?.id) && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteResource(res.id);
                                  setActiveActionMenu(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  background: 'none',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: '#ef4444',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <FiTrash2 size={14} style={{ color: '#ef4444' }} />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename Folder Modal */}
      {renameTargetFolder && (
        <div className="modal-overlay-ld" onClick={() => setRenameTargetFolder(null)}>
          <div 
            className="modal-content-ld"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
                  <FiEdit2 size={20} />
                </div>
                <h3 className="modal-title-ld" style={{ margin: 0 }}>
                  Rename Folder
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setRenameTargetFolder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {renameFolderError && (
              <div className="alert-ld" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', marginBottom: '16px' }}>
                {renameFolderError}
              </div>
            )}

            <form onSubmit={handleRenameSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label-ld" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Folder Name *
                </label>
                <input 
                  type="text" 
                  className="input-ld"
                  placeholder="e.g., Mathematics Notes, Session 1..."
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  autoFocus
                  disabled={renameFolderLoading}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary"
                  onClick={() => setRenameTargetFolder(null)}
                  disabled={renameFolderLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary"
                  disabled={renameFolderLoading}
                >
                  {renameFolderLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
