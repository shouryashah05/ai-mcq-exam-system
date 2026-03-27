import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="nav">
        <h2>Teacher Dashboard</h2>
        <div>
          <span className="small">{user?.email}</span>
          <button style={{ marginLeft: 12 }} onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="card">
        <h3>Welcome, {user?.firstName || user?.name || 'Teacher'}</h3>
        <p className="small">Manage your questions, publish exams, and review student performance for your assigned subjects.</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/teacher/questions')}>My Questions</button>
          <button onClick={() => navigate('/teacher/exams')}>My Exams</button>
          <button onClick={() => navigate('/teacher/reports')}>My Reports</button>
          <button onClick={() => navigate('/teacher/analytics')}>My Batch Analytics</button>
          <button onClick={() => navigate('/profile')}>Profile</button>
        </div>
      </div>
    </div>
  );
}