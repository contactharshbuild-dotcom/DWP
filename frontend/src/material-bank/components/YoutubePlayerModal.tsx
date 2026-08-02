import React from 'react';
import { FiX, FiExternalLink } from 'react-icons/fi';

interface YoutubePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export const YoutubePlayerModal: React.FC<YoutubePlayerModalProps> = ({
  isOpen,
  onClose,
  title,
  url
}) => {
  if (!isOpen || !url) return null;

  // Extract YouTube video ID
  const getEmbedUrl = (rawUrl: string) => {
    let videoId = '';
    try {
      if (rawUrl.includes('youtu.be/')) {
        videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0];
      } else if (rawUrl.includes('watch?v=')) {
        videoId = rawUrl.split('watch?v=')[1]?.split('&')[0];
      } else if (rawUrl.includes('embed/')) {
        videoId = rawUrl.split('embed/')[1]?.split('?')[0];
      }
    } catch (e) {
      console.error('Error parsing YouTube video ID:', e);
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return rawUrl;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="modal-overlay-ld" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content-ld"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '800px', 
          width: '90%', 
          borderRadius: '16px', 
          padding: '0', 
          background: '#0f172a', 
          border: 'none',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', textDecoration: 'none' }}
              title="Open in YouTube"
            >
              <span>Open</span>
              <FiExternalLink size={14} />
            </a>
            <button 
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <FiX size={22} />
            </button>
          </div>
        </div>

        {/* Video Iframe Container */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000000' }}>
          <iframe 
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0
            }}
          />
        </div>
      </div>
    </div>
  );
};
