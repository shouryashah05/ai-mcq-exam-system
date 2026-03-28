import React, { useState, useEffect, useContext } from 'react';
import { fetchExams } from '../services/examService';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ExamsPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetchExams();
                if (import.meta.env.DEV) {
                    console.debug('[ExamsPage] fetched exams', res.exams || []);
                }
                const now = new Date();
                const available = (res.exams || []).filter(e => {
                    const isActive = e.isActive;
                    const isAdminCreated = e.createdBy?.role === 'admin';
                    const startDate = new Date(e.startDate);
                    const endDate = new Date(e.endDate);
                    const withinWindow = !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate <= now && endDate >= now;
                    return isActive && isAdminCreated && withinWindow;
                });
                setExams(available);
            } catch (err) {
                setError(err?.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };
        if (user) load();
    }, [user]);

    const handleStartExam = (examId) => {
        navigate(`/exam/${examId}`);
    };

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '28px 24px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 className="mit-page-title">Available Exams</h1>
                <div className="mit-accent-line" style={{ margin: '8px 0 12px' }} aria-hidden="true" />
                <p className="mit-page-subtitle">
                    Active exams assigned by your admin. Click "Start Exam" to begin.
                </p>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                    <p>Loading exams...</p>
                </div>
            )}

            {error && (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
                    {error}
                </div>
            )}

            {!loading && !error && exams.length === 0 && (
                <div className="mit-empty-state">
                    <h3>No Exams Available Right Now</h3>
                    <p>Check back later or try the adaptive practice mode.</p>
                </div>
            )}

            {!loading && exams.length > 0 && (
                <div className="mit-exam-list">
                    {exams.map(ex => (
                        <div key={ex._id} className="mit-exam-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 700 }}>{ex.title}</h3>
                                    {ex.description && (
                                        <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{ex.description}</p>
                                    )}
                                    <div className="mit-exam-meta">
                                        <span>⏱ {ex.duration} mins</span>
                                        <span>❓ {ex.questions.length} questions</span>
                                        <span>🏆 {ex.totalMarks} marks</span>
                                        <span>✅ Pass: {ex.passingMarks}</span>
                                        {ex.enableNegativeMarking && <span className="mit-chip mit-chip-danger">Negative Marking</span>}
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#999' }}>
                                        Ends: {new Date(ex.endDate).toLocaleDateString()} at {new Date(ex.endDate).toLocaleTimeString()}
                                    </div>
                                </div>
                                <button
                                    className="button"
                                    onClick={() => handleStartExam(ex._id)}
                                    style={{ whiteSpace: 'nowrap', alignSelf: 'center' }}
                                >
                                    Start Exam →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
