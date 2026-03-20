const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function spawnNpm(args, options) {
  if (process.platform === 'win32') {
    const command = `npm ${args.join(' ')}`;
    return spawn(process.env.comspec || 'cmd.exe', ['/d', '/s', '/c', command], options);
  }

  return spawn('npm', args, options);
}

const child = spawnNpm(['--prefix', 'client', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_BASE: 'http://127.0.0.1:5100/api',
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