const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_mcq_exam_system';
const shouldApply = process.argv.includes('--apply');
const defaultStudentBatch = process.env.DEFAULT_BACKFILL_STUDENT_BATCH || 'UNASSIGNED';
const defaultTeacherBatch = process.env.DEFAULT_BACKFILL_TEACHER_BATCH || 'UNASSIGNED';

(async () => {
  try {
    await connectDB(MONGO_URI);

    const users = await User.find({ role: { $in: ['student', 'teacher'] } }).select('_id email role batch assignedBatches');
    let inspected = 0;
    let changed = 0;

    console.log(shouldApply ? 'Running user assignment backfill in APPLY mode...' : 'Running user assignment backfill in DRY-RUN mode...');

    for (const user of users) {
      inspected += 1;
      let needsUpdate = false;

      if (user.role === 'student' && !String(user.batch || '').trim()) {
        needsUpdate = true;
        console.log(`[${shouldApply ? 'apply' : 'preview'}] ${user.email}: set missing student batch -> ${defaultStudentBatch}`);
        if (shouldApply) {
          user.batch = defaultStudentBatch;
        }
      }

      if (user.role === 'teacher' && (!Array.isArray(user.assignedBatches) || user.assignedBatches.length === 0)) {
        needsUpdate = true;
        console.log(`[${shouldApply ? 'apply' : 'preview'}] ${user.email}: set missing teacher assignedBatches -> ${defaultTeacherBatch}`);
        if (shouldApply) {
          user.assignedBatches = [defaultTeacherBatch];
        }
      }

      if (!needsUpdate) {
        continue;
      }

      changed += 1;
      if (shouldApply) {
        await user.save();
      }
    }

    console.log(`Inspected ${inspected} users.`);
    console.log(`${shouldApply ? 'Updated' : 'Would update'} ${changed} users.`);
    console.log(shouldApply ? 'Assignment backfill complete.' : 'Dry-run complete. Re-run with --apply to persist changes.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to backfill user assignments:', error);
    process.exit(1);
  }
})();