import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  FiChevronLeft,
  FiHome,
  FiExternalLink,
  FiFile,
  FiList,
  FiGrid,
  FiPlus,
  FiChevronDown,
  FiEdit2
} from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { materialBankService } from './services/materialBankService';
import type { MaterialBankFolder, MaterialBankItem, BreadcrumbItem } from './types/materialBank.types';
import type { RootState } from '../store';
import { getServerUrl } from '../services/api';
import { CreateFolderModal } from './components/CreateFolderModal';
import { RenameFolderModal } from './components/RenameFolderModal';
import { RenameItemModal } from './components/RenameItemModal';
import { UploadFileModal } from './components/UploadFileModal';
import { UploadFolderModal } from './components/UploadFolderModal';
import { AddYoutubeModal } from './components/AddYoutubeModal';
import { YoutubePlayerModal } from './components/YoutubePlayerModal';

export const MaterialBankPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);

  const PAGE_SIZE = 10;

  // Sync folder state and pagination with URL parameters so they persist on page refresh
  const folderParam = searchParams.get('folderId');
  const currentFolderId = folderParam && !isNaN(parseInt(folderParam, 10)) ? parseInt(folderParam, 10) : null;

  const pageParam = searchParams.get('page');
  const itemsPage = pageParam && !isNaN(parseInt(pageParam, 10)) ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const folderPageParam = searchParams.get('folderPage');
  const foldersPage = folderPageParam && !isNaN(parseInt(folderPageParam, 10)) ? Math.max(1, parseInt(folderPageParam, 10)) : 1;

  const [folders, setFolders] = useState<MaterialBankFolder[]>([]);
  const [items, setItems] = useState<MaterialBankItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFolders, setTotalFolders] = useState(0);
  const [folderTotalPages, setFolderTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'file' | 'youtube'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'box'>('list');
  const [sortBy, setSortBy] = useState<'manual' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'>('manual');

  // Drag & Drop reordering state
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<MaterialBankFolder | null>(null);
  const [renameItemTarget, setRenameItemTarget] = useState<MaterialBankItem | null>(null);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [isUploadFolderOpen, setIsUploadFolderOpen] = useState(false);
  const [isAddYoutubeOpen, setIsAddYoutubeOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);

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

  // Redirect students away from Material Bank
  useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadContents = async (
    folderId = currentFolderId,
    itemP = itemsPage,
    folderP = foldersPage,
    search = searchQuery,
    filter = filterType,
    sort = sortBy
  ) => {
    setLoading(true);
    try {
      const data = await materialBankService.getContents({
        folderId,
        page: itemP,
        limit: PAGE_SIZE,
        folderPage: folderP,
        folderLimit: PAGE_SIZE,
        search: search.trim() || undefined,
        filterType: filter !== 'all' ? filter : undefined,
        sortBy: sort !== 'manual' ? sort : undefined
      });
      setFolders(data.folders || []);
      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || []);
      setTotalItems(data.totalItems ?? (data.items || []).length);
      setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.totalItems ?? 0) / PAGE_SIZE)));
      setTotalFolders(data.totalFolders ?? (data.folders || []).length);
      setFolderTotalPages(data.folderTotalPages ?? Math.max(1, Math.ceil((data.totalFolders ?? 0) / PAGE_SIZE)));
    } catch (err: any) {
      console.error('Failed to load Material Bank contents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'student') {
      const timer = setTimeout(() => {
        loadContents(currentFolderId, itemsPage, foldersPage, searchQuery, filterType, sortBy);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [user, currentFolderId, itemsPage, foldersPage, searchQuery, filterType, sortBy]);

  const handleOpenFolder = (folderId: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('folderId', folderId.toString());
      next.delete('page');
      next.delete('folderPage');
      return next;
    });
  };

  const handleBreadcrumbClick = (folderId: number | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (folderId !== null) {
        next.set('folderId', folderId.toString());
      } else {
        next.delete('folderId');
      }
      next.delete('page');
      next.delete('folderPage');
      return next;
    });
  };

  const handleItemsPageChange = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', newPage.toString());
      } else {
        next.delete('page');
      }
      return next;
    });
  };

  const handleFoldersPageChange = (newFolderPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newFolderPage > 1) {
        next.set('folderPage', newFolderPage.toString());
      } else {
        next.delete('folderPage');
      }
      return next;
    });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (itemsPage !== 1 || foldersPage !== 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('page');
        next.delete('folderPage');
        return next;
      });
    }
  };

  const handleFilterChange = (type: 'all' | 'file' | 'youtube') => {
    setFilterType(type);
    if (itemsPage !== 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('page');
        return next;
      });
    }
  };

  const handleSortChange = (sort: typeof sortBy) => {
    setSortBy(sort);
    if (itemsPage !== 1 || foldersPage !== 1) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('page');
        next.delete('folderPage');
        return next;
      });
    }
  };

  const handleCreateFolder = async (name: string) => {
    await materialBankService.createFolder(name, currentFolderId);
    await loadContents(currentFolderId);
  };

  const handleRenameFolder = async (newName: string) => {
    if (!renameFolderTarget) return;
    const updated = await materialBankService.renameFolder(renameFolderTarget.id, newName);
    setFolders(prev => prev.map(f => f.id === updated.id ? { ...f, name: updated.name } : f));
    if (currentFolderId === updated.id) {
      setBreadcrumbs(prev => prev.map(b => b.id === updated.id ? { ...b, name: updated.name } : b));
    }
  };

  const handleRenameItem = async (newName: string) => {
    if (!renameItemTarget) return;
    const updated = await materialBankService.renameItem(renameItemTarget.id, newName);
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, name: updated.name } : i));
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: number, folderName: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the folder "${folderName}" and all its contents?`)) {
      try {
        await materialBankService.deleteFolder(folderId);
        if (currentFolderId === folderId) {
          handleBreadcrumbClick(null);
        } else {
          await loadContents(currentFolderId);
        }
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

  // Server handles filtering & sorting across the dataset
  const filteredFolders = folders;
  const sortedItems = items;

  // Reordering via drag & drop is active when viewing full list in manual sort mode
  const canDrag = sortBy === 'manual' && searchQuery.trim() === '' && filterType === 'all';

  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (!canDrag) return;
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    if (!canDrag || !draggedItemId || draggedItemId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = viewMode === 'list' 
      ? e.clientY > rect.top + rect.height / 2
      : e.clientX > rect.left + rect.width / 2;

    const newPosition = isAfter ? 'after' : 'before';
    if (dragOverItemId !== id || dropPosition !== newPosition) {
      setDragOverItemId(id);
      setDropPosition(newPosition);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverItemId === id) {
      setDragOverItemId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!canDrag || !draggedItemId || draggedItemId === targetId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDropPosition(null);
      return;
    }

    const previousItems = [...items];
    const currentItems = [...items];
    const fromIndex = currentItems.findIndex(i => i.id === draggedItemId);
    const toIndex = currentItems.findIndex(i => i.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      setDropPosition(null);
      return;
    }

    // Splice dragged item out
    const [movedItem] = currentItems.splice(fromIndex, 1);

    // Calculate insertion index
    let insertIndex = currentItems.findIndex(i => i.id === targetId);
    if (dropPosition === 'after') {
      insertIndex += 1;
    }
    currentItems.splice(insertIndex, 0, movedItem);

    // Optimistic UI update
    setItems(currentItems);
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDropPosition(null);

    // Persist new ordering to database with offset startIndex
    setIsSavingOrder(true);
    setSaveMessage('Saving order...');
    try {
      const itemIds = currentItems.map(i => i.id);
      await materialBankService.reorderItems(itemIds, (itemsPage - 1) * PAGE_SIZE);
      setSaveMessage('Order saved ✓');
      setTimeout(() => {
        setSaveMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to save reordered items:', err);
      // Revert optimistic update on failure
      setItems(previousItems);
      setSaveMessage('Failed to save order');
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDropPosition(null);
  };

  const renderPagination = (
    currentPage: number,
    totalPagesCount: number,
    totalCount: number,
    unitLabel: string,
    onPageChange: (p: number) => void
  ) => {
    if (totalPagesCount <= 1 || totalCount <= PAGE_SIZE) return null;

    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalCount);

    const pages: (number | string)[] = [];
    if (totalPagesCount <= 7) {
      for (let i = 1; i <= totalPagesCount; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const pStart = Math.max(2, currentPage - 1);
      const pEnd = Math.min(totalPagesCount - 1, currentPage + 1);
      for (let i = pStart; i <= pEnd; i++) pages.push(i);
      if (currentPage < totalPagesCount - 2) pages.push('...');
      pages.push(totalPagesCount);
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: 'var(--light-card)',
        border: '1px solid var(--light-border)',
        borderRadius: '10px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
          Showing {start} to {end} of {totalCount} {unitLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn-ld btn-ld-secondary"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              opacity: currentPage <= 1 ? 0.5 : 1,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <FiChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} style={{ padding: '4px 6px', color: 'var(--light-text-muted)', fontSize: '13px' }}>
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                className={`btn-ld ${isActive ? 'btn-ld-primary' : 'btn-ld-secondary'}`}
                onClick={() => onPageChange(p)}
                disabled={loading}
                style={{
                  minWidth: '32px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500'
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            className="btn-ld btn-ld-secondary"
            onClick={() => onPageChange(Math.min(totalPagesCount, currentPage + 1))}
            disabled={currentPage >= totalPagesCount || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              fontSize: '13px',
              opacity: currentPage >= totalPagesCount ? 0.5 : 1,
              cursor: currentPage >= totalPagesCount ? 'not-allowed' : 'pointer'
            }}
          >
            <span>Next</span>
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

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

          {/* Action Dropdown Menu */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
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
                  right: 0,
                  width: '220px',
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
                    setIsCreateFolderOpen(true);
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
                    + New Folder
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddYoutubeOpen(true);
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
                    + Add YouTube Link
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUploadFolderOpen(true);
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
                  <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center' }}>
                    <FiFolder size={16} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)' }}>
                    + Upload Folder
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUploadFileOpen(true);
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
                    <FiUploadCloud size={16} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--light-text-primary)' }}>
                    + Upload File
                  </span>
                </button>
              </div>
            )}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input-ld"
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value as any)}
              style={{ width: '150px' }}
            >
              <option value="all">All Content</option>
              <option value="file">Files Only</option>
              <option value="youtube">YouTube Videos</option>
            </select>

            <select
              className="input-ld"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              style={{ width: '195px' }}
              title="Sort items"
            >
              <option value="manual">Sort: Manual (Drag & Drop)</option>
              <option value="name-asc">Sort: Name (A → Z)</option>
              <option value="name-desc">Sort: Name (Z → A)</option>
              <option value="date-desc">Sort: Newest First</option>
              <option value="date-asc">Sort: Oldest First</option>
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
        ) : totalFolders === 0 && totalItems === 0 ? (
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
                  Folders ({totalFolders})
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
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameFolderTarget(folder);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--light-text-muted)',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--light-primary)'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                                  title="Rename Folder"
                                >
                                  <FiEdit2 size={16} />
                                </button>
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameFolderTarget(folder);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--light-text-muted)',
                              padding: '6px',
                              borderRadius: '4px',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--light-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                            title="Rename Folder"
                          >
                            <FiEdit2 size={15} />
                          </button>
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
                      </div>
                    ))}
                  </div>
                )}

                {renderPagination(foldersPage, folderTotalPages, totalFolders, 'folders', handleFoldersPageChange)}
              </div>
            )}

            {/* Items Section */}
            {sortedItems.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--light-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Files & Links ({totalItems})
                    </h3>
                    {canDrag && (
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        color: 'var(--light-primary)', 
                        backgroundColor: 'rgba(79, 70, 229, 0.08)', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <MdDragIndicator size={13} /> Drag to reorder
                      </span>
                    )}
                  </div>

                  {saveMessage && (
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: saveMessage.includes('Failed') ? '#dc2626' : '#059669',
                      backgroundColor: saveMessage.includes('Failed') ? 'rgba(220, 38, 38, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: `1px solid ${saveMessage.includes('Failed') ? 'rgba(220, 38, 38, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`
                    }}>
                      {isSavingOrder && <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'currentColor' }}></span>}
                      <span>{saveMessage}</span>
                    </div>
                  )}
                </div>

                {sortBy === 'manual' && (searchQuery.trim() !== '' || filterType !== 'all') && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--light-text-muted)',
                    marginBottom: '10px',
                    fontStyle: 'italic'
                  }}>
                    * Drag & drop reordering is paused while search or filters are active. Clear search and filter to rearrange files.
                  </div>
                )}

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
                          <th style={{ padding: '12px 8px', width: '40px', textAlign: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase' }}>
                              #
                            </span>
                          </th>
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
                        {sortedItems.map((item, idx) => {
                          const isDraggingThis = draggedItemId === item.id;
                          const isOverThis = dragOverItemId === item.id;

                          let borderTop = 'none';
                          let borderBottom = idx === sortedItems.length - 1 ? 'none' : '1px solid var(--light-border)';
                          if (isOverThis && dropPosition === 'before') {
                            borderTop = '2px solid var(--light-primary)';
                          } else if (isOverThis && dropPosition === 'after') {
                            borderBottom = '2px solid var(--light-primary)';
                          }

                          return (
                            <tr
                              key={item.id}
                              draggable={canDrag}
                              onDragStart={(e) => handleDragStart(e, item.id)}
                              onDragOver={(e) => handleDragOver(e, item.id)}
                              onDragLeave={(e) => handleDragLeave(e, item.id)}
                              onDrop={(e) => handleDrop(e, item.id)}
                              onDragEnd={handleDragEnd}
                              style={{
                                borderTop,
                                borderBottom,
                                opacity: isDraggingThis ? 0.35 : 1,
                                backgroundColor: isDraggingThis
                                  ? 'var(--light-table-hover-bg)'
                                  : isOverThis
                                    ? 'rgba(79, 70, 229, 0.06)'
                                    : 'transparent',
                                transition: 'background-color 0.15s ease, opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isDraggingThis && !isOverThis) {
                                  e.currentTarget.style.backgroundColor = 'var(--light-table-hover-bg)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isDraggingThis && !isOverThis) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {/* Drag Handle */}
                              <td style={{ padding: '12px 6px', textAlign: 'center', width: '40px', verticalAlign: 'middle' }}>
                                <span
                                  title={canDrag ? "Drag to reorder" : (sortBy !== 'manual' ? "Switch to Manual sort to reorder" : "Clear search/filter to reorder")}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: canDrag ? 'grab' : 'default',
                                    color: canDrag ? 'var(--light-text-muted)' : 'rgba(156, 163, 175, 0.35)',
                                    borderRadius: '4px',
                                    padding: '3px',
                                    transition: 'color 0.15s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (canDrag) e.currentTarget.style.color = 'var(--light-primary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (canDrag) e.currentTarget.style.color = 'var(--light-text-muted)';
                                  }}
                                >
                                  <MdDragIndicator size={18} />
                                </span>
                              </td>

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
                                     onClick={() => setRenameItemTarget(item)}
                                     style={{
                                       background: 'none',
                                       border: 'none',
                                       cursor: 'pointer',
                                       color: 'var(--light-text-muted)',
                                       padding: '4px',
                                       borderRadius: '4px',
                                       display: 'flex',
                                       alignItems: 'center',
                                       transition: 'color 0.2s'
                                     }}
                                     onMouseEnter={(e) => e.currentTarget.style.color = 'var(--light-primary)'}
                                     onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                                     title={item.type === 'youtube' ? 'Rename Video Link' : 'Rename File'}
                                   >
                                     <FiEdit2 size={15} />
                                   </button>

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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '16px' 
                  }}>
                    {sortedItems.map((item) => {
                      const isDraggingThis = draggedItemId === item.id;
                      const isOverThis = dragOverItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          draggable={canDrag}
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragOver={(e) => handleDragOver(e, item.id)}
                          onDragLeave={(e) => handleDragLeave(e, item.id)}
                          onDrop={(e) => handleDrop(e, item.id)}
                          onDragEnd={handleDragEnd}
                          style={{
                            padding: '16px',
                            backgroundColor: 'var(--light-card)',
                            borderRadius: '10px',
                            border: isOverThis
                              ? '2px dashed var(--light-primary)'
                              : '1px solid var(--light-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            boxShadow: isDraggingThis ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                            opacity: isDraggingThis ? 0.35 : 1,
                            transform: isDraggingThis ? 'scale(0.98)' : 'none',
                            transition: 'all 0.15s ease',
                            cursor: canDrag ? 'grab' : 'default',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ 
                              padding: '10px', 
                              borderRadius: '8px', 
                              backgroundColor: item.type === 'youtube' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                              color: item.type === 'youtube' ? '#ef4444' : '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              flexShrink: 0
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

                            {/* Drag handle */}
                            <span
                              title={canDrag ? "Drag to reorder" : (sortBy !== 'manual' ? "Switch to Manual sort to reorder" : "Clear search/filter to reorder")}
                              style={{
                                cursor: canDrag ? 'grab' : 'default',
                                color: canDrag ? 'var(--light-text-muted)' : 'rgba(156, 163, 175, 0.35)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px',
                                borderRadius: '4px',
                                flexShrink: 0,
                                transition: 'color 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                if (canDrag) e.currentTarget.style.color = 'var(--light-primary)';
                              }}
                              onMouseLeave={(e) => {
                                if (canDrag) e.currentTarget.style.color = 'var(--light-text-muted)';
                              }}
                            >
                              <MdDragIndicator size={18} />
                            </span>
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                onClick={() => setRenameItemTarget(item)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--light-text-muted)',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--light-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--light-text-muted)'}
                                title={item.type === 'youtube' ? 'Rename Video Link' : 'Rename File'}
                              >
                                <FiEdit2 size={15} />
                              </button>

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
                        </div>
                      );
                    })}
                  </div>
                )}

                {renderPagination(itemsPage, totalPages, totalItems, 'materials', handleItemsPageChange)}
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

      <RenameFolderModal
        isOpen={Boolean(renameFolderTarget)}
        currentName={renameFolderTarget?.name || ''}
        onClose={() => setRenameFolderTarget(null)}
        onSuccess={handleRenameFolder}
      />

      <RenameItemModal
        isOpen={Boolean(renameItemTarget)}
        currentName={renameItemTarget?.name || ''}
        itemType={renameItemTarget?.type}
        onClose={() => setRenameItemTarget(null)}
        onSuccess={handleRenameItem}
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
