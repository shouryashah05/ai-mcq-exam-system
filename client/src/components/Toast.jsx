import React, { useEffect, useState } from 'react';

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      const id = Date.now() + Math.random();
      const toast = { id, type: detail.type || 'info', message: detail.message || '' };
      setToasts((t) => [...t, toast]);
      // auto remove
      setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), detail.duration || 5000);
    };

    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={containerStyle} aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="mit-toast" style={{ ...toastStyle, ...(variantStyles[t.type] || infoStyle) }}>
          <strong style={{display:'block', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '11px'}}>{labels[t.type] || 'Info'}</strong>
          <div>{t.message}</div>
        </div>
      ))}
    </div>
  );
}

const containerStyle = {
  position: 'fixed',
  right: 16,
  top: 88,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const toastStyle = {
  minWidth: 260,
  padding: '12px 16px',
  borderRadius: 12,
  boxShadow: '0 10px 24px rgba(26, 26, 46, 0.18)',
  fontSize: '13px',
  lineHeight: 1.55,
};

const infoStyle = {
  background: 'linear-gradient(90deg, #4B0082 0%, #6A0DAD 100%)',
  color: '#fff'
};

const warningStyle = {
  background: 'linear-gradient(90deg, #E8631A 0%, #F0960A 100%)',
  color: '#fff'
};

const successStyle = {
  background: 'linear-gradient(90deg, #239743 0%, #28A745 100%)',
  color: '#fff'
};

const errorStyle = {
  background: 'linear-gradient(90deg, #C62828 0%, #E8361A 100%)',
  color: '#fff'
};

const variantStyles = {
  info: infoStyle,
  warning: warningStyle,
  success: successStyle,
  error: errorStyle,
};

const labels = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
};
