const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_mcq_exam_system';
const shouldApply = process.argv.includes('--apply');

const extractNumericAdminId = (value) => {
  const match = String(value || '').trim().toUpperCase().match(/^ADM-?(\d+)$/);
  return match ? Number(match[1]) : null;
};

const buildNextAdminId = (usedAdminIds) => {
  let nextNumber = 1;

  usedAdminIds.forEach((adminId) => {
    const numericValue = extractNumericAdminId(adminId);
    if (numericValue !== null && numericValue >= nextNumber) {
      nextNumber = numericValue + 1;
    }
  });

  let nextAdminId = `ADM${String(nextNumber).padStart(3, '0')}`;
  while (usedAdminIds.has(nextAdminId)) {
    nextNumber += 1;
    nextAdminId = `ADM${String(nextNumber).padStart(3, '0')}`;
  }

  usedAdminIds.add(nextAdminId);
  return nextAdminId;
};

(async () => {
  try {
    await connectDB(MONGO_URI);

    const admins = await User.find({ role: 'admin' }).select('_id email adminId');
    const usedAdminIds = new Set(
      admins
        .map((admin) => String(admin.adminId || '').trim().toUpperCase())
        .filter(Boolean)
    );

    let inspected = 0;
    let changed = 0;

    console.log(shouldApply ? 'Running admin ID backfill in APPLY mode...' : 'Running admin ID backfill in DRY-RUN mode...');

    for (const admin of admins) {
      inspected += 1;
      if (String(admin.adminId || '').trim()) {
        continue;
      }

      const nextAdminId = buildNextAdminId(usedAdminIds);
      changed += 1;
      console.log(`[${shouldApply ? 'apply' : 'preview'}] ${admin.email}: set missing adminId -> ${nextAdminId}`);

      if (shouldApply) {
        await User.updateOne(
          { _id: admin._id },
          { $set: { adminId: nextAdminId } },
          { runValidators: false },
        );
      }
    }

    console.log(`Inspected ${inspected} admin users.`);
    console.log(`${shouldApply ? 'Updated' : 'Would update'} ${changed} admin users.`);
    console.log(shouldApply ? 'Admin ID backfill complete.' : 'Dry-run complete. Re-run with --apply to persist changes.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to backfill admin IDs:', error);
    process.exit(1);
  }
})();