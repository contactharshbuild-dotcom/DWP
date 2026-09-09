import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2 } from 'react-icons/fi';

interface RenameItemModalProps {
  isOpen: boolean;
  currentName: string;
  itemType?: 'file' | 'youtube';
  onClose: () => void;
  onSuccess: (newName: string) => Promise<void>;
}

export const RenameItemModal: React.FC<RenameItemModalProps> = ({
  isOpen,
  currentName,
  itemType = 'file',
  onClose,
  onSuccess
}) => {
  const [itemName, setItemName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItemName(currentName);
    setError(null);
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const isYoutube = itemType === 'youtube';
  const modalTitle = isYoutube ? 'Rename Video Link' : 'Rename File';
  const labelText = isYoutube ? 'Video Title *' : 'File Name *';
  const placeholderText = isYoutube 
    ? 'e.g., Chapter 1 Lecture, Calculus Tutorial...' 
    : 'e.g., Mathematics Notes.pdf, Chemistry Slide...';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError(isYoutube ? 'Please enter a video title.' : 'Please enter a file name.');
      return;
    }
    if (itemName.trim() === currentName.trim()) {
      onClose();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSuccess(itemName.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to rename item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay-ld" onClick={onClose}>
      <div 
        className="modal-content-ld"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: isYoutube ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: isYoutube ? '#ef4444' : '#3b82f6' }}>
              <FiEdit2 size={20} />
            </div>
            <h3 className="modal-title-ld" style={{ margin: 0 }}>
              {modalTitle}
            </h3>
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
          <div className="alert-ld" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label-ld" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              {labelText}
            </label>
            <input 
              type="text" 
              className="input-ld"
              placeholder={placeholderText}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
              disabled={submitting}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              type="button" 
              className="btn-ld btn-ld-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-ld btn-ld-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
