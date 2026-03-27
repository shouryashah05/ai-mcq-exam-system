import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAttemptHistory } from '../services/examAttemptService';

export default function ExamHistory() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAttemptHistory();
        setAttempts(res.attempts || []);
      } catch (err) {
        setError(err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const adaptiveAttempts = attempts.filter((attempt) => attempt.mode === 'adaptive');
  const standardAttempts = attempts.filter((attempt) => attempt.mode !== 'adaptive');

  const getAdaptiveSubject = (attempt) => {
    const firstAnsweredSubject = attempt?.answers?.find((answer) => answer?.subject)?.subject;
    return firstAnsweredSubject || attempt?.exam?.subject || 'General';
  };

  const renderTable = ({ title, subtitle, rows, emptyMessage, type }) => (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
        <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{subtitle}</p>
      </div>

      <div style={{ padding: 20 }}>
        {!rows.length && <div className="small">{emptyMessage}</div>}
        {rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead className="small" style={{ textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '8px 6px' }}>{type === 'adaptive' ? 'Practice Test' : 'Exam'}</th>
                <th style={{ padding: '8px 6px' }}>Score</th>
                <th style={{ padding: '8px 6px' }}>Status</th>
                <th style={{ padding: '8px 6px' }}>Date</th>
                <th style={{ padding: '8px 6px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((attempt) => {
                const isAdaptive = attempt.mode === 'adaptive';
                const titleText = isAdaptive
                  ? `Adaptive Practice - ${getAdaptiveSubject(attempt)}`
                  : attempt.exam?.title || 'Unknown Exam';
                const passed = isAdaptive ? true : attempt.score >= (attempt.exam?.passingMarks || 0);

                return (
                  <tr key={attempt._id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{titleText}</td>
                    <td style={{ padding: '8px 6px' }}>
                      {attempt.score}
                      {!isAdaptive && typeof attempt.exam?.totalMarks === 'number' ? ` / ${attempt.exam.totalMarks}` : ''}
                    </td>
                    <td style={{ padding: '8px 6px', color: isAdaptive || passed ? '#10b981' : '#dc2626' }}>
                      {isAdaptive ? 'Completed' : (passed ? 'Passed' : 'Failed')}
                    </td>
                    <td style={{ padding: '8px 6px' }} className="small">
                      {attempt.endTime ? new Date(attempt.endTime).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <button
                        onClick={() => navigate(isAdaptive ? `/analysis/${attempt._id}` : `/result/${attempt._id}`)}
                        style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        {isAdaptive ? 'View Analysis' : 'View Result'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="nav" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 6 }}>Test History</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Review both assigned exam attempts and adaptive practice sessions in one place. Latest activity appears first.
        </p>
      </div>

      {loading && <div className="card"><div style={{ padding: 20 }}>Loading history...</div></div>}
      {error && <div className="card" style={{ color: 'red', padding: 20 }}>{error}</div>}
      {!loading && !error && !attempts.length && (
        <div className="card"><div style={{ padding: 20 }} className="small">No completed tests yet.</div></div>
      )}
      {!loading && !error && attempts.length > 0 && (
        <>
          {renderTable({
            title: 'Assigned Exam History',
            subtitle: 'Exams created by admins or teachers.',
            rows: standardAttempts,
            emptyMessage: 'No completed assigned exams yet.',
            type: 'standard',
          })}
          {renderTable({
            title: 'Adaptive Practice History',
            subtitle: 'Your completed adaptive practice sessions and their analysis.',
            rows: adaptiveAttempts,
            emptyMessage: 'No completed adaptive practice sessions yet.',
            type: 'adaptive',
          })}
        </>
      )}
    </div>
  );
}
