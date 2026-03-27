const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_mcq_exam_system';
const shouldApply = process.argv.includes('--apply');

const extractNumericEmployeeId = (value) => {
  const match = String(value || '').trim().toUpperCase().match(/^EMP-?(\d+)$/);
  return match ? Number(match[1]) : null;
};

const buildNextEmployeeId = (usedEmployeeIds) => {
  let nextNumber = 1;

  usedEmployeeIds.forEach((employeeId) => {
    const numericValue = extractNumericEmployeeId(employeeId);
    if (numericValue !== null && numericValue >= nextNumber) {
      nextNumber = numericValue + 1;
    }
  });

  let nextEmployeeId = `EMP${String(nextNumber).padStart(3, '0')}`;
  while (usedEmployeeIds.has(nextEmployeeId)) {
    nextNumber += 1;
    nextEmployeeId = `EMP${String(nextNumber).padStart(3, '0')}`;
  }

  usedEmployeeIds.add(nextEmployeeId);
  return nextEmployeeId;
};

(async () => {
  try {
    await connectDB(MONGO_URI);

    const teachers = await User.find({ role: 'teacher' }).select('_id email employeeId');
    const usedEmployeeIds = new Set(
      teachers
        .map((teacher) => String(teacher.employeeId || '').trim().toUpperCase())
        .filter(Boolean)
    );

    let inspected = 0;
    let changed = 0;

    console.log(shouldApply ? 'Running employee ID backfill in APPLY mode...' : 'Running employee ID backfill in DRY-RUN mode...');

    for (const teacher of teachers) {
      inspected += 1;
      if (String(teacher.employeeId || '').trim()) {
        continue;
      }

      const nextEmployeeId = buildNextEmployeeId(usedEmployeeIds);
      changed += 1;
      console.log(`[${shouldApply ? 'apply' : 'preview'}] ${teacher.email}: set missing employeeId -> ${nextEmployeeId}`);

      if (shouldApply) {
        await User.updateOne(
          { _id: teacher._id },
          { $set: { employeeId: nextEmployeeId } },
          { runValidators: false },
        );
      }
    }

    console.log(`Inspected ${inspected} teacher users.`);
    console.log(`${shouldApply ? 'Updated' : 'Would update'} ${changed} teacher users.`);
    console.log(shouldApply ? 'Employee ID backfill complete.' : 'Dry-run complete. Re-run with --apply to persist changes.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to backfill employee IDs:', error);
    process.exit(1);
  }
})();