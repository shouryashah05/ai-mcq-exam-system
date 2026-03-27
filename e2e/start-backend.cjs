const { execFileSync, spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const resetScript = path.join(rootDir, 'server', 'scripts', 'forceReset.js');

function spawnNpm(args, options) {
  if (process.platform === 'win32') {
    const command = `npm ${args.join(' ')}`;
    return spawn(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', command], options);
  }

  return spawn('npm', args, options);
}

execFileSync(process.execPath, [resetScript], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    AI_SERVICE_URL: 'http://127.0.0.1:5001',
    JWT_SECRET: 'playwright_test_jwt_secret_at_least_32_chars',
    FORCE_RESET_ADMIN_EMAIL: 'admin@example.com',
    FORCE_RESET_STUDENT_EMAIL: 'student@example.com',
    FORCE_RESET_PASSWORD: 'ChangeMe123!',
  },
});

const child = spawnNpm(['--prefix', 'server', 'run', 'start'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    AI_SERVICE_URL: 'http://127.0.0.1:5001',
    JWT_SECRET: 'playwright_test_jwt_secret_at_least_32_chars',
    FORCE_RESET_ADMIN_EMAIL: 'admin@example.com',
    FORCE_RESET_STUDENT_EMAIL: 'student@example.com',
    FORCE_RESET_PASSWORD: 'ChangeMe123!',
    PORT: '5100',
  },
});

const shutdown = () => {
  if (!child.killed) {
    child.kill('SIGTERM');
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});