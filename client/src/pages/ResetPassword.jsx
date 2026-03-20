import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordWithToken } from '../services/verificationService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await resetPasswordWithToken({ token, newPassword: form.newPassword });
      setMessage(response.message || 'Password updated successfully.');
      setForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '460px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>🛡️</h1>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Set a New Password</h2>
          <p className="text-muted" style={{ marginTop: '8px' }}>
            Choose a strong password to finish account setup or reset your access.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {message && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{message}</div>}
          {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

          <div className="form-group">
            <label htmlFor="reset-password-new">New Password</label>
            <input
              id="reset-password-new"
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reset-password-confirm">Confirm Password</label>
            <input
              id="reset-password-confirm"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button type="submit" className="button-lg" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Saving…' : 'Update Password'}
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