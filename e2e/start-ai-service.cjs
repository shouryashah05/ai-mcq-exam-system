const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const aiServiceDir = path.join(rootDir, 'ai-service');

function spawnPython(options) {
  if (process.platform === 'win32') {
    const command = 'py -3 app.py';
    return spawn(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', command], options);
  }

  return spawn('python3', ['app.py'], options);
}

const child = spawnPython({
  cwd: aiServiceDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: '5001',
    FLASK_DEBUG: 'false',
    ALLOWED_ORIGINS: 'http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173',
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