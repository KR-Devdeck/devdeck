#!/usr/bin/env node

import { spawnSync } from 'child_process';
import process from 'process';

const CHECK_ONLY = process.argv.includes('--check');
const POSTINSTALL_MODE = process.argv.includes('--postinstall');
const SKIP_NODE_DEPS = process.argv.includes('--skip-node-deps') || POSTINSTALL_MODE;
const SKIP_LINK = process.argv.includes('--skip-link') || POSTINSTALL_MODE;
const IS_WINDOWS = process.platform === 'win32';

const log = (msg) => console.log(`[setup] ${msg}`);
const warn = (msg) => console.warn(`[setup] ${msg}`);
const err = (msg) => console.error(`[setup] ${msg}`);

const run = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, {
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: IS_WINDOWS && options.shellOnWindows !== false,
    ...options
  });

  return {
    ok: result.status === 0,
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
};

const hasCommand = (command) => {
  const probe = IS_WINDOWS
    ? run('where', [command], { capture: true })
    : run('command', ['-v', command], { capture: true, shell: true });
  return probe.ok && probe.stdout.trim().length > 0;
};

const ensureNodeDeps = () => {
  log('Installing Node dependencies...');
  const install = run('npm', ['install']);
  if (!install.ok) {
    err('npm install failed. Please run it manually.');
    process.exit(1);
  }
};

const installMediaWithManager = () => {
  const managers = [];

  if (process.platform === 'darwin') {
    managers.push({
      name: 'Homebrew',
      exists: () => hasCommand('brew'),
      install: () => run('brew', ['install', 'mpv', 'yt-dlp'])
    });
  } else if (IS_WINDOWS) {
    managers.push(
      {
        name: 'Scoop',
        exists: () => hasCommand('scoop'),
        install: () => run('scoop', ['install', 'mpv', 'yt-dlp'])
      },
      {
        name: 'Chocolatey',
        exists: () => hasCommand('choco'),
        install: () => run('choco', ['install', '-y', 'mpv', 'yt-dlp'])
      }
    );
  } else {
    managers.push(
      {
        name: 'apt',
        exists: () => hasCommand('apt-get'),
        install: () => run('sudo', ['apt-get', 'install', '-y', 'mpv', 'yt-dlp'])
      },
      {
        name: 'dnf',
        exists: () => hasCommand('dnf'),
        install: () => run('sudo', ['dnf', 'install', '-y', 'mpv', 'yt-dlp'])
      },
      {
        name: 'pacman',
        exists: () => hasCommand('pacman'),
        install: () => run('sudo', ['pacman', '-S', '--noconfirm', 'mpv', 'yt-dlp'])
      },
      {
        name: 'zypper',
        exists: () => hasCommand('zypper'),
        install: () => run('sudo', ['zypper', 'install', '-y', 'mpv', 'yt-dlp'])
      }
    );
  }

  for (const manager of managers) {
    if (!manager.exists()) continue;
    log(`Installing media engine with ${manager.name}...`);
    const result = manager.install();
    if (result.ok) return true;
    warn(`${manager.name} install failed. Trying next manager...`);
  }

  return false;
};

const ensureMedia = () => {
  const hasMpv = hasCommand('mpv');
  const hasYtDlp = hasCommand('yt-dlp');

  if (hasMpv && hasYtDlp) {
    log('mpv and yt-dlp are already installed.');
    return true;
  }

  if (CHECK_ONLY) {
    warn('Missing media engine: install mpv and yt-dlp, then run `npm run setup`.');
    return false;
  }

  log('mpv and/or yt-dlp are missing. Trying automatic installation...');
  const installed = installMediaWithManager();

  const finalMpv = hasCommand('mpv');
  const finalYtDlp = hasCommand('yt-dlp');
  if (installed && finalMpv && finalYtDlp) {
    log('Media engine installed successfully.');
    return true;
  }

  warn('Automatic media installation failed.');
  warn('Please install manually:');
  if (process.platform === 'darwin') warn('  brew install mpv yt-dlp');
  else if (IS_WINDOWS) warn('  scoop install mpv yt-dlp  (or choco install -y mpv yt-dlp)');
  else warn('  sudo apt-get install -y mpv yt-dlp (or your distro package manager)');
  return false;
};

const ensureLink = () => {
  if (CHECK_ONLY) return;
  log('Linking CLI command (`deck`) globally...');
  const link = run('npm', ['link']);
  if (!link.ok) {
    warn('npm link failed. You can run it manually later.');
    return;
  }
  log('`deck` command is ready.');
};

const main = () => {
  if (!CHECK_ONLY && !SKIP_NODE_DEPS) ensureNodeDeps();
  const mediaReady = ensureMedia();
  if (!SKIP_LINK) ensureLink();

  if (!mediaReady) {
    warn('Setup finished with warnings.');
    process.exit(0);
  }

  log('Setup complete.');
};

main();
