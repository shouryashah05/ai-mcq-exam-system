import React from 'react';

export default function SaveIndicator({ status, lastSavedAt }) {
  // status: 'idle' | 'saving' | 'saved' | 'error'
  let text = '';
  if (status === 'saving') text = 'Saving...';
  if (status === 'saved') text = `Saved ${lastSavedAt ? timeAgo(lastSavedAt) : ''}`;
  if (status === 'error') text = 'Save failed';

  if (status === 'idle') return null;

  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: status === 'error' ? 'var(--danger)' : 'var(--text-muted)'
      }}
      title={lastSavedAt ? new Date(lastSavedAt).toString() : ''}
    >
      {text}
    </div>
  );
}

function timeAgo(ts) {
  try {
    const d = Date.now() - new Date(ts).getTime();
    if (d < 60000) return 'just now';
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
    return `${Math.floor(d/3600000)}h ago`;
  } catch (e) { return ''; }
}
