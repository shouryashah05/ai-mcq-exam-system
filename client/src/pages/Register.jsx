import React from 'react';
import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>🔐</h1>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Account Access Managed</h2>
          <p className="text-muted" style={{ marginTop: '8px' }}>
            This platform does not allow public self-signup.
          </p>
        </div>

        <div className="alert alert-info" style={{ marginBottom: '16px' }}>
          New accounts are created by an administrator. Contact your institution or system administrator if you need access.
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className="button-lg" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
