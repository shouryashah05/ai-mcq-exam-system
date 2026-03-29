import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchExams } from '../services/examService';
import { getBatchOverview, getSubjectPerformance } from '../services/batchService';

const summaryCardStyle = {
  padding: 16,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [myExams, setMyExams] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [overviewRes, examsRes, subjectPerformanceRes] = await Promise.all([
          getBatchOverview(),
          fetchExams({ mine: true }),
          getSubjectPerformance(),
        ]);

        if (overviewRes?.success) {
          setOverview(overviewRes.data);
        }
        setMyExams(examsRes?.exams || []);
        if (subjectPerformanceRes?.success) {
          setSubjectPerformance(subjectPerformanceRes.data || []);
        }
      } catch (error) {
        console.error('Failed to load teacher dashboard', error);
      }
    };

    loadDashboard();
  }, []);

  const upcomingMyExams = useMemo(() => myExams
    .filter((exam) => exam.isActive && new Date(exam.startDate) >= new Date())
    .sort((left, right) => new Date(left.startDate) - new Date(right.startDate))
    .slice(0, 4), [myExams]);
  const weakestSubjects = useMemo(() => subjectPerformance.slice(0, 3), [subjectPerformance]);

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
        <p className="small">Track your batch health, upcoming exams, and weakest subjects from one place.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
          <div style={summaryCardStyle}>
            <div className="small">Managed Subjects</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{Array.isArray(user?.subjects) ? user.subjects.length : 0}</div>
          </div>
          <div style={summaryCardStyle}>
            <div className="small">Published Exams</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{myExams.length}</div>
          </div>
          <div style={summaryCardStyle}>
            <div className="small">Active Learners</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{overview?.activeStudents ?? 0}</div>
          </div>
          <div style={summaryCardStyle}>
            <div className="small">Batch Average</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{overview?.batchAverage ?? 0}%</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/teacher/questions')}>My Questions</button>
          <button onClick={() => navigate('/teacher/exams')}>My Exams</button>
          <button onClick={() => navigate('/teacher/reports')}>My Reports</button>
          <button onClick={() => navigate('/teacher/analytics')}>My Batch Analytics</button>
          <button onClick={() => navigate('/profile')}>Profile</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Next Active Exams</h3>
        {!upcomingMyExams.length ? (
          <p className="small" style={{ marginBottom: 0 }}>No upcoming active exams.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {upcomingMyExams.map((exam) => (
              <div key={exam._id} style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                <strong>{exam.title}</strong>
                <div className="small">{exam.subject} • {exam.duration} min • starts {new Date(exam.startDate).toLocaleString()}</div>
                <div className="small">{exam.attemptStats?.startedCount || 0} started • {exam.attemptStats?.completedCount || 0} completed</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Subjects Needing Attention</h3>
        {!weakestSubjects.length ? (
          <p className="small" style={{ marginBottom: 0 }}>No subject performance data yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {weakestSubjects.map((subject) => (
              <div key={subject._id} style={{ padding: 14, borderRadius: 12, border: '1px solid #fee2e2', background: '#fff5f5' }}>
                <strong>{subject._id}</strong>
                <div className="small">Average accuracy: {Math.round(subject.avgScore || 0)}%</div>
                <div className="small">Attempts recorded: {subject.totalAttempts || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}