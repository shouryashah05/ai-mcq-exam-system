import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { showToast } from '../utils/appEvents';
import {
  assignLabBatch,
  assignStudentsToClass,
  createClass,
  createLabBatch,
  deleteClass,
  deleteLabBatch,
  fetchClasses,
  removeStudentsFromClass,
  updateClass,
  updateLabBatch,
} from '../services/classService';

const EMPTY_CLASS_FORM = {
  name: '',
  capacity: 60,
  description: '',
};

const EMPTY_LAB_BATCH_FORM = {
  name: '',
  capacity: 20,
};

const filterStudentsByQuery = (students, query) => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) {
    return students;
  }

  return students.filter((student) => {
    const values = [student.name, student.email, student.enrollmentNo, student.batch, student.labBatch]
      .map((value) => String(value || '').toLowerCase());
    return values.some((value) => value.includes(normalizedQuery));
  });
};

const getCapacityTone = (currentCount, capacity) => {
  if (!capacity) {
    return '#475569';
  }

  if (currentCount >= capacity) {
    return '#dc2626';
  }

  if (currentCount >= capacity * 0.8) {
    return '#d97706';
  }

  return '#15803d';
};

const ChevronIcon = ({ expanded }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 999,
      background: expanded ? 'rgba(255, 255, 255, 0.16)' : '#e2e8f0',
      color: expanded ? '#ffffff' : '#1e3a8a',
      transform: `rotate(${expanded ? 180 : 0}deg)`,
      transition: 'transform 0.2s ease, background-color 0.2s ease, color 0.2s ease',
      flexShrink: 0,
    }}
  >
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classForm, setClassForm] = useState(EMPTY_CLASS_FORM);
  const [classEditForm, setClassEditForm] = useState(EMPTY_CLASS_FORM);
  const [labBatchForm, setLabBatchForm] = useState(EMPTY_LAB_BATCH_FORM);
  const [labBatchEditForm, setLabBatchEditForm] = useState(EMPTY_LAB_BATCH_FORM);
  const [classStudentSelection, setClassStudentSelection] = useState([]);
  const [labStudentSelection, setLabStudentSelection] = useState([]);
  const [labBatchAssignmentName, setLabBatchAssignmentName] = useState('');
  const [selectedLabBatchId, setSelectedLabBatchId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [classStudentSearch, setClassStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingClass, setSavingClass] = useState(false);
  const [updatingClass, setUpdatingClass] = useState(false);
  const [deletingSelectedClass, setDeletingSelectedClass] = useState(false);
  const [assigningStudents, setAssigningStudents] = useState(false);
  const [creatingLabBatch, setCreatingLabBatch] = useState(false);
  const [updatingSelectedLabBatch, setUpdatingSelectedLabBatch] = useState(false);
  const [deletingSelectedLabBatch, setDeletingSelectedLabBatch] = useState(false);
  const [assigningLabBatch, setAssigningLabBatch] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState(null);
  const [clearingLabBatchStudentId, setClearingLabBatchStudentId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchClasses();
      setClasses(response.classes || []);
      setStudents(response.students || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedClass = useMemo(
    () => classes.find((academicClass) => academicClass._id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedClassId(null);
      return;
    }

    if (selectedClassId && !classes.some((academicClass) => academicClass._id === selectedClassId)) {
      setSelectedClassId(null);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedClass) {
      setClassEditForm(EMPTY_CLASS_FORM);
      return;
    }

    setClassEditForm({
      name: selectedClass.name || '',
      capacity: selectedClass.capacity || 1,
      description: selectedClass.description || '',
    });
  }, [selectedClass]);

  const selectedLabBatch = useMemo(
    () => selectedClass?.labBatches.find((labBatch) => labBatch._id === selectedLabBatchId) || selectedClass?.labBatches[0] || null,
    [selectedClass, selectedLabBatchId]
  );

  useEffect(() => {
    if (!selectedClass?.labBatches?.length) {
      setSelectedLabBatchId(null);
      setLabBatchEditForm(EMPTY_LAB_BATCH_FORM);
      return;
    }

    if (!selectedClass.labBatches.some((labBatch) => labBatch._id === selectedLabBatchId)) {
      setSelectedLabBatchId(selectedClass.labBatches[0]._id);
    }
  }, [selectedClass, selectedLabBatchId]);

  useEffect(() => {
    if (!selectedLabBatch) {
      setLabBatchEditForm(EMPTY_LAB_BATCH_FORM);
      return;
    }

    setLabBatchEditForm({
      name: selectedLabBatch.name || '',
      capacity: selectedLabBatch.capacity || 1,
    });
  }, [selectedLabBatch]);

  useEffect(() => {
    if (!selectedClass?.labBatches?.length) {
      setLabBatchAssignmentName('');
      return;
    }

    if (!selectedClass.labBatches.some((labBatch) => labBatch.name === labBatchAssignmentName)) {
      setLabBatchAssignmentName(selectedClass.labBatches[0].name);
    }
  }, [selectedClass, labBatchAssignmentName]);

  const selectedClassStudents = useMemo(
    () => students.filter((student) => student.batch === selectedClass?.name),
    [students, selectedClass?.name]
  );
  const visibleStudents = useMemo(
    () => filterStudentsByQuery(students, studentSearch),
    [students, studentSearch]
  );
  const visibleClassStudents = useMemo(
    () => filterStudentsByQuery(selectedClassStudents, classStudentSearch),
    [selectedClassStudents, classStudentSearch]
  );
  const classUtilizationColor = useMemo(
    () => getCapacityTone(selectedClass?.studentCount || 0, selectedClass?.capacity || 0),
    [selectedClass?.capacity, selectedClass?.studentCount]
  );
  const selectedClassOpenSeats = useMemo(
    () => Math.max((selectedClass?.capacity || 0) - (selectedClass?.studentCount || 0), 0),
    [selectedClass?.capacity, selectedClass?.studentCount]
  );

  const toggleSelection = (currentSelection, setSelection, studentId) => {
    setSelection((prev) => (
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    ));
  };

  const handleCreateClass = async (event) => {
    event.preventDefault();
    setSavingClass(true);
    setError(null);

    try {
      const response = await createClass({
        name: classForm.name,
        capacity: Number(classForm.capacity),
        description: classForm.description,
      });
      showToast(response.message || 'Class created successfully.', { type: 'success' });
      setClassForm(EMPTY_CLASS_FORM);
      await loadData();
      if (response.class?._id) {
        setSelectedClassId(response.class._id);
      }
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setSavingClass(false);
    }
  };

  const handleAssignStudentsToClass = async () => {
    if (!selectedClass || classStudentSelection.length === 0) {
      return;
    }

    setAssigningStudents(true);
    setError(null);
    try {
      const response = await assignStudentsToClass(selectedClass._id, classStudentSelection);
      setClasses((response.classes || []).length ? response.classes : classes.map((academicClass) => academicClass._id === response.class._id ? response.class : academicClass));
      setStudents(response.students || students);
      setClassStudentSelection([]);
      showToast(response.message || 'Students assigned to class successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setAssigningStudents(false);
    }
  };

  const handleUpdateClass = async (event) => {
    event.preventDefault();
    if (!selectedClass) {
      return;
    }

    setUpdatingClass(true);
    setError(null);
    try {
      const response = await updateClass(selectedClass._id, {
        name: classEditForm.name,
        capacity: Number(classEditForm.capacity),
        description: classEditForm.description,
      });
      showToast(response.message || 'Class updated successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setUpdatingClass(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedClass.name}? This clears that class from students and teachers.`);
    if (!confirmed) {
      return;
    }

    setDeletingSelectedClass(true);
    setError(null);
    try {
      const response = await deleteClass(selectedClass._id);
      showToast(response.message || 'Class deleted successfully.', { type: 'success' });
      setSelectedClassId(null);
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setDeletingSelectedClass(false);
    }
  };

  const handleCreateLabBatch = async (event) => {
    event.preventDefault();
    if (!selectedClass) {
      return;
    }

    setCreatingLabBatch(true);
    setError(null);
    try {
      const response = await createLabBatch(selectedClass._id, {
        name: labBatchForm.name,
        capacity: Number(labBatchForm.capacity),
      });
      setLabBatchForm(EMPTY_LAB_BATCH_FORM);
      const createdLabBatch = response.class?.labBatches?.[response.class.labBatches.length - 1];
      setLabBatchAssignmentName(createdLabBatch?.name || labBatchAssignmentName);
      setSelectedLabBatchId(createdLabBatch?._id || null);
      showToast(response.message || 'Lab batch created successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setCreatingLabBatch(false);
    }
  };

  const handleUpdateSelectedLabBatch = async (event) => {
    event.preventDefault();
    if (!selectedClass || !selectedLabBatch) {
      return;
    }

    setUpdatingSelectedLabBatch(true);
    setError(null);
    try {
      const response = await updateLabBatch(selectedClass._id, selectedLabBatch._id, {
        name: labBatchEditForm.name,
        capacity: Number(labBatchEditForm.capacity),
      });
      showToast(response.message || 'Lab batch updated successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setUpdatingSelectedLabBatch(false);
    }
  };

  const handleDeleteSelectedLabBatch = async () => {
    if (!selectedClass || !selectedLabBatch) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedLabBatch.name}? Students in this lab batch will be unassigned.`);
    if (!confirmed) {
      return;
    }

    setDeletingSelectedLabBatch(true);
    setError(null);
    try {
      const response = await deleteLabBatch(selectedClass._id, selectedLabBatch._id);
      showToast(response.message || 'Lab batch deleted successfully.', { type: 'success' });
      setSelectedLabBatchId(null);
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setDeletingSelectedLabBatch(false);
    }
  };

  const handleAssignLabBatch = async (labBatchName = labBatchAssignmentName) => {
    if (!selectedClass || labStudentSelection.length === 0) {
      return;
    }

    setAssigningLabBatch(true);
    setError(null);
    try {
      const response = await assignLabBatch(selectedClass._id, {
        labBatchName,
        studentIds: labStudentSelection,
      });
      setStudents(response.students || students);
      setLabStudentSelection([]);
      showToast(response.message || 'Lab batch assignments updated successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setAssigningLabBatch(false);
    }
  };

  const handleRemoveStudentFromSelectedClass = async (studentId) => {
    if (!selectedClass || !studentId) {
      return;
    }

    const student = students.find((entry) => entry._id === studentId);
    const confirmed = window.confirm(`Remove ${student?.name || 'this student'} from ${selectedClass.name}? This also clears their lab batch.`);
    if (!confirmed) {
      return;
    }

    setRemovingStudentId(studentId);
    setError(null);
    try {
      const response = await removeStudentsFromClass(selectedClass._id, [studentId]);
      setStudents(response.students || students);
      showToast(response.message || 'Student removed from class successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setRemovingStudentId(null);
    }
  };

  const handleClearStudentLabBatch = async (studentId) => {
    if (!selectedClass || !studentId) {
      return;
    }

    setClearingLabBatchStudentId(studentId);
    setError(null);
    try {
      const response = await assignLabBatch(selectedClass._id, {
        labBatchName: '',
        studentIds: [studentId],
      });
      setStudents(response.students || students);
      showToast(response.message || 'Student removed from lab batch successfully.', { type: 'success' });
      await loadData();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setClearingLabBatchStudentId(null);
    }
  };

  const handleToggleClass = (classId) => {
    setSelectedClassId((currentId) => (currentId === classId ? null : classId));
  };

  return (
    <div className="container">
      <div className="nav">
        <h2>Manage Classes</h2>
        <div className="small">Theory classes and lab batches</div>
      </div>

      {error && <div className="card" style={{ color: '#dc2626' }}>{error}</div>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create Theory Class</h3>
        <form onSubmit={handleCreateClass}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label>Class Name</label>
              <input value={classForm.name} onChange={(event) => setClassForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g., TY-AIA-9" required />
            </div>
            <div className="form-group">
              <label>Student Capacity</label>
              <input type="number" min="1" value={classForm.capacity} onChange={(event) => setClassForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <input value={classForm.description} onChange={(event) => setClassForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Optional note about the class" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="submit" disabled={savingClass}>{savingClass ? 'Creating...' : 'Create Class'}</button>
          </div>
        </form>
      </div>

      <div className="card">
        {loading && <LoadingSpinner />}
        {!loading && classes.length === 0 && <p className="text-muted text-center">No classes created yet.</p>}
        {!loading && classes.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0 }}>Class List</h3>
                <div className="small">Click a class to open its students, details, and operations.</div>
              </div>
              <div className="small">Total classes: <strong>{classes.length}</strong></div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
            {classes.map((academicClass) => {
              const isActive = selectedClass?._id === academicClass._id;
              const classStudents = students.filter((student) => student.batch === academicClass.name);
              const visibleStudentsForSelectedClass = isActive ? visibleClassStudents : [];
              return (
                <div
                  key={academicClass._id}
                  style={{
                    border: `1px solid ${isActive ? '#93c5fd' : '#e5e7eb'}`,
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#fff',
                  }}
                >
                  <button
                    type="button"
                    className={isActive ? '' : 'button-secondary'}
                    onClick={() => handleToggleClass(academicClass._id)}
                    style={{ textAlign: 'left', padding: 16, borderRadius: 0, width: '100%' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ display: 'block', marginBottom: 4 }}>{academicClass.name}</strong>
                        <div className="small" style={{ color: getCapacityTone(academicClass.studentCount, academicClass.capacity) }}>
                          Students: {academicClass.studentCount} / {academicClass.capacity}
                        </div>
                        <div className="small">Lab Batches: {academicClass.labBatches.length ? academicClass.labBatches.map((labBatch) => `${labBatch.name} (${labBatch.studentCount}/${labBatch.capacity})`).join(', ') : 'None created yet'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isActive && <span className="badge badge-info">Selected</span>}
                        <ChevronIcon expanded={isActive} />
                      </div>
                    </div>
                  </button>

                  {isActive && (
                    <div style={{ padding: 20, borderTop: '1px solid #e5e7eb', display: 'grid', gap: 24 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div>
                            <h3 style={{ marginTop: 0, marginBottom: 6 }}>{academicClass.name}</h3>
                            <div className="small">{academicClass.description || 'No class description added yet.'}</div>
                          </div>
                          <div className="small" style={{ color: classUtilizationColor }}>
                            Utilization: <strong>{academicClass.studentCount} / {academicClass.capacity}</strong>
                          </div>
                        </div>

                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
                          <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>
                            <div className="small">Open Seats</div>
                            <strong>{Math.max((academicClass.capacity || 0) - (academicClass.studentCount || 0), 0)}</strong>
                          </div>
                          <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>
                            <div className="small">Lab Batches</div>
                            <strong>{academicClass.labBatches.length}</strong>
                          </div>
                          <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>
                            <div className="small">Students In Lab Batches</div>
                            <strong>{classStudents.filter((student) => student.labBatch).length}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 16 }}>
                        <h4 style={{ margin: 0 }}>Edit Theory Class</h4>
                        <p className="text-muted" style={{ margin: 0 }}>Renaming a class also updates teacher assignments and student class membership.</p>
                        <form onSubmit={handleUpdateClass}>
                          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                            <div className="form-group">
                              <label>Class Name</label>
                              <input value={classEditForm.name} onChange={(event) => setClassEditForm((prev) => ({ ...prev, name: event.target.value }))} required />
                            </div>
                            <div className="form-group">
                              <label>Student Capacity</label>
                              <input type="number" min="1" value={classEditForm.capacity} onChange={(event) => setClassEditForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))} required />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label>Description</label>
                              <input value={classEditForm.description} onChange={(event) => setClassEditForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Optional note about the class" />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                            <button type="button" className="button-secondary" onClick={handleDeleteClass} disabled={deletingSelectedClass || updatingClass}>
                              {deletingSelectedClass ? 'Deleting...' : 'Delete Class'}
                            </button>
                            <button type="submit" disabled={updatingClass || deletingSelectedClass}>
                              {updatingClass ? 'Saving...' : 'Save Class Changes'}
                            </button>
                          </div>
                        </form>
                      </div>

                      <div style={{ display: 'grid', gap: 16 }}>
                        <h4 style={{ margin: 0 }}>Student List</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div className="small">Students currently assigned to this class: <strong>{classStudents.length}</strong></div>
                          <input value={classStudentSearch} onChange={(event) => setClassStudentSearch(event.target.value)} placeholder="Search students in this class" style={{ minWidth: 260 }} />
                        </div>

                        {!classStudents.length && <p className="text-muted" style={{ margin: 0 }}>No students are assigned to this class yet.</p>}
                        {classStudents.length > 0 && (
                          <div style={{ overflowX: 'auto' }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Enrollment No</th>
                                  <th>Lab Batch</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleStudentsForSelectedClass.map((student) => {
                                  const isRemoving = removingStudentId === student._id;
                                  const isClearingLab = clearingLabBatchStudentId === student._id;
                                  return (
                                    <tr key={student._id}>
                                      <td>{student.name}</td>
                                      <td>{student.email}</td>
                                      <td>{student.enrollmentNo || 'Not set'}</td>
                                      <td>{student.labBatch || 'Not assigned'}</td>
                                      <td>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                          <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => handleClearStudentLabBatch(student._id)}
                                            disabled={!student.labBatch || isRemoving || isClearingLab}
                                          >
                                            {isClearingLab ? 'Clearing...' : 'Clear Lab'}
                                          </button>
                                          <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => handleRemoveStudentFromSelectedClass(student._id)}
                                            disabled={isRemoving || isClearingLab}
                                          >
                                            {isRemoving ? 'Removing...' : 'Remove From Class'}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 16 }}>
                        <h4 style={{ margin: 0 }}>Assign Students To {academicClass.name}</h4>
                        <p className="text-muted" style={{ margin: 0 }}>A student belongs to only one theory class. Assigning them here moves them into this class and clears any previous lab batch.</p>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search all students by name, email, or enrollment number" />
                          <button type="button" className="button-secondary" onClick={() => setClassStudentSelection(visibleStudents.map((student) => student._id))}>Select Visible</button>
                          <button type="button" className="button-secondary" onClick={() => setClassStudentSelection([])}>Clear Selection</button>
                          <div className="small">Selected: <strong>{classStudentSelection.length}</strong></div>
                        </div>
                        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                          {visibleStudents.map((student) => (
                            <label key={student._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                              <input type="checkbox" checked={classStudentSelection.includes(student._id)} onChange={() => toggleSelection(classStudentSelection, setClassStudentSelection, student._id)} />
                              <div>
                                <div style={{ fontWeight: 600 }}>{student.name}</div>
                                <div className="small">{student.email} | {student.enrollmentNo || 'No enrollment number'}</div>
                                <div className="small">Current Class: {student.batch || 'Unassigned'} | Lab Batch: {student.labBatch || 'Not assigned'}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={handleAssignStudentsToClass} disabled={assigningStudents || classStudentSelection.length === 0}>
                            {assigningStudents ? 'Assigning...' : `Assign Selected Students To ${academicClass.name}`}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 16 }}>
                        <h4 style={{ margin: 0 }}>Lab Batch Operations</h4>

                        <div style={{ display: 'grid', gap: 12 }}>
                          <h5 style={{ margin: 0 }}>Create Lab Batch</h5>
                          <form onSubmit={handleCreateLabBatch}>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                              <div className="form-group">
                                <label>Lab Batch Name</label>
                                <input value={labBatchForm.name} onChange={(event) => setLabBatchForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g., Batch A" required />
                              </div>
                              <div className="form-group">
                                <label>Batch Capacity</label>
                                <input type="number" min="1" value={labBatchForm.capacity} onChange={(event) => setLabBatchForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))} required />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                              <button type="submit" disabled={creatingLabBatch}>{creatingLabBatch ? 'Creating...' : 'Create Lab Batch'}</button>
                            </div>
                          </form>
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                          <h5 style={{ margin: 0 }}>Edit Existing Lab Batches</h5>
                          {!academicClass.labBatches.length && <p className="text-muted" style={{ margin: 0 }}>Create a lab batch to edit or delete it.</p>}
                          {academicClass.labBatches.length > 0 && (
                            <>
                              <div style={{ display: 'grid', gap: 12 }}>
                                {academicClass.labBatches.map((labBatch) => {
                                  const isSelectedLabBatch = selectedLabBatch?._id === labBatch._id;
                                  return (
                                    <button
                                      key={labBatch._id}
                                      type="button"
                                      className={isSelectedLabBatch ? '' : 'button-secondary'}
                                      onClick={() => setSelectedLabBatchId(labBatch._id)}
                                      style={{ textAlign: 'left', padding: 12, borderRadius: 10 }}
                                    >
                                      <strong style={{ display: 'block' }}>{labBatch.name}</strong>
                                      <div className="small">Students: {labBatch.studentCount} / {labBatch.capacity}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              {selectedLabBatch && (
                                <form onSubmit={handleUpdateSelectedLabBatch}>
                                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                                    <div className="form-group">
                                      <label>Lab Batch Name</label>
                                      <input value={labBatchEditForm.name} onChange={(event) => setLabBatchEditForm((prev) => ({ ...prev, name: event.target.value }))} required />
                                    </div>
                                    <div className="form-group">
                                      <label>Batch Capacity</label>
                                      <input type="number" min="1" value={labBatchEditForm.capacity} onChange={(event) => setLabBatchEditForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))} required />
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                                    <button type="button" className="button-secondary" onClick={handleDeleteSelectedLabBatch} disabled={deletingSelectedLabBatch || updatingSelectedLabBatch}>
                                      {deletingSelectedLabBatch ? 'Deleting...' : 'Delete Lab Batch'}
                                    </button>
                                    <button type="submit" disabled={updatingSelectedLabBatch || deletingSelectedLabBatch}>
                                      {updatingSelectedLabBatch ? 'Saving...' : 'Save Lab Batch Changes'}
                                    </button>
                                  </div>
                                </form>
                              )}
                            </>
                          )}
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                          <h5 style={{ margin: 0 }}>Assign Students To Lab Batches</h5>
                          <p className="text-muted" style={{ margin: 0 }}>Students must already belong to {academicClass.name}. Choosing a different lab batch moves the selected students there. Leave the lab batch blank to remove them from lab groups.</p>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <select value={labBatchAssignmentName} onChange={(event) => setLabBatchAssignmentName(event.target.value)}>
                              <option value="">Remove from lab batch</option>
                              {academicClass.labBatches.map((labBatch) => (
                                <option key={labBatch._id} value={labBatch.name}>{labBatch.name} ({labBatch.studentCount}/{labBatch.capacity})</option>
                              ))}
                            </select>
                            <button type="button" className="button-secondary" onClick={() => setLabStudentSelection(visibleStudentsForSelectedClass.map((student) => student._id))}>Select Visible</button>
                            <button type="button" className="button-secondary" onClick={() => setLabStudentSelection([])}>Clear Selection</button>
                            <div className="small">Selected: <strong>{labStudentSelection.length}</strong></div>
                          </div>
                          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                            {visibleStudentsForSelectedClass.map((student) => (
                              <label key={student._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                                <input type="checkbox" checked={labStudentSelection.includes(student._id)} onChange={() => toggleSelection(labStudentSelection, setLabStudentSelection, student._id)} />
                                <div>
                                  <div style={{ fontWeight: 600 }}>{student.name}</div>
                                  <div className="small">{student.email} | {student.enrollmentNo || 'No enrollment number'}</div>
                                  <div className="small">Current Lab Batch: {student.labBatch || 'Not assigned'}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => handleAssignLabBatch(labBatchAssignmentName)} disabled={assigningLabBatch || labStudentSelection.length === 0}>
                              {assigningLabBatch ? 'Saving...' : (labBatchAssignmentName ? `Assign Selected To ${labBatchAssignmentName}` : 'Remove Selected From Lab Batch')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}