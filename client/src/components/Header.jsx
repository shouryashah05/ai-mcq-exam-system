import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import mitLogoWhite from '../../../assets/MIT LOGO WHITE.png';

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isActive = (path) => location.pathname === path;

  return (
    <header className="mit-header">
      <div className="mit-header-rainbow" aria-hidden="true" />
      <div className="mit-header-inner">
        {/* Logo/Title */}
        <div className="mit-brand" onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}>
          <img className="mit-brand-logo" src={mitLogoWhite} alt="MIT ADT University" />
          <div className="mit-brand-text-wrap">
            <h1 className="mit-brand-title">AI MCQ Exam</h1>
            <span className="mit-brand-subtitle">Assessment Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mit-header-nav">
          {isAdmin && (
            <>
              <NavLink text="Dashboard" path="/admin/dashboard" isActive={isActive('/admin/dashboard')} onClick={() => navigate('/admin/dashboard')} />
              <NavLink text="Users" path="/admin/users" isActive={isActive('/admin/users')} onClick={() => navigate('/admin/users')} />
              <NavLink text="Questions" path="/admin/questions" isActive={isActive('/admin/questions')} onClick={() => navigate('/admin/questions')} />
              <NavLink text="Exams" path="/admin/exams" isActive={isActive('/admin/exams')} onClick={() => navigate('/admin/exams')} />
              <NavLink text="Reports" path="/admin/reports" isActive={isActive('/admin/reports')} onClick={() => navigate('/admin/reports')} />
              <NavLink text="Profile" path="/profile" isActive={isActive('/profile')} onClick={() => navigate('/profile')} />
            </>
          )}
          {!isAdmin && (
            <>
              <NavLink text="Dashboard" path="/dashboard" isActive={isActive('/dashboard')} onClick={() => navigate('/dashboard')} />
              <NavLink text="Exams" path="/exams" isActive={isActive('/exams')} onClick={() => navigate('/exams')} />
              <NavLink text="Analytics" path="/analytics" isActive={isActive('/analytics')} onClick={() => navigate('/analytics')} />
              <NavLink text="Profile" path="/profile" isActive={isActive('/profile')} onClick={() => navigate('/profile')} />
            </>
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="mit-user-section">
          <span className="mit-user-email">{user.enrollmentNo}</span>
          <span className="mit-user-role">{user.role}</span>
          <button className="mit-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ text, path, isActive, onClick }) {
  return (
    <button
      className={`mit-nav-link ${isActive ? 'mit-nav-link-active' : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
