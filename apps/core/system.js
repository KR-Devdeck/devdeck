import { spawnSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig, saveConfig } from './config.js';

const run = (cmd, args = [], options = {}) => {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options
  });
  return result;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getLocalVersion = () => {
  try {
    const pkgPath = path.join(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
};

const getLatestVersion = () => {
  const result = run('npm', ['view', '@beargame/devdeck', 'version'], { stdio: 'pipe' });
  if (result.status !== 0) return null;
  return (result.stdout || '').trim() || null;
};

const compareVersions = (a, b) => {
  const pa = a.split('.').map((v) => parseInt(v, 10) || 0);
  const pb = b.split('.').map((v) => parseInt(v, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
};

const checkCommand = (name, versionArgs = ['--version']) => {
  const probe = process.platform === 'win32'
    ? run('where', [name], { stdio: 'pipe' })
    : run('which', [name], { stdio: 'pipe' });

  if (probe.status !== 0) return { name, installed: false, version: null };

  const version = run(name, versionArgs, { stdio: 'pipe' });
  const output = `${version.stdout || ''}${version.stderr || ''}`.trim().split('\n')[0] || 'unknown';
  return { name, installed: true, version: output };
};

export const buildDoctorReport = () => {
  const checks = [
    checkCommand('node'),
    checkCommand('npm'),
    checkCommand('git'),
    checkCommand('mpv'),
    checkCommand('yt-dlp')
  ];

  const cfg = getConfig();
  return {
    ok: checks.every((c) => c.installed || (c.name !== 'mpv' && c.name !== 'yt-dlp')),
    checks,
    config: {
      defaultPlaybackMode: cfg.defaultPlaybackMode,
      autoUpdate: cfg.autoUpdate
    }
  };
};

export const printDoctorReport = (report) => {
  console.log(chalk.cyan.bold('\n  🩺 DevDeck Doctor'));
  console.log(chalk.gray('  ──────────────────────────────────'));
  report.checks.forEach((c) => {
    if (c.installed) {
      console.log(`  ${chalk.green('✓')} ${c.name.padEnd(8)} ${chalk.gray(c.version)}`);
    } else {
      const isOptional = c.name === 'mpv' || c.name === 'yt-dlp';
      const color = isOptional ? chalk.yellow : chalk.red;
      console.log(`  ${color('✗')} ${c.name.padEnd(8)} ${chalk.gray('not found')}`);
    }
  });
  console.log(chalk.gray(`  config   playback=${report.config.defaultPlaybackMode}, autoUpdate=${report.config.autoUpdate}`));
  console.log('');
  if (report.ok) console.log(chalk.green('  ✅ 핵심 의존성은 정상입니다.\n'));
  else console.log(chalk.red('  ❌ 핵심 의존성 문제가 있습니다.\n'));
};

export const checkForUpdates = () => {
  const local = getLocalVersion();
  const latest = getLatestVersion();
  if (!latest) {
    return { available: false, local, latest: null, message: 'latest version check failed' };
  }
  return {
    available: compareVersions(latest, local) > 0,
    local,
    latest
  };
};

export const runSelfUpdate = (silentIfLatest = false) => {
  const info = checkForUpdates();
  if (!info.latest) {
    console.log(chalk.yellow('\n  ⚠️ Could not check latest version.\n'));
    return false;
  }

  if (!info.available) {
    if (!silentIfLatest) console.log(chalk.green(`\n  ✅ Already up to date (${info.local}).\n`));
    return true;
  }

  console.log(chalk.cyan(`\n  🔄 Updating DevDeck (${info.local} -> ${info.latest})...`));
  const result = run('npm', ['install', '-g', '@beargame/devdeck@latest'], { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(chalk.green('\n  ✅ DevDeck updated to latest version.\n'));
  } else {
    console.log(chalk.red('\n  🚫 Failed to update DevDeck.\n'));
  }
  return result.status === 0;
};

export const runAutoUpdateIfNeeded = () => {
  const cfg = getConfig();
  if (!cfg.autoUpdate) return;
  const now = Date.now();
  const last = Number(cfg.lastUpdateCheck || 0);
  const oneDay = 24 * 60 * 60 * 1000;
  if (now - last < oneDay) return;

  const updated = runSelfUpdate(true);
  saveConfig({ ...cfg, lastUpdateCheck: now, autoUpdateLastResult: updated ? 'ok' : 'failed' });
};
