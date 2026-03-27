const normalizeAssignedClasses = (assignedClasses) => Array.from(new Set(
  (Array.isArray(assignedClasses) ? assignedClasses : [])
    .map((className) => String(className || '').trim())
    .filter(Boolean)
));

const normalizeAssignedLabBatches = (assignedLabBatches) => Array.from(new Map(
  (Array.isArray(assignedLabBatches) ? assignedLabBatches : [])
    .map((assignment) => ({
      className: String(assignment?.className || assignment?.class || '').trim(),
      labBatchName: String(assignment?.labBatchName || assignment?.labBatch || '').trim(),
    }))
    .filter((assignment) => assignment.className && assignment.labBatchName)
    .map((assignment) => [`${assignment.className}::${assignment.labBatchName}`, assignment])
).values());

export const buildTeacherAudienceBadges = (exam) => {
  const assignedClasses = normalizeAssignedClasses(exam?.assignedClasses);
  const assignedLabBatches = normalizeAssignedLabBatches(exam?.assignedLabBatches);
  const creatorRole = exam?.createdBy?.role;

  if (creatorRole === 'admin') {
    return [{ key: 'global', label: 'All students', tone: 'global' }];
  }

  const badges = [
    ...assignedClasses.map((className) => ({
      key: `class:${className}`,
      label: `Class: ${className}`,
      tone: 'class',
    })),
    ...assignedLabBatches.map((assignment) => ({
      key: `lab:${assignment.className}::${assignment.labBatchName}`,
      label: `Lab Batch: ${assignment.className} / ${assignment.labBatchName}`,
      tone: 'lab',
    })),
  ];

  if (badges.length === 0 && creatorRole === 'teacher') {
    return [{ key: 'missing', label: 'Audience not set', tone: 'muted' }];
  }

  return badges;
};

export const buildStudentAudienceBadges = (exam, user) => {
  const creatorRole = exam?.createdBy?.role;
  const assignedClasses = normalizeAssignedClasses(exam?.assignedClasses);
  const assignedLabBatches = normalizeAssignedLabBatches(exam?.assignedLabBatches);
  const studentClass = String(user?.batch || user?.class || '').trim();
  const studentLabBatch = String(user?.labBatch || '').trim();

  if (creatorRole === 'admin') {
    return [{ key: 'global', label: 'Available to all students', tone: 'global' }];
  }

  const badges = [];

  if (assignedClasses.includes(studentClass)) {
    badges.push({
      key: `class:${studentClass}`,
      label: `For your class: ${studentClass}`,
      tone: 'class',
    });
  }

  assignedLabBatches.forEach((assignment) => {
    if (assignment.className === studentClass && assignment.labBatchName === studentLabBatch) {
      badges.push({
        key: `lab:${assignment.className}::${assignment.labBatchName}`,
        label: `For your lab batch: ${assignment.className} / ${assignment.labBatchName}`,
        tone: 'lab',
      });
    }
  });

  return badges;
};

export const getAudienceBadgeStyle = (tone) => {
  if (tone === 'global') {
    return {
      background: '#ecfeff',
      color: '#155e75',
      border: '1px solid #a5f3fc',
    };
  }

  if (tone === 'class') {
    return {
      background: '#eff6ff',
      color: '#1d4ed8',
      border: '1px solid #bfdbfe',
    };
  }

  if (tone === 'lab') {
    return {
      background: '#f0fdf4',
      color: '#166534',
      border: '1px solid #bbf7d0',
    };
  }

  return {
    background: '#f8fafc',
    color: '#475569',
    border: '1px solid #e2e8f0',
  };
};