import React from 'react';

export default function LoadingSpinner({ fullScreen = false }) {
  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const containerStyle = fullScreen
    ? {
        ...baseStyle,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 26, 46, 0.34)',
        zIndex: 1000,
      }
    : {
        ...baseStyle,
        padding: '32px',
        minHeight: '200px',
        borderRadius: '14px',
      };

  return (
    <div style={containerStyle} className={fullScreen ? 'spinner-overlay' : 'spinner-inline'}>
      <div style={styles.spinner} />
      <span style={styles.text}>Loading...</span>
    </div>
  );
}

const styles = {
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e8daf8',
    borderTop: '3px solid #C0359E',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: 'var(--text-muted)',
    fontWeight: '700',
    fontSize: '0.9rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
};
