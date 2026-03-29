const buildExamSnapshot = (exam) => {
  if (!exam) {
    return null;
  }

  const source = exam.toObject ? exam.toObject() : exam;

  return {
    examId: source._id ? String(source._id) : '',
    title: source.title || 'Exam',
    examType: source.examType || 'standard',
    subject: source.subject || 'General',
    description: source.description || '',
    duration: Number(source.duration) || 0,
    totalMarks: Number(source.totalMarks) || 0,
    passingMarks: Number(source.passingMarks) || 0,
    enableNegativeMarking: Boolean(source.enableNegativeMarking),
    startDate: source.startDate || null,
    endDate: source.endDate || null,
  };
};

const mergeAttemptExamSnapshot = (attempt) => {
  if (!attempt) {
    return attempt;
  }

  const snapshot = attempt.examSnapshot || null;
  const currentExam = attempt.exam && typeof attempt.exam === 'object' && !Array.isArray(attempt.exam)
    ? attempt.exam
    : null;

  if (!snapshot && !currentExam) {
    return attempt;
  }

  const mergedExam = {
    ...(snapshot || {}),
    ...(currentExam || {}),
    ...(snapshot || {}),
    _id: currentExam?._id || snapshot?.examId || attempt.exam,
  };

  return {
    ...attempt,
    exam: mergedExam,
  };
};

module.exports = {
  buildExamSnapshot,
  mergeAttemptExamSnapshot,
};