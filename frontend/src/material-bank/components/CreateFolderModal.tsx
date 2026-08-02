import React, { useState } from 'react';
import { FiX, FiFolderPlus } from 'react-icons/fi';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [folderName, setFolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Please enter a folder name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSuccess(folderName.trim());
      setFolderName('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create folder.');
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
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
              <FiFolderPlus size={20} />
            </div>
            <h3 className="modal-title-ld" style={{ margin: 0 }}>
              Create New Folder
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
              Folder Name *
            </label>
            <input 
              type="text" 
              className="input-ld"
              placeholder="e.g., Mathematics Notes, Physics Slides..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
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
              {submitting ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
