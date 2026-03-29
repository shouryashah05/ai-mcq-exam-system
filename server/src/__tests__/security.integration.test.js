const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let mongod;
let app;

const User = require('../models/user.model');

beforeAll(async () => {
  let mongoUri = process.env.MONGO_URI || '';

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
  } catch (error) {
    mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-mcq-security-test';
  }

  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

  const connectDB = require('../config/db');
  await connectDB(mongoUri);
  app = require('../app');
});

afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
  } catch (error) {
    // ignore cleanup failures
  }

  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

const createUserAndLogin = async ({ name, email, password, role = 'student', enrollmentNo, isVerified = true }) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    enrollmentNo: enrollmentNo || `${role.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
    isVerified,
  });

  const loginResponse = await request(app).post('/api/auth/login').send({ email, password });
  return {
    user,
    token: loginResponse.body.token,
    loginResponse,
  };
};

describe('Security regressions', () => {
  test('anonymous users cannot read exams or questions', async () => {
    const examsResponse = await request(app).get('/api/exams');
    const questionsResponse = await request(app).get('/api/questions');

    expect(examsResponse.status).toBe(401);
    expect(questionsResponse.status).toBe(401);
  });

  test('students cannot access the question bank endpoints', async () => {
    const { token, loginResponse } = await createUserAndLogin({
      name: 'Student Reader',
      email: 'student.reader@test.com',
      password: 'StudentPass123!',
      role: 'student',
      enrollmentNo: 'SECSTUDENT001',
    });

    expect(loginResponse.status).toBe(200);

    const response = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  test('temporary image deletion is limited to the caller upload scope', async () => {
    const { token, user, loginResponse } = await createUserAndLogin({
      name: 'Teacher Owner',
      email: 'teacher.owner@test.com',
      password: 'TeacherPass123!',
      role: 'teacher',
      enrollmentNo: 'SECTEACH001',
    });

    expect(loginResponse.status).toBe(200);

    const blockedResponse = await request(app)
      .post('/api/questions/delete-image')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicId: `ai-mcq/questions/other-user-id/sample-image-${user._id}` });

    expect(blockedResponse.status).toBe(403);
    expect(blockedResponse.body.message).toMatch(/only delete your own uploaded images/i);
  });

  test('metrics endpoint requires admin authentication', async () => {
    const anonymousResponse = await request(app).get('/api/metrics');
    expect(anonymousResponse.status).toBe(401);

    const { token, loginResponse } = await createUserAndLogin({
      name: 'Metrics Admin',
      email: 'metrics.admin@test.com',
      password: 'AdminPass123!',
      role: 'admin',
      enrollmentNo: 'SECADMIN001',
    });

    expect(loginResponse.status).toBe(200);

    const adminResponse = await request(app)
      .get('/api/metrics')
      .set('Authorization', `Bearer ${token}`);

    expect(adminResponse.status).toBe(200);
  });

  test('resend verification does not reveal account existence or verification state', async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('VerifyPass123!', salt);

    await User.create({
      name: 'Verified User',
      email: 'verified.user@test.com',
      password: hashedPassword,
      role: 'student',
      enrollmentNo: 'SECVERIFY001',
      isVerified: true,
    });

    const unknownResponse = await request(app)
      .post('/api/verification/resend-verification')
      .send({ email: 'missing.user@test.com' });

    const verifiedResponse = await request(app)
      .post('/api/verification/resend-verification')
      .send({ email: 'verified.user@test.com' });

    expect(unknownResponse.status).toBe(200);
    expect(verifiedResponse.status).toBe(200);
    expect(unknownResponse.body.message).toBe(verifiedResponse.body.message);
  });
});