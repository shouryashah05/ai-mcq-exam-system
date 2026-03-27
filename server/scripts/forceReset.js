const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../src/config/db');
const User = require('../src/models/user.model');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_mcq_exam_system';
const adminEmail = process.env.FORCE_RESET_ADMIN_EMAIL;
const studentEmail = process.env.FORCE_RESET_STUDENT_EMAIL;
const password = process.env.FORCE_RESET_PASSWORD;

if (!adminEmail || !studentEmail || !password) {
    throw new Error('FORCE_RESET_ADMIN_EMAIL, FORCE_RESET_STUDENT_EMAIL, and FORCE_RESET_PASSWORD are required');
}

(async () => {
    try {
        await connectDB(MONGO_URI);

        // --- Admin Reset ---
        const email = adminEmail;

        let user = await User.findOne({ email });
        if (!user) {
            console.log('Admin user not found. Creating...');
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
            user = await User.create({
                name: 'Admin User',
                firstName: 'Admin',
                lastName: 'User',
                email,
                password: hashed,
                role: 'admin',
                enrollmentNo: 'ADMIN001',
                isVerified: true
            });
        } else {
            console.log('Admin user found. Updating password...');
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
            user.name = 'Admin User';
            user.firstName = 'Admin';
            user.lastName = 'User';
            user.password = hashed;
            await user.save();
        }
        console.log('Admin Password updated successfully.');

        // --- Student Reset ---
        let student = await User.findOne({ email: studentEmail });
        if (!student) {
            console.log('Student user not found. Creating...');
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
            student = await User.create({
                name: 'Student User',
                firstName: 'Student',
                lastName: 'User',
                email: studentEmail,
                password: hashed,
                role: 'student',
                batch: 'E2E-BATCH',
                enrollmentNo: 'STUDENT001',
                isVerified: true
            });
        } else {
            console.log('Student user found. Updating password...');
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
            student.name = 'Student User';
            student.firstName = 'Student';
            student.lastName = 'User';
            student.password = hashed;
            student.batch = student.batch || 'E2E-BATCH';
            student.isVerified = true;
            await student.save();
        }
        console.log('Student Password updated successfully.');

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
