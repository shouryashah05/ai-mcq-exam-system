import React, { useEffect, useRef, useState } from 'react';
import { bulkCreateUsers, createUserAccount, fetchUsers, sendUserPasswordLink, updateRole, toggleStatus } from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';
import { downloadCsv } from '../utils/csvExport';
import { showToast } from '../utils/appEvents';

const MAX_BULK_USERS = 500;

export default function AdminUsers(){
  const emptyBulkSelection = {
    fileName: '',
    users: [],
    totalRows: 0,
    overLimit: false,
    parseError: '',
  };
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    enrollmentNo: '',
    password: '',
    role: 'student',
    sendInvite: false,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [sendingLinkId, setSendingLinkId] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [error, setError] = useState(null);
  const [bulkForm, setBulkForm] = useState({
    temporaryPassword: '',
    sendInvite: true,
  });
  const [bulkSelection, setBulkSelection] = useState(emptyBulkSelection);
  const bulkFileInputRef = useRef(null);

  const load = async () => {
    setError(null);
    try{
      const res = await fetchUsers();
      setUsers(res.users || []);
    }catch(err){
      setError(err?.response?.data?.message || err.message);
    }finally{setLoading(false)}
  };

  useEffect(()=>{load()},[]);

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleBulkOptionChange = (event) => {
    const { name, value, type, checked } = event.target;
    setBulkForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetBulkSelection = () => {
    setBulkSelection(emptyBulkSelection);
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError(null);

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ');
    const trimmedEmail = form.email.trim();
    const trimmedEnrollmentNo = form.enrollmentNo.trim();

    if (!trimmedName || !trimmedEmail || (!form.sendInvite && !form.password.trim())) {
      setError('First name, last name, email, and either a temporary password or setup invite are required.');
      return;
    }

    setCreating(true);
    try {
      const response = await createUserAccount({
        name: trimmedName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        enrollmentNo: trimmedEnrollmentNo,
        password: form.sendInvite ? undefined : form.password,
        role: form.role,
        sendInvite: form.sendInvite,
      });
      showToast(response.message || 'Account created successfully.', { type: 'success' });
      setForm({ firstName: '', lastName: '', email: '', enrollmentNo: '', password: '', role: 'student', sendInvite: false });
      await load();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleSendPasswordLink = async (userId) => {
    setError(null);
    setSendingLinkId(userId);
    try {
      const response = await sendUserPasswordLink(userId);
      showToast(response.message || 'Password access email sent successfully.', { type: 'success' });
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setSendingLinkId(null);
    }
  };

  const downloadBulkSampleCsv = () => {
    const sampleData = [
      ['firstName', 'lastName', 'email', 'enrollmentNo', 'role'],
      ['Aarav', 'Patel', 'aarav@example.com', 'STU001', 'student'],
      ['Diya', 'Shah', 'diya@example.com', 'STU002', 'student'],
      ['Rohan', 'Mehta', 'rohan@example.com', 'STU003', 'student'],
    ];

    const csvContent = sampleData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sample_users.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parseBulkRows = async (file) => {
    const text = await file.text();

    if (file.name.toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON import must be an array of users');
      }
      return parsed;
    }

    const Papa = (await import('papaparse')).default;
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${parsed.errors.map((entry) => entry.message).join(', ')}`);
    }

    return parsed.data;
  };

  const normalizeBulkUserRow = (row, index) => {
    const firstName = String(row.firstName || '').trim();
    const lastName = String(row.lastName || '').trim();
    const email = String(row.email || '').trim();
    const enrollmentNo = String(row.enrollmentNo || row.enrollment || '').trim();
    const role = String(row.role || 'student').trim().toLowerCase() || 'student';

    if (!firstName || !lastName || !email) {
      throw new Error(`Row ${index + 2}: firstName, lastName, and email are required`);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Row ${index + 2}: email must be valid`);
    }

    if (!['student', 'admin'].includes(role)) {
      throw new Error(`Row ${index + 2}: role must be student or admin`);
    }

    return {
      firstName,
      lastName,
      email,
      enrollmentNo,
      role,
    };
  };

  const handleBulkFileUpload = async (file) => {
    setBulkResult(null);
    if (!file) return;
    setError(null);

    try {
      const rows = await parseBulkRows(file);
      const usersPayload = rows.map((row, index) => normalizeBulkUserRow(row, index));

      if (!usersPayload.length) {
        throw new Error('No valid users found in the uploaded file');
      }

      const overLimit = usersPayload.length > MAX_BULK_USERS;
      setBulkSelection({
        fileName: file.name,
        users: usersPayload,
        totalRows: usersPayload.length,
        overLimit,
        parseError: '',
      });

      if (overLimit) {
        const message = `Selected file contains ${usersPayload.length} users. Bulk import supports up to ${MAX_BULK_USERS} users per upload.`;
        setError(message);
        showToast(message, { type: 'error' });
        return;
      }

      showToast(`Validated ${usersPayload.length} users from ${file.name}. Ready to import.`, { type: 'success' });
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setBulkSelection({
        fileName: file.name,
        users: [],
        totalRows: 0,
        overLimit: false,
        parseError: message,
      });
      setBulkResult({ error: message });
      setError(message);
      showToast(message, { type: 'error' });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkForm.temporaryPassword.trim()) {
      const message = 'Temporary password is required before importing users.';
      setError(message);
      showToast(message, { type: 'error' });
      return;
    }

    if (!bulkSelection.users.length) {
      const message = 'Select a valid CSV or JSON file before starting the import.';
      setError(message);
      showToast(message, { type: 'error' });
      return;
    }

    if (bulkSelection.overLimit) {
      const message = `Selected file contains ${bulkSelection.totalRows} users. Split it into smaller batches of ${MAX_BULK_USERS} or fewer.`;
      setError(message);
      showToast(message, { type: 'error' });
      return;
    }

    setBulkUploading(true);
    setBulkResult(null);
    setError(null);

    try {
      const response = await bulkCreateUsers({
        users: bulkSelection.users,
        temporaryPassword: bulkForm.temporaryPassword,
        sendInvite: bulkForm.sendInvite,
      });

      setBulkResult(response);
      showToast(response.message || 'Bulk user import completed.', {
        type: response.failedCount > 0 ? 'warning' : 'success',
      });
      await load();
      resetBulkSelection();
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setBulkResult({ error: message });
      setError(message);
      showToast(message, { type: 'error' });
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadBulkFailuresCsv = () => {
    if (!bulkResult?.errors?.length) {
      return;
    }

    downloadCsv('bulk_user_import_failures.csv', [
      { key: 'row', label: 'row' },
      { key: 'email', label: 'email' },
      { key: 'message', label: 'error' },
    ], bulkResult.errors.map((rowError) => ({
      row: rowError.row,
      email: rowError.email || '',
      message: rowError.message,
    })));
  };

  const changeRole = async (id, role) => {
    try{
      await updateRole(id, role);
      await load();
    }catch(err){
      showToast(err?.response?.data?.message || err.message, { type: 'error' });
    }
  };

  const changeStatus = async (id) => {
    try{
      await toggleStatus(id);
      await load();
    }catch(err){
      showToast(err?.response?.data?.message || err.message, { type: 'error' });
    }
  };

  return (
    <div className="container">
      <div className="nav"><h2>Manage Users</h2><div className="small">Admin panel</div></div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create Account</h3>
        <p className="text-muted">Only administrators can provision new platform accounts.</p>
        <form onSubmit={handleCreateUser}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label htmlFor="admin-user-first-name">First Name</label>
              <input id="admin-user-first-name" name="firstName" value={form.firstName} onChange={handleFormChange} placeholder="e.g., Alex" required />
            </div>
            <div className="form-group">
              <label htmlFor="admin-user-last-name">Last Name</label>
              <input id="admin-user-last-name" name="lastName" value={form.lastName} onChange={handleFormChange} placeholder="e.g., Johnson" required />
            </div>
            <div className="form-group">
              <label htmlFor="admin-user-email">Email</label>
              <input id="admin-user-email" name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="user@example.com" required />
            </div>
            <div className="form-group">
              <label htmlFor="admin-user-enrollment">Enrollment Number</label>
              <input id="admin-user-enrollment" name="enrollmentNo" value={form.enrollmentNo} onChange={handleFormChange} placeholder="Optional auto-generated" />
            </div>
            <div className="form-group">
              <label htmlFor="admin-user-password">Temporary Password</label>
              <input id="admin-user-password" name="password" type="password" value={form.password} onChange={handleFormChange} placeholder={form.sendInvite ? 'Not needed when sending invite' : 'Set an initial password'} required={!form.sendInvite} disabled={form.sendInvite} />
            </div>
            <div className="form-group">
              <label htmlFor="admin-user-role">Role</label>
              <select id="admin-user-role" name="role" value={form.role} onChange={handleFormChange}>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label htmlFor="admin-user-send-invite" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                <input id="admin-user-send-invite" name="sendInvite" type="checkbox" checked={form.sendInvite} onChange={handleFormChange} style={{ width: 16, height: 16 }} />
                Send account setup email
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create Account'}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Bulk Import Users</h3>
          {bulkSelection.fileName && (
            <span className={`badge ${bulkSelection.overLimit || bulkSelection.parseError ? 'badge-danger' : 'badge-info'}`}>
              {bulkSelection.totalRows > 0 ? `${bulkSelection.totalRows} row${bulkSelection.totalRows === 1 ? '' : 's'}` : 'file selected'}
            </span>
          )}
        </div>
        <p className="text-muted">Upload a CSV or JSON file to create many accounts at once with one temporary password for the batch. Maximum {MAX_BULK_USERS} users per upload.</p>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div className="form-group">
            <label htmlFor="bulk-user-password">Temporary Password</label>
            <input
              id="bulk-user-password"
              name="temporaryPassword"
              type="password"
              value={bulkForm.temporaryPassword}
              onChange={handleBulkOptionChange}
              placeholder="Shared password for imported users"
              required
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label htmlFor="bulk-user-send-invite" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <input
                id="bulk-user-send-invite"
                name="sendInvite"
                type="checkbox"
                checked={bulkForm.sendInvite}
                onChange={handleBulkOptionChange}
                style={{ width: 16, height: 16 }}
              />
              Send invite email to each imported user
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".csv,.json"
              style={{ display: 'none' }}
              onChange={(event) => handleBulkFileUpload(event.target.files?.[0])}
            />
            <button type="button" className="button-secondary" onClick={downloadBulkSampleCsv}>
              Download Sample CSV
            </button>
            <button type="button" className="button-secondary" onClick={() => bulkFileInputRef.current?.click()} disabled={bulkUploading}>
              Choose CSV or JSON
            </button>
            <button type="button" onClick={handleBulkImport} disabled={bulkUploading || !bulkSelection.users.length || bulkSelection.overLimit || Boolean(bulkSelection.parseError)}>
              {bulkUploading ? 'Importing…' : 'Start Import'}
            </button>
            <button type="button" className="button-secondary" onClick={resetBulkSelection} disabled={bulkUploading || !bulkSelection.fileName}>
              Clear Selection
            </button>
          </div>
        </div>

        {bulkSelection.fileName && (
          <div className={`alert ${bulkSelection.overLimit || bulkSelection.parseError ? 'alert-danger' : 'alert-info'}`} style={{ marginTop: 16 }}>
            <strong>{bulkSelection.fileName}</strong>
            <div style={{ marginTop: 6 }}>
              {bulkSelection.parseError
                ? bulkSelection.parseError
                : `Detected ${bulkSelection.totalRows} user row(s). ${bulkSelection.overLimit ? `Split this file into batches of ${MAX_BULK_USERS} or fewer before importing.` : 'File is ready to import.'}`}
            </div>
          </div>
        )}

        {bulkResult && !bulkResult.error && (
          <div style={{ marginTop: 16 }}>
            <div className={`alert ${bulkResult.failedCount > 0 ? 'alert-warning' : 'alert-success'}`}>
              Created {bulkResult.createdCount} account(s). Failed {bulkResult.failedCount}.
            </div>
            {bulkResult.errors?.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button type="button" className="button-secondary" onClick={downloadBulkFailuresCsv}>
                    Download Failed Rows CSV
                  </button>
                </div>
                <div className="report-table" style={{ marginTop: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Email</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResult.errors.map((rowError, index) => (
                        <tr key={`${rowError.row}-${rowError.email}-${index}`}>
                          <td>{rowError.row}</td>
                          <td>{rowError.email || 'N/A'}</td>
                          <td>{rowError.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {bulkResult?.error && <div className="alert alert-danger" style={{ marginTop: 16 }}>{bulkResult.error}</div>}
      </div>

      <div className="card">
        {loading && <LoadingSpinner />}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !users.length && <p className="text-muted text-center">No users found.</p>}
        {!loading && users.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u=> (
                <tr key={u._id}>
                  <td><strong>{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.name}</strong></td>
                  <td className="text-small">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-info'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {u.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="button-sm button-secondary" onClick={()=>changeRole(u._id, u.role === 'student' ? 'admin' : 'student')}>
                      {u.role === 'student' ? 'Make Admin' : 'Make Student'}
                    </button>
                    <button className="button-sm button-secondary" onClick={() => handleSendPasswordLink(u._id)} style={{ marginLeft:'4px' }} disabled={sendingLinkId === u._id}>
                      {sendingLinkId === u._id ? 'Sending…' : (u.isVerified ? 'Send Reset Link' : 'Send Setup Link')}
                    </button>
                    <button 
                      className={`button-sm ${u.isActive ? 'button-danger' : 'button-success'}`} 
                      onClick={()=>changeStatus(u._id)}
                      style={{marginLeft:'4px'}}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
