const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/user.model');
const { normalizeUserIdentity } = require('../src/utils/userIdentity');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_mcq_exam_system';
const shouldApply = process.argv.includes('--apply');

(async () => {
  try {
    await connectDB(MONGO_URI);

    const users = await User.find({}).select('_id email name firstName lastName');
    let inspected = 0;
    let changed = 0;

    console.log(shouldApply ? 'Running user name backfill in APPLY mode...' : 'Running user name backfill in DRY-RUN mode...');

    for (const user of users) {
      inspected += 1;
      const normalizedIdentity = normalizeUserIdentity({
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      const needsUpdate = user.name !== normalizedIdentity.name
        || (user.firstName || '') !== normalizedIdentity.firstName
        || (user.lastName || '') !== normalizedIdentity.lastName;

      if (!needsUpdate) {
        continue;
      }

      changed += 1;
      console.log(`[${shouldApply ? 'apply' : 'preview'}] ${user.email}: "${user.name}" -> firstName="${normalizedIdentity.firstName}", lastName="${normalizedIdentity.lastName}"`);

      if (shouldApply) {
        user.name = normalizedIdentity.name;
        user.firstName = normalizedIdentity.firstName;
        user.lastName = normalizedIdentity.lastName;
        await user.save();
      }
    }

    console.log(`Inspected ${inspected} users.`);
    console.log(`${shouldApply ? 'Updated' : 'Would update'} ${changed} users.`);
    console.log(shouldApply ? 'Backfill complete.' : 'Dry-run complete. Re-run with --apply to persist changes.');

    process.exit(0);
  } catch (error) {
    console.error('Failed to backfill user names:', error);
    process.exit(1);
  }
})();