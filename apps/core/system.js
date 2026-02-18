import { spawnSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig, saveConfig } from './config.js';

const S = (key, vars = {}) => {
  const lang = getConfig().language || 'ko';
  const table = {
    doctor_title: { ko: '\n  🩺 DevDeck Doctor', en: '\n  🩺 DevDeck Doctor', ja: '\n  🩺 DevDeck Doctor', 'zh-CN': '\n  🩺 DevDeck Doctor' },
    not_found: { ko: '없음', en: 'not found', ja: '見つかりません', 'zh-CN': '未找到' },
    doctor_config: { ko: '  설정   playback={playback}, autoUpdate={autoUpdate}', en: '  config   playback={playback}, autoUpdate={autoUpdate}', ja: '  設定   playback={playback}, autoUpdate={autoUpdate}', 'zh-CN': '  配置   playback={playback}, autoUpdate={autoUpdate}' },
    latest_check_failed_internal: { ko: '최신 버전 확인 실패', en: 'latest version check failed', ja: '最新バージョン確認失敗', 'zh-CN': '检查最新版本失败' },
    doctor_ok: { ko: '  ✅ 핵심 의존성은 정상입니다.\n', en: '  ✅ Core dependencies are healthy.\n', ja: '  ✅ 必須依存関係は正常です。\n', 'zh-CN': '  ✅ 核心依赖正常。\n' },
    doctor_bad: { ko: '  ❌ 핵심 의존성 문제가 있습니다.\n', en: '  ❌ Core dependency issues detected.\n', ja: '  ❌ 必須依存関係に問題があります。\n', 'zh-CN': '  ❌ 检测到核心依赖问题。\n' },
    update_check_failed: { ko: '\n  ⚠️ 최신 버전 확인에 실패했습니다.\n', en: '\n  ⚠️ Could not check latest version.\n', ja: '\n  ⚠️ 最新バージョンを確認できませんでした。\n', 'zh-CN': '\n  ⚠️ 无法检查最新版本。\n' },
    update_latest: { ko: '\n  ✅ 이미 최신 버전입니다 ({value}).\n', en: '\n  ✅ Already up to date ({value}).\n', ja: '\n  ✅ すでに最新です ({value})。\n', 'zh-CN': '\n  ✅ 已是最新版本 ({value})。\n' },
    updating: { ko: '\n  🔄 DevDeck 업데이트 중 ({from} -> {to})...', en: '\n  🔄 Updating DevDeck ({from} -> {to})...', ja: '\n  🔄 DevDeck を更新中 ({from} -> {to})...', 'zh-CN': '\n  🔄 正在更新 DevDeck ({from} -> {to})...' },
    update_done: { ko: '\n  ✅ DevDeck 최신 버전으로 업데이트 완료.\n', en: '\n  ✅ DevDeck updated to latest version.\n', ja: '\n  ✅ DevDeck を最新に更新しました。\n', 'zh-CN': '\n  ✅ DevDeck 已更新到最新版本。\n' },
    update_fail: { ko: '\n  🚫 DevDeck 업데이트 실패.\n', en: '\n  🚫 Failed to update DevDeck.\n', ja: '\n  🚫 DevDeck の更新に失敗しました。\n', 'zh-CN': '\n  🚫 DevDeck 更新失败。\n' },
    auto_update_failed: { ko: '  ⚠️ 자동 업데이트에 실패했습니다. 수동으로 실행해주세요:', en: '  ⚠️ Auto update failed. Please run manually:', ja: '  ⚠️ 自動更新に失敗しました。手動実行してください:', 'zh-CN': '  ⚠️ 自动更新失败，请手动执行:' },
    manual_cmd: { ko: '     npm install -g @beargame/devdeck@latest\n', en: '     npm install -g @beargame/devdeck@latest\n', ja: '     npm install -g @beargame/devdeck@latest\n', 'zh-CN': '     npm install -g @beargame/devdeck@latest\n' },
    new_version: { ko: '\n  📦 새 버전 발견: {from} -> {to}', en: '\n  📦 New version found: {from} -> {to}', ja: '\n  📦 新バージョン検出: {from} -> {to}', 'zh-CN': '\n  📦 发现新版本: {from} -> {to}' },
    manual_needed: { ko: '  자동 업데이트가 꺼져 있어 수동 업데이트가 필요합니다.', en: '  Auto update is disabled, manual update is required.', ja: '  自動更新が無効のため手動更新が必要です。', 'zh-CN': '  自动更新已关闭，需要手动更新。' },
    preflight_missing: { ko: '\n  🩺 시작 전 환경 점검 결과: 누락된 도구가 있습니다.', en: '\n  🩺 Startup doctor found missing tools.', ja: '\n  🩺 起動前診断で不足ツールが見つかりました。', 'zh-CN': '\n  🩺 启动前诊断发现缺失工具。' },
    critical_label: { ko: '  필수: {value}', en: '  Required: {value}', ja: '  必須: {value}', 'zh-CN': '  必需: {value}' },
    install_required: { ko: '  필수 도구를 설치한 뒤 다시 실행해주세요.\n', en: '  Install required tools and run again.\n', ja: '  必須ツールをインストールして再実行してください。\n', 'zh-CN': '  请安装必需工具后重试。\n' },
    media_hint: { ko: '  미디어 기능을 위해 아래 명령을 실행해주세요:', en: '  Run the command below for media features:', ja: '  メディア機能のため次のコマンドを実行してください:', 'zh-CN': '  使用媒体功能请执行以下命令:' }
  };
  const raw = (table[key]?.[lang] ?? table[key]?.ko ?? key);
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
};

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
  console.log(chalk.cyan.bold(S('doctor_title')));
  console.log(chalk.gray('  ──────────────────────────────────'));
  report.checks.forEach((c) => {
    if (c.installed) {
      console.log(`  ${chalk.green('✓')} ${c.name.padEnd(8)} ${chalk.gray(c.version)}`);
    } else {
      const isOptional = c.name === 'mpv' || c.name === 'yt-dlp';
      const color = isOptional ? chalk.yellow : chalk.red;
      console.log(`  ${color('✗')} ${c.name.padEnd(8)} ${chalk.gray(S('not_found'))}`);
    }
  });
  console.log(
    chalk.gray(
      S('doctor_config', {
        playback: report.config.defaultPlaybackMode,
        autoUpdate: report.config.autoUpdate
      })
    )
  );
  console.log('');
  if (report.ok) console.log(chalk.green(S('doctor_ok')));
  else console.log(chalk.red(S('doctor_bad')));
};

export const checkForUpdates = () => {
  const local = getLocalVersion();
  const latest = getLatestVersion();
  if (!latest) {
    return { available: false, local, latest: null, message: S('latest_check_failed_internal') };
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
    console.log(chalk.yellow(S('update_check_failed')));
    return false;
  }

  if (!info.available) {
    if (!silentIfLatest) console.log(chalk.green(S('update_latest', { value: info.local })));
    return true;
  }

  console.log(chalk.cyan(S('updating', { from: info.local, to: info.latest })));
  const result = run('npm', ['install', '-g', '@beargame/devdeck@latest'], { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(chalk.green(S('update_done')));
  } else {
    console.log(chalk.red(S('update_fail')));
  }
  return result.status === 0;
};

export const runAutoUpdateIfNeeded = () => {
  const cfg = getConfig();
  const now = Date.now();
  const last = Number(cfg.lastUpdateCheck || 0);
  const intervalHours = Number(cfg.updateCheckIntervalHours || 24);
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  if (now - last < intervalMs) return { checked: false };

  const info = checkForUpdates();
  if (!info.latest) {
    saveConfig({ ...cfg, lastUpdateCheck: now, autoUpdateLastResult: 'check_failed' });
    return { checked: true, updated: false, available: false };
  }

  if (!info.available) {
    saveConfig({ ...cfg, lastUpdateCheck: now, autoUpdateLastResult: 'latest' });
    return { checked: true, updated: false, available: false, info };
  }

  if (cfg.autoUpdate) {
    const updated = runSelfUpdate(true);
    if (!updated) {
      console.log(chalk.yellow(S('auto_update_failed')));
      console.log(chalk.gray(S('manual_cmd')));
    }
    saveConfig({ ...cfg, lastUpdateCheck: now, autoUpdateLastResult: updated ? 'ok' : 'failed' });
    return { checked: true, updated, available: true, info };
  }

  console.log(chalk.yellow(S('new_version', { from: info.local, to: info.latest })));
  console.log(chalk.gray(S('manual_needed')));
  console.log(chalk.gray(S('manual_cmd')));
  saveConfig({ ...cfg, lastUpdateCheck: now, autoUpdateLastResult: 'manual_required' });
  return { checked: true, updated: false, available: true, info };
};

const getInstallHint = (missingNames) => {
  const needsMedia = missingNames.includes('mpv') || missingNames.includes('yt-dlp');
  if (!needsMedia) return null;

  if (process.platform === 'darwin') return 'brew install mpv yt-dlp';
  if (process.platform === 'win32') return 'scoop install mpv yt-dlp';
  return 'sudo apt-get install -y mpv yt-dlp';
};

export const runAutoDoctorIfNeeded = () => {
  const cfg = getConfig();
  if (!cfg.autoDoctor) return { checked: false };

  const now = Date.now();
  const last = Number(cfg.lastDoctorCheck || 0);
  const intervalHours = Number(cfg.doctorCheckIntervalHours || 24);
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  if (now - last < intervalMs) return { checked: false };

  const report = buildDoctorReport();
  const missing = report.checks.filter((c) => !c.installed).map((c) => c.name);
  const criticalMissing = missing.filter((n) => n !== 'mpv' && n !== 'yt-dlp');

  if (missing.length) {
    console.log(chalk.yellow(S('preflight_missing')));
    if (criticalMissing.length) {
      console.log(chalk.red(S('critical_label', { value: criticalMissing.join(', ') })));
      console.log(chalk.gray(S('install_required')));
    }
    const hint = getInstallHint(missing);
    if (hint) {
      console.log(chalk.yellow(S('media_hint')));
      console.log(chalk.gray(`  ${hint}\n`));
    }
  }

  saveConfig({ ...cfg, lastDoctorCheck: now, lastDoctorResult: missing.length ? 'issues' : 'ok' });
  return { checked: true, ok: missing.length === 0, missing };
};
