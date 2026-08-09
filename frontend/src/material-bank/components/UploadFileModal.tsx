import React, { useState } from 'react';
import { FiX, FiUploadCloud, FiFile } from 'react-icons/fi';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (file: File) => Promise<void>;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds the 5MB limit. Please select a smaller file.');
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSuccess(selectedFile);
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to upload file.');
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
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--light-primary)' }}>
              <FiUploadCloud size={20} />
            </div>
            <h3 className="modal-title-ld" style={{ margin: 0 }}>
              Upload File
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
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer'
            }} onClick={() => document.getElementById('material-file-input')?.click()}>
              <FiUploadCloud size={36} style={{ color: '#94a3b8', marginBottom: '8px' }} />
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                Click to browse file (PDF, DOCX, Images, Video)
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Maximum file size: 5MB
              </p>
              <input 
                id="material-file-input"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={submitting}
              />
            </div>

            {selectedFile && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#f1f5f9', borderRadius: '6px' }}>
                <FiFile size={18} style={{ color: 'var(--light-primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}
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
              disabled={submitting || !selectedFile}
            >
              {submitting ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
