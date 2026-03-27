const { test, expect } = require('@playwright/test');

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel(/Enrollment Number or Email/i).fill(email);
  await page.getByLabel(/Password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test('admin can create a managed user account and that user can sign in', async ({ page }) => {
  const uniqueId = Date.now();
  const email = `playwright_${uniqueId}@example.com`;
  const enrollmentNo = `PW${uniqueId}`;
  const password = 'Password123!';

  await login(page, 'admin@example.com', 'ChangeMe123!');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.locator('header').getByRole('button', { name: /^Users$/i }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);

  await page.getByLabel(/First Name/i).fill('Playwright');
  await page.getByLabel(/Last Name/i).fill('Student');
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/Enrollment Number/i).fill(enrollmentNo);
  await page.locator('#admin-user-password').fill(password);
  await page.getByLabel(/^Role$/i).selectOption('student');
  await page.getByLabel(/^Batch$/i).fill('PW-BATCH-A');
  await page.getByRole('button', { name: /^Create Account$/i }).click();

  await expect(page.getByText(/account created successfully/i)).toBeVisible();
  await page.getByRole('button', { name: /^Logout$/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/Placement Readiness/i)).toBeVisible();
});

test('student can log in, navigate analytics, and log out', async ({ page }) => {
  await login(page, 'student@example.com', 'ChangeMe123!');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/Placement Readiness/i)).toBeVisible();

  await page.getByRole('button', { name: /analytics/i }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByText(/My Performance Analytics/i)).toBeVisible();

  await page.getByRole('button', { name: /^Logout$/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/logged out/i)).toBeVisible();
});

test('unauthenticated admin route redirects to login and admin can open reports', async ({ page }) => {
  await page.goto('/admin/reports');
  await expect(page).toHaveURL(/\/login$/);

  await login(page, 'admin@example.com', 'ChangeMe123!');

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.locator('header').getByRole('button', { name: /^Reports$/i }).click();
  await expect(page).toHaveURL(/\/admin\/reports$/);
  await expect(page.getByText(/Performance Reports/i)).toBeVisible();
});

test('admin can preview bulk imports, block over-limit files, and download failed rows', async ({ page }) => {
  const uniqueId = Date.now();
  const validEmail = `bulk_partial_${uniqueId}@example.com`;

  const overLimitRows = ['firstName,lastName,email,enrollmentNo,role,batch'];
  for (let index = 0; index < 501; index += 1) {
    overLimitRows.push(`Bulk${index},Student${index},bulk_limit_${uniqueId}_${index}@example.com,BULK${index},student,BATCH-A`);
  }

  const partialImportCsv = [
    'firstName,lastName,email,enrollmentNo,role,batch',
    `Bulk,Success,${validEmail},BULKOK${uniqueId},student,BATCH-A`,
    `Existing,Student,student@example.com,BULKDUP${uniqueId},student,BATCH-B`,
  ].join('\n');

  await login(page, 'admin@example.com', 'ChangeMe123!');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.locator('header').getByRole('button', { name: /^Users$/i }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);

  await page.locator('#bulk-user-password').fill('BulkTemp123!');
  await page.locator('#bulk-user-send-invite').uncheck();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'over-limit-users.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(overLimitRows.join('\n')),
  });

  await expect(page.locator('.card .alert').filter({ hasText: /Selected file contains 501 users/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Start Import$/i })).toBeDisabled();

  await page.getByRole('button', { name: /^Clear Selection$/i }).click();
  await expect(page.getByText('over-limit-users.csv')).not.toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'partial-import-users.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(partialImportCsv),
  });

  await expect(page.getByText(/Detected 2 user row\(s\)/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Start Import$/i })).toBeEnabled();

  await page.getByRole('button', { name: /^Start Import$/i }).click();

  await expect(page.getByText(/Created 1 account\(s\)\. Failed 1\./i)).toBeVisible();
  await expect(page.locator('.report-table').getByRole('cell', { name: /student@example.com/i })).toBeVisible();
  await expect(page.getByText(validEmail)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Download Failed Rows CSV$/i }).click();
  const download = await downloadPromise;
  await expect(download.suggestedFilename()).toBe('bulk_user_import_failures.csv');
});

test('admin can create and edit a teacher account, and the teacher can access scoped analytics routes', async ({ page }) => {
  const uniqueId = Date.now();
  const teacherEmail = `teacher_${uniqueId}@example.com`;
  const teacherEnrollment = `TCH${uniqueId}`;
  const teacherPassword = 'TeacherPass123!';

  await login(page, 'admin@example.com', 'ChangeMe123!');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);

  await page.locator('header').getByRole('button', { name: /^Users$/i }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);

  await page.getByLabel(/First Name/i).fill('Playwright');
  await page.getByLabel(/Last Name/i).fill('Teacher');
  await page.getByLabel(/^Email$/i).fill(teacherEmail);
  await page.getByLabel(/Enrollment Number/i).fill(teacherEnrollment);
  await page.locator('#admin-user-password').fill(teacherPassword);
  await page.getByLabel(/^Role$/i).selectOption('teacher');
  await page.getByLabel(/Employee ID/i).fill(`EMP-${uniqueId}`);
  await page.getByLabel(/Department/i).fill('Computer Science');
  await page.getByLabel(/Assigned Subjects/i).fill('DBMS');
  await page.getByLabel(/Assigned Batches/i).fill('2026-A');
  await page.getByRole('button', { name: /^Create Account$/i }).click();

  await expect(page.getByText(/teacher account created successfully/i)).toBeVisible();

  const teacherRow = page.locator('tr', { hasText: teacherEmail });
  await expect(teacherRow).toBeVisible();
  await teacherRow.getByRole('button', { name: /^Edit Details$/i }).click();

  await page.getByLabel(/^Assigned Subjects$/i).fill('DBMS, DSA');
  await page.getByLabel(/^Assigned Batches$/i).fill('2026-A, 2026-B');
  await page.getByRole('button', { name: /^Save Details$/i }).click();

  await expect(page.getByText(/user details updated successfully/i)).toBeVisible();
  await expect(page.locator('tr', { hasText: teacherEmail })).toContainText('2026-B');

  await page.getByRole('button', { name: /^Logout$/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, teacherEmail, teacherPassword);
  await expect(page).toHaveURL(/\/teacher\/dashboard$/);
  await expect(page.getByText(/Teacher Dashboard/i)).toBeVisible();

  await page.locator('header').getByRole('button', { name: /^Questions$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/questions$/);
  await expect(page.getByText(/Manage My Questions/i)).toBeVisible();

  await page.locator('header').getByRole('button', { name: /^Exams$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/exams$/);
  await expect(page.getByText(/Manage My Exams/i)).toBeVisible();

  await page.locator('header').getByRole('button', { name: /^Reports$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/reports$/);
  await expect(page.getByText(/Teacher Reports/i)).toBeVisible();

  await page.locator('header').getByRole('button', { name: /^Analytics$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/analytics$/);
  await expect(page.getByText(/Assigned Batch Analytics/i)).toBeVisible();
});