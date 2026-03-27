import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { verifyEmailToken } from '../services/verificationService';
import { getHomeRouteForRole } from '../utils/roleRouting';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (!email || !password) return setError('Email, enrollment number, employee ID, or admin ID and password are required');
      const data = await login({ email: email.trim(), password });
      navigate(getHomeRouteForRole(data.user?.role), { replace: true });
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message;
      setError(errorMsg);

      // If error is about email verification, show token input
      if (errorMsg.includes('verify your email')) {
        setShowVerifyToken(true);
      }
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    setError(null);
    setVerifySuccess('');

    if (!verifyToken.trim()) {
      return setError('Please enter the verification token from your email');
    }

    try {
      const response = await verifyEmailToken(verifyToken.trim());
      setVerifySuccess(response.message || 'Email verified successfully! You can now login.');
      setShowVerifyToken(false);
      setVerifyToken('');
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired verification token');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>📝</h1>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>AI MCQ Exam</h2>
          <p className="text-muted" style={{ marginTop: '8px' }}>Sign in to continue</p>
        </div>

        <form onSubmit={submit}>
          {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
          {verifySuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{verifySuccess}</div>}

          <div className="form-group">
            <label htmlFor="login-email">Email, Enrollment Number, Employee ID, or Admin ID</label>
            <input
              id="login-email"
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email, enrollment number, employee ID, or admin ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '72px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 0,
                  background: 'transparent',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  padding: 0,
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="button-lg" style={{ width: '100%' }}>
            Sign In →
          </button>
        </form>

        {/* Manual Token Verification Section */}
        {showVerifyToken && (
          <div style={{ marginTop: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#495057' }}>📧 Verify Your Email</h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#6c757d' }}>
              Find the verification token in your email. It looks like this:
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', background: '#fff', padding: '8px', borderRadius: '4px', wordBreak: 'break-all' }}>
              Example: 98e779feb29a0ac4053cef5882dbcd2e881b...
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#dc3545', fontWeight: '500' }}>
              ⚠️ Copy ONLY the token (the long code after "token=" in the link), NOT the entire URL!
            </p>
            <form onSubmit={handleVerifyToken}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="login-verify-token" className="small">Verification Token</label>
                <input
                  id="login-verify-token"
                  type="text"
                  value={verifyToken}
                  onChange={e => setVerifyToken(e.target.value)}
                  placeholder="Paste token here (long code only)"
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>
              <button type="submit" className="button-lg" style={{ width: '100%', fontSize: '0.875rem' }}>
                Verify Email ✓
              </button>
            </form>
          </div>
        )}
        <div style={{ marginTop: '12px', textAlign: 'right' }}>
          <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
            Forgot password?
          </Link>
        </div>
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <span className="text-muted">Accounts are created by your administrator.</span>
        </div>
      </div>
    </div>
  );
}
