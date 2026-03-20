import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/verificationService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message || 'If the email exists, a password reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>🔑</h1>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Reset Your Password</h2>
          <p className="text-muted" style={{ marginTop: '8px' }}>
            Enter your email address and we will send you a secure password setup or reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {message && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{message}</div>}
          {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

          <div className="form-group">
            <label htmlFor="forgot-password-email">Email</label>
            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" className="button-lg" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}