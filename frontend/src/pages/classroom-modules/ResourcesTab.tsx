import React from 'react';
import { 
  FiChevronRight, FiPlus, FiYoutube, FiFolderPlus, FiUploadCloud, 
  FiFolder, FiTrash2, FiFileText, FiImage, FiVideo, FiLink, FiPaperclip, FiExternalLink 
} from 'react-icons/fi';

interface Folder {
  id: number;
  name: string;
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
  handleDeleteResource: (resourceId: number) => void;
  openAssignModal: (type: 'material', item: Resource) => void;
  isPreviewable: (res: Resource) => boolean;
  setPreviewResource: (res: Resource) => void;
  onOpenAddModal: (type: 'file' | 'link') => void;
  onOpenFolderModal: () => void;
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
  handleDeleteResource,
  openAssignModal,
  isPreviewable,
  setPreviewResource,
  onOpenAddModal,
  onOpenFolderModal
}) => {
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
              {folders.find(f => f.id === currentFolderId)?.name || 'Folder'}
            </span>
          </>
        )}
      </div>

      {/* Management Actions - Teachers/Admin only */}
      {user?.role !== 'student' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <button 
            className="btn-ld btn-ld-primary" 
            onClick={() => onOpenAddModal('file')}
          >
            <FiPlus size={16} />
            <span>Add File</span>
          </button>
          <button 
            className="btn-ld btn-ld-secondary" 
            onClick={() => onOpenAddModal('link')}
          >
            <FiYoutube size={16} />
            <span>Add YouTube / Link</span>
          </button>
          <button 
            className="btn-ld btn-ld-secondary" 
            onClick={onOpenFolderModal}
          >
            <FiFolderPlus size={16} />
            <span>New Folder</span>
          </button>
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
            style={{ cursor: 'pointer', display: 'block' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <FiUploadCloud size={40} style={{ color: 'var(--light-primary)' }} />
              <h4 style={{ fontWeight: '600', color: 'var(--light-text)' }}>Drag and drop files here, or <span style={{ color: 'var(--light-primary)', textDecoration: 'underline' }}>browse</span></h4>
              <p style={{ fontSize: '12px', color: 'var(--light-text-secondary)' }}>Supports PDF, PPT, Word, Excel, ZIP, MP4, WebM (Max 50MB)</p>
            </div>
          </label>
        </div>
      )}

      {/* Folders and Files Display */}
      {resourcesLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '30px', height: '30px' }}></span>
        </div>
      ) : currentFolders.length === 0 && currentResources.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
          <FiFolder size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
          <h4>This folder is empty</h4>
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
              {currentFolders.map((folder) => (
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
                      <button
                        className="btn-ld btn-ld-danger btn-ld-small"
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                        title="Delete folder"
                      >
                        <FiTrash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Files/Links */}
              {currentResources.map((res) => {
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

                const fullLink = res.drive_link.startsWith('/uploads/') 
                  ? `http://localhost:5000${res.drive_link}` 
                  : res.drive_link;

                return (
                  <tr key={`resource-${res.id}`}>
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
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {isPreviewable(res) && (
                          <button
                            onClick={() => setPreviewResource(res)}
                            className="btn-ld btn-ld-secondary btn-ld-small"
                          >
                            <span>Preview</span>
                          </button>
                        )}
                        <a 
                          href={fullLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-ld btn-ld-secondary btn-ld-small"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          <FiExternalLink size={12} />
                          <span>Open</span>
                        </a>
                        {(user?.role === 'admin' || user?.role === 'teacher') && (
                          <button
                            className="btn-ld btn-ld-primary btn-ld-small"
                            onClick={() => openAssignModal('material', res)}
                          >
                            <span>Assign</span>
                          </button>
                        )}
                        {(user?.role === 'admin' || res.uploader?.id === user?.id) && (
                          <button
                            className="btn-ld btn-ld-danger btn-ld-small"
                            onClick={() => handleDeleteResource(res.id)}
                          >
                            <FiTrash2 size={12} />
                            <span>Delete</span>
                          </button>
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
    </div>
  );
};
