import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExamResult from './ExamResult';
import { getAttempt } from '../services/examAttemptService';
import LoadingSpinner from '../components/LoadingSpinner';
import { showToast } from '../utils/appEvents';

export default function ExamResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [evaluated, setEvaluated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAttempt(attemptId);
        setAttempt(res.attempt);
        setEvaluated(res.evaluated || []);
      } catch (err) {
        showToast(err?.response?.data?.message || err.message, { type: 'error' });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attemptId, navigate]);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!attempt) return null;

  const result = {
    score: attempt.score,
    totalMarks: attempt.exam.totalMarks,
    percentage: ((attempt.score / attempt.exam.totalMarks) * 100).toFixed(2),
    passed: attempt.score >= attempt.exam.passingMarks,
    evaluated
  };

  return <ExamResult result={result} exam={attempt.exam} onClose={() => navigate('/dashboard')} />;
}
