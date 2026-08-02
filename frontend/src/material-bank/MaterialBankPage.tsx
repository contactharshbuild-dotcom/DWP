import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { 
  FiFolder, 
  FiFolderPlus, 
  FiUploadCloud, 
  FiYoutube, 
  FiSearch, 
  FiTrash2, 
  FiFileText, 
  FiVideo, 
  FiChevronRight, 
  FiHome,
  FiExternalLink,
  FiFile
} from 'react-icons/fi';
import { materialBankService } from './services/materialBankService';
import type { MaterialBankFolder, MaterialBankItem, BreadcrumbItem } from './types/materialBank.types';
import type { RootState } from '../store';
import { getServerUrl } from '../services/api';
import { CreateFolderModal } from './components/CreateFolderModal';
import { UploadFileModal } from './components/UploadFileModal';
import { AddYoutubeModal } from './components/AddYoutubeModal';
import { YoutubePlayerModal } from './components/YoutubePlayerModal';

export const MaterialBankPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const [folders, setFolders] = useState<MaterialBankFolder[]>([]);
  const [items, setItems] = useState<MaterialBankItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'file' | 'youtube'>('all');

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [isAddYoutubeOpen, setIsAddYoutubeOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);

  // Redirect students away from Material Bank
  useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadContents = async (folderId?: number | null) => {
    setLoading(true);
    try {
      const data = await materialBankService.getContents(folderId);
      setFolders(data.folders || []);
      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (err: any) {
      console.error('Failed to load Material Bank contents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'student') {
      loadContents(currentFolderId);
    }
  }, [user, currentFolderId]);

  const handleOpenFolder = (folderId: number) => {
    setCurrentFolderId(folderId);
  };

  const handleBreadcrumbClick = (folderId: number | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = async (name: string) => {
    await materialBankService.createFolder(name, currentFolderId);
    await loadContents(currentFolderId);
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: number, folderName: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the folder "${folderName}" and all its contents?`)) {
      try {
        await materialBankService.deleteFolder(folderId);
        await loadContents(currentFolderId);
      } catch (err: any) {
        alert('Failed to delete folder: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleUploadFile = async (file: File) => {
    await materialBankService.uploadFile(file, currentFolderId);
    await loadContents(currentFolderId);
  };

  const handleAddYoutubeLink = async (name: string, link: string) => {
    await materialBankService.addYoutubeLink(name, link, currentFolderId);
    await loadContents(currentFolderId);
  };

  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      try {
        await materialBankService.deleteItem(itemId);
        await loadContents(currentFolderId);
      } catch (err: any) {
        alert('Failed to delete item: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Filter folders and items
  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    return true;
  });

  const getFullFileUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${getServerUrl()}${url}`;
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: 'var(--light-text-primary)' }}>
              Material Bank
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--light-text-secondary)' }}>
              Store, organize, and access teaching materials, files, and YouTube videos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-ld btn-ld-secondary"
              onClick={() => setIsCreateFolderOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiFolderPlus size={18} />
              <span>+ New Folder</span>
            </button>

            <button
              className="btn-ld btn-ld-secondary"
              onClick={() => setIsAddYoutubeOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <FiYoutube size={18} />
              <span>+ Add YouTube Link</span>
            </button>

            <button
              className="btn-ld btn-ld-primary"
              onClick={() => setIsUploadFileOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiUploadCloud size={18} />
              <span>+ Upload File</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '12px 16px', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <button 
            onClick={() => handleBreadcrumbClick(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: currentFolderId === null ? 'var(--light-primary)' : '#64748b',
              fontWeight: currentFolderId === null ? '700' : '500'
            }}
          >
            <FiHome size={16} />
            <span>Material Bank</span>
          </button>

          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <FiChevronRight size={14} style={{ color: '#94a3b8' }} />
              <button
                onClick={() => handleBreadcrumbClick(crumb.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: currentFolderId === crumb.id ? 'var(--light-primary)' : '#64748b',
                  fontWeight: currentFolderId === crumb.id ? '700' : '500'
                }}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <FiSearch size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--light-text-muted)' }} />
            <input
              type="text"
              className="input-ld"
              placeholder="Search folders or materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              className="input-ld"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              style={{ width: '160px' }}
            >
              <option value="all">All Content</option>
              <option value="file">Files Only</option>
              <option value="youtube">YouTube Videos</option>
            </select>
          </div>
        </div>

        {/* Content Loading State */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--light-primary)' }}></span>
            <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>Loading materials...</p>
          </div>
        ) : filteredFolders.length === 0 && filteredItems.length === 0 ? (
          /* Empty State */
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            border: '1px dashed #cbd5e1' 
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 16px', 
              borderRadius: '50%', 
              backgroundColor: '#f1f5f9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#94a3b8'
            }}>
              <FiFolder size={32} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
              No folders or files yet
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', maxWidth: '420px', marginInline: 'auto' }}>
              Start building your Material Bank by creating a folder, uploading files, or adding YouTube video links above.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                className="btn-ld btn-ld-secondary"
                onClick={() => setIsCreateFolderOpen(true)}
              >
                + Create Folder
              </button>
              <button 
                className="btn-ld btn-ld-primary"
                onClick={() => setIsUploadFileOpen(true)}
              >
                + Upload File
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Folders Section */}
            {filteredFolders.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Folders ({filteredFolders.length})
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                  gap: '16px' 
                }}>
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => handleOpenFolder(folder.id)}
                      style={{
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--light-primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                        <div style={{ 
                          padding: '10px', 
                          borderRadius: '8px', 
                          backgroundColor: 'rgba(79, 70, 229, 0.08)', 
                          color: 'var(--light-primary)',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <FiFolder size={22} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {folder.name}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: '6px',
                          borderRadius: '4px',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        title="Delete Folder"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items Section */}
            {filteredItems.length > 0 && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Files & Links ({filteredItems.length})
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '16px' 
                }}>
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ 
                          padding: '10px', 
                          borderRadius: '8px', 
                          backgroundColor: item.type === 'youtube' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                          color: item.type === 'youtube' ? '#ef4444' : '#3b82f6',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {item.type === 'youtube' ? <FiYoutube size={22} /> : <FiFileText size={22} />}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </h4>
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>
                            Uploaded by {item.uploader?.name || 'Teacher'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        {item.type === 'youtube' ? (
                          <button
                            onClick={() => setActiveVideo({ title: item.name, url: item.file_url })}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              fontWeight: '600',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: 0
                            }}
                          >
                            <FiVideo size={16} />
                            <span>Watch Video</span>
                          </button>
                        ) : (
                          <a
                            href={getFullFileUrl(item.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--light-primary)',
                              fontWeight: '600',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              textDecoration: 'none'
                            }}
                          >
                            <FiExternalLink size={15} />
                            <span>View File</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                          title="Delete Material"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSuccess={handleCreateFolder}
      />

      <UploadFileModal
        isOpen={isUploadFileOpen}
        onClose={() => setIsUploadFileOpen(false)}
        onSuccess={handleUploadFile}
      />

      <AddYoutubeModal
        isOpen={isAddYoutubeOpen}
        onClose={() => setIsAddYoutubeOpen(false)}
        onSuccess={handleAddYoutubeLink}
      />

      {activeVideo && (
        <YoutubePlayerModal
          isOpen={!!activeVideo}
          onClose={() => setActiveVideo(null)}
          title={activeVideo.title}
          url={activeVideo.url}
        />
      )}
    </DashboardLayout>
  );
};
