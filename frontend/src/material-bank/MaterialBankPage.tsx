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
  FiFile,
  FiList,
  FiGrid
} from 'react-icons/fi';
import { materialBankService } from './services/materialBankService';
import type { MaterialBankFolder, MaterialBankItem, BreadcrumbItem } from './types/materialBank.types';
import type { RootState } from '../store';
import { getServerUrl } from '../services/api';
import { CreateFolderModal } from './components/CreateFolderModal';
import { UploadFileModal } from './components/UploadFileModal';
import { UploadFolderModal } from './components/UploadFolderModal';
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
  const [viewMode, setViewMode] = useState<'list' | 'box'>('list');

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [isUploadFolderOpen, setIsUploadFolderOpen] = useState(false);
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
              Create, manage, and clone organization quiz templates (MCQ & Subjective) to assign across classrooms.
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
              className="btn-ld btn-ld-secondary"
              onClick={() => setIsUploadFolderOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiFolder size={18} />
              <span>+ Upload Folder</span>
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

        {/* Breadcrumb Navigation */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '12px 16px', 
          backgroundColor: 'var(--light-card)', 
          borderRadius: '8px', 
          border: '1px solid var(--light-border)', 
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
              color: currentFolderId === null ? 'var(--light-primary)' : 'var(--light-text-secondary)',
              fontWeight: currentFolderId === null ? '700' : '500'
            }}
          >
            <FiHome size={16} />
            <span>Material Bank</span>
          </button>

          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <FiChevronRight size={14} style={{ color: 'var(--light-text-muted)' }} />
              <button
                onClick={() => handleBreadcrumbClick(crumb.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: currentFolderId === crumb.id ? 'var(--light-primary)' : 'var(--light-text-secondary)',
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

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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

            {/* List / Box View Toggle */}
            <div style={{
              display: 'inline-flex',
              backgroundColor: 'var(--light-table-header-bg)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--light-border)',
              gap: '2px'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: viewMode === 'list' ? '700' : '500',
                  backgroundColor: viewMode === 'list' ? 'var(--light-card)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="List View"
              >
                <FiList size={16} />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('box')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: viewMode === 'box' ? '700' : '500',
                  backgroundColor: viewMode === 'box' ? 'var(--light-card)' : 'transparent',
                  color: viewMode === 'box' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  boxShadow: viewMode === 'box' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Box (Grid) View"
              >
                <FiGrid size={16} />
                <span>Box</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Loading State */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--light-card)', borderRadius: '12px', border: '1px solid var(--light-border)' }}>
            <span className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--light-primary)' }}></span>
            <p style={{ marginTop: '12px', color: 'var(--light-text-secondary)', fontSize: '14px' }}>Loading materials...</p>
          </div>
        ) : filteredFolders.length === 0 && filteredItems.length === 0 ? (
          /* Empty State */
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            backgroundColor: 'var(--light-card)', 
            borderRadius: '12px', 
            border: '1px dashed var(--light-border)' 
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 16px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--light-table-header-bg)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--light-text-muted)'
            }}>
              <FiFolder size={32} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: 'var(--light-text-primary)' }}>
              No folders or files yet
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--light-text-secondary)', maxWidth: '420px', marginInline: 'auto' }}>
              Start building your Material Bank by creating a folder, uploading files, or adding YouTube video links above.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                className="btn-ld btn-ld-secondary"
                onClick={() => setIsCreateFolderOpen(true)}
              >
                + Create Folder
              </button>
              <button 
                className="btn-ld btn-ld-secondary"
                onClick={() => setIsUploadFolderOpen(true)}
              >
                + Upload Folder
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
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--light-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Folders ({filteredFolders.length})
                </h3>
                {viewMode === 'list' ? (
                  <div style={{
                    backgroundColor: 'var(--light-card)',
                    borderRadius: '10px',
                    border: '1px solid var(--light-border)',
                    overflowX: 'auto',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--light-table-header-bg)', borderBottom: '1px solid var(--light-border)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Folder Name
                          </th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>
                            Type
                          </th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px', textAlign: 'right' }}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFolders.map((folder, idx) => (
                          <tr
                            key={folder.id}
                            onClick={() => handleOpenFolder(folder.id)}
                            style={{
                              borderBottom: idx === filteredFolders.length - 1 ? 'none' : '1px solid var(--light-border)',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--light-table-hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                  padding: '8px', 
                                  borderRadius: '6px', 
                                  backgroundColor: 'rgba(79, 70, 229, 0.08)', 
                                  color: 'var(--light-primary)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  <FiFolder size={18} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--light-text-primary)' }}>
                                  {folder.name}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                              Folder
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--light-text-muted)',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                                title="Delete Folder"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
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
                          backgroundColor: 'var(--light-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--light-border)',
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
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--light-border)';
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
                          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--light-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {folder.name}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--light-text-muted)',
                            padding: '6px',
                            borderRadius: '4px',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                          title="Delete Folder"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Items Section */}
            {filteredItems.length > 0 && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--light-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Files & Links ({filteredItems.length})
                </h3>
                {viewMode === 'list' ? (
                  <div style={{
                    backgroundColor: 'var(--light-card)',
                    borderRadius: '10px',
                    border: '1px solid var(--light-border)',
                    overflowX: 'auto',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--light-table-header-bg)', borderBottom: '1px solid var(--light-border)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Material Name
                          </th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>
                            Uploaded By
                          </th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '130px' }}>
                            Type
                          </th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px', textAlign: 'right' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, idx) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: idx === filteredItems.length - 1 ? 'none' : '1px solid var(--light-border)',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--light-table-hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                  padding: '8px', 
                                  borderRadius: '6px', 
                                  backgroundColor: item.type === 'youtube' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                  color: item.type === 'youtube' ? '#ef4444' : '#3b82f6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  flexShrink: 0
                                }}>
                                  {item.type === 'youtube' ? <FiYoutube size={18} /> : <FiFileText size={18} />}
                                </div>
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--light-text-primary)',
                                    maxWidth: '380px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                              {item.uploader?.name || 'Teacher'}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: item.type === 'youtube' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: item.type === 'youtube' ? '#ef4444' : '#3b82f6'
                              }}>
                                {item.type === 'youtube' ? 'YouTube' : 'File'}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
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
                                      gap: '4px',
                                      padding: '4px 6px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    <FiVideo size={15} />
                                    <span>Watch</span>
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
                                      gap: '4px',
                                      textDecoration: 'none',
                                      padding: '4px 6px',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    <FiExternalLink size={15} />
                                    <span>View</span>
                                  </a>
                                )}

                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--light-text-muted)',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                                  title="Delete Material"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
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
                          backgroundColor: 'var(--light-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--light-border)',
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
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: 'var(--light-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </h4>
                            <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', display: 'block' }}>
                              Uploaded by {item.uploader?.name || 'Teacher'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--light-border)' }}>
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
                              color: 'var(--light-text-muted)',
                              padding: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                            title="Delete Material"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      <UploadFolderModal
        isOpen={isUploadFolderOpen}
        onClose={() => setIsUploadFolderOpen(false)}
        currentFolderId={currentFolderId}
        onUploadComplete={() => loadContents(currentFolderId)}
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
