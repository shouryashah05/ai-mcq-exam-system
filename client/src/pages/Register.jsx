import React from 'react';
import { Link } from 'react-router-dom';
import mitLogoWhite from '../../../assets/MIT LOGO WHITE.png';

export default function Register() {
  return (
    <div className="auth-screen">
      <div className="card auth-card" style={{ maxWidth: '460px' }}>
        <div className="mit-auth-brand">
          <img className="mit-auth-logo" src={mitLogoWhite} alt="MIT ADT University" />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 className="mit-section-title" style={{ margin: 0, fontSize: '1.2rem' }}>Account Access Managed</h2>
          <div className="mit-accent-line" aria-hidden="true" />
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
