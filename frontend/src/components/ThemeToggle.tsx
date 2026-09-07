import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'space-between',
        gap: '8px',
        width: compact ? '36px' : '100%',
        height: '36px',
        padding: compact ? '0' : '0 12px',
        borderRadius: '8px',
        border: '1px solid var(--light-border)',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
        color: 'var(--light-text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isDark ? (
          <FiSun size={16} style={{ color: '#f59e0b' }} />
        ) : (
          <FiMoon size={16} style={{ color: '#6366f1' }} />
        )}
        {!compact && <span className="theme-toggle-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
      </div>

      {!compact && (
        <div
          className="theme-toggle-switch"
          style={{
            width: '32px',
            height: '18px',
            borderRadius: '99px',
            backgroundColor: isDark ? 'var(--light-primary)' : '#cbd5e1',
            position: 'relative',
            transition: 'background-color 0.2s ease'
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              position: 'absolute',
              top: '2px',
              left: isDark ? '16px' : '2px',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          />
        </div>
      )}
    </button>
  );
};
