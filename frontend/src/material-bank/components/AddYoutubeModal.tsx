import React, { useState } from 'react';
import { FiX, FiYoutube } from 'react-icons/fi';

interface AddYoutubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string, link: string) => Promise<void>;
}

export const AddYoutubeModal: React.FC<AddYoutubeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !link.trim()) {
      setError('Please provide both video title and YouTube link.');
      return;
    }

    if (!link.includes('youtube.com') && !link.includes('youtu.be')) {
      setError('Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSuccess(name.trim(), link.trim());
      setName('');
      setLink('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add YouTube video link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay-ld" onClick={onClose}>
      <div 
        className="modal-content-ld"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <FiYoutube size={22} />
            </div>
            <h3 className="modal-title-ld" style={{ margin: 0 }}>
              Add YouTube Video Link
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
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label-ld" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              Video Title *
            </label>
            <input 
              type="text" 
              className="input-ld"
              placeholder="e.g., Organic Chemistry Lecture 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label-ld" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              YouTube Video URL *
            </label>
            <input 
              type="url" 
              className="input-ld"
              placeholder="https://www.youtube.com/watch?v=..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
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
              {submitting ? 'Adding...' : 'Add Video Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
