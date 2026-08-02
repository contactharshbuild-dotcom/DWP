import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiFolder, 
  FiFileText, 
  FiYoutube, 
  FiChevronRight, 
  FiHome, 
  FiCheckSquare, 
  FiSquare,
  FiDownloadCloud
} from 'react-icons/fi';
import { materialBankService } from '../../../material-bank/services/materialBankService';
import type { MaterialBankFolder, MaterialBankItem, BreadcrumbItem } from '../../../material-bank/types/materialBank.types';
import api from '../../../services/api';

interface ImportMaterialBankModalProps {
  isOpen: boolean;
  classroomId: number;
  targetFolderId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportMaterialBankModal: React.FC<ImportMaterialBankModalProps> = ({
  isOpen,
  classroomId,
  targetFolderId,
  onClose,
  onSuccess
}) => {
  const [currentBankFolderId, setCurrentBankFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<MaterialBankFolder[]>([]);
  const [items, setItems] = useState<MaterialBankItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected state
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContents(currentBankFolderId);
    } else {
      // Reset selections when closing
      setSelectedFolderIds([]);
      setSelectedItemIds([]);
      setError(null);
    }
  }, [isOpen, currentBankFolderId]);

  const loadContents = async (folderId?: number | null) => {
    setLoading(true);
    try {
      const data = await materialBankService.getContents(folderId);
      setFolders(data.folders || []);
      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (err: any) {
      console.error('Failed to load Material Bank:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelectFolder = (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleSelectItem = (itemId: number) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleImport = async () => {
    if (selectedFolderIds.length === 0 && selectedItemIds.length === 0) {
      setError('Please select at least one folder or file to import.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/resources/import-material-bank', {
        classroomId,
        targetFolderId,
        folderIds: selectedFolderIds,
        itemIds: selectedItemIds
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to import materials.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelectedCount = selectedFolderIds.length + selectedItemIds.length;

  return (
    <div className="modal-overlay-ld" onClick={onClose}>
      <div 
        className="modal-content-ld"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
              <FiDownloadCloud size={22} />
            </div>
            <div>
              <h3 className="modal-title-ld" style={{ margin: 0, fontSize: '18px' }}>
                Import from Material Bank
              </h3>
              <p className="modal-subtitle-ld" style={{ margin: 0, fontSize: '12px' }}>
                Select folders or materials to add to this classroom without re-uploading files.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-ld" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', marginBottom: '12px', padding: '10px 14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Breadcrumb path */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '8px 12px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '6px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          <button 
            type="button"
            onClick={() => setCurrentBankFolderId(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              color: currentBankFolderId === null ? 'var(--light-primary)' : '#64748b',
              fontWeight: currentBankFolderId === null ? '700' : '500'
            }}
          >
            <FiHome size={14} />
            <span>Root</span>
          </button>

          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <FiChevronRight size={12} style={{ color: '#94a3b8' }} />
              <button
                type="button"
                onClick={() => setCurrentBankFolderId(crumb.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: currentBankFolderId === crumb.id ? 'var(--light-primary)' : '#64748b',
                  fontWeight: currentBankFolderId === crumb.id ? '700' : '500'
                }}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Contents List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '260px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#fafafa' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <span className="spinner" style={{ width: '24px', height: '24px' }}></span>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>Loading Material Bank...</p>
            </div>
          ) : folders.length === 0 && items.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <FiFolder size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No folders or items found here.</p>
            </div>
          ) : (
            <div>
              {/* Folders */}
              {folders.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Folders
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {folders.map((f) => {
                      const isSelected = selectedFolderIds.includes(f.id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => setCurrentBankFolderId(f.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.06)' : '#ffffff',
                            border: isSelected ? '1px solid var(--light-primary)' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={(e) => toggleSelectFolder(f.id, e)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isSelected ? 'var(--light-primary)' : '#94a3b8', display: 'flex' }}
                            >
                              {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                            </button>
                            <FiFolder size={18} style={{ color: 'var(--light-primary)' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                              {f.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Open &rarr;</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              {items.length > 0 && (
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Files & Links
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {items.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleSelectItem(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.06)' : '#ffffff',
                            border: isSelected ? '1px solid var(--light-primary)' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ color: isSelected ? 'var(--light-primary)' : '#94a3b8', display: 'flex' }}>
                            {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                          </div>
                          <div style={{ 
                            padding: '6px', 
                            borderRadius: '4px', 
                            backgroundColor: item.type === 'youtube' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                            color: item.type === 'youtube' ? '#ef4444' : '#3b82f6',
                            display: 'flex'
                          }}>
                            {item.type === 'youtube' ? <FiYoutube size={16} /> : <FiFileText size={16} />}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
            Selected: <strong style={{ color: 'var(--light-primary)' }}>{totalSelectedCount}</strong> item(s)
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-ld btn-ld-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-ld btn-ld-primary"
              onClick={handleImport}
              disabled={submitting || totalSelectedCount === 0}
            >
              {submitting ? 'Importing...' : `Import Selected (${totalSelectedCount})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
