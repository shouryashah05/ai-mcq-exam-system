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
});

const child = spawnNpm(['--prefix', 'server', 'run', 'start'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
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