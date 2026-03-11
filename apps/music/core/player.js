import { spawn, execSync, execFileSync } from 'child_process';
import chalk from 'chalk';
import readline from 'readline';
import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getConfig } from '../../core/config.js';
import { findRelatedTrack } from './search.js';

export class MusicPlayer {
  constructor() {
    this.queue = [];
    this.loopMode = 'NONE'; // NONE, ALL, ONE
    this.isPlaying = false;
    this.currentSec = 0;
    this.totalSec = 0;
    this.timer = null;
    this.mpvProcess = null;
    this.ipcClient = null;
    this.ipcPath = '';
    this.volume = 100;
    this.playbackPromise = null;
    this.stopRequested = false;
    this.currentTitle = '';
    this.currentIndex = 0;
    this.hadRestoredQueue = false;

    this.stateDir = path.join(os.homedir(), '.devdeck');
    this.stateFile = path.join(this.stateDir, 'music-state.json');
    this.loadState();
  }

  add(song) {
    this.queue.push(song);
    this.saveState();
  }

  remove(index) {
    if (index < 0 || index >= this.queue.length) return false;
    this.queue.splice(index, 1);
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = Math.max(0, this.queue.length - 1);
    }
    if (index < this.currentIndex) {
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    }
    this.saveState();
    return true;
  }

  clearQueue() {
    this.queue = [];
    this.currentIndex = 0;
    this.currentTitle = '';
    this.saveState();
  }

  setLoop(mode) {
    this.loopMode = mode;
    this.saveState();
  }

  isBackgroundRunning() {
    return !!this.playbackPromise || !!this.mpvProcess;
  }

  startBackgroundPlayback() {
    if (this.queue.length === 0) return false;
    if (this.playbackPromise) return true;

    this.stopRequested = false;
    this.playbackPromise = this.playQueue({ interactive: false }).finally(() => {
      this.playbackPromise = null;
      this.stopRequested = false;
      this.currentTitle = '';
      this.saveState();
    });
    return true;
  }

  stopBackgroundPlayback() {
    this.stopRequested = true;
    this.cleanup();
  }

  // 🔄 메인 재생 로직 (수정됨)
  async playQueue(options = {}) {
    const interactive = options.interactive !== false;
    if (this.queue.length === 0) return;
    if (this.isPlaying && interactive) return;

    if (interactive) {
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      readline.emitKeypressEvents(process.stdin);
    }

    let index = Math.min(Math.max(Number(this.currentIndex) || 0, 0), Math.max(0, this.queue.length - 1));
    while (index < this.queue.length) {
      if (this.stopRequested) break;
      this.currentIndex = index;
      const song = this.queue[index];
      this.currentTitle = song.title || '';
      this.saveState();
      
      // 노래 재생 (끝날 때까지 대기)
      const action = await this.playOneSong(song, index + 1, this.queue.length, { interactive });

      if (action === 'QUIT') break;

      // 🛑 [수정된 부분] continue를 쓰지 않고 if-else로 깔끔하게 처리
      if (this.loopMode === 'ONE') {
        if (action === 'SKIP') {
          index++;
        } else {
          // 자연스럽게 끝났다면(NEXT), index를 올리지 않음 (제자리 반복)
          // 아무것도 안 하면 index가 그대로 유지되므로 다시 그 노래가 재생됨
        }
      } else {
        // 일반 모드(NONE)거나 전체 반복(ALL)이면 무조건 다음 곡
        index++;
      }
      this.currentIndex = Math.min(index, Math.max(0, this.queue.length - 1));
      this.saveState();

      // 대기열 끝에 도달했을 때 처리
      if (index >= this.queue.length) {
        if (this.loopMode === 'ALL') {
          index = 0; // 전체 반복이면 처음으로
        } else if (this.loopMode === 'ONE' && action !== 'SKIP') {
           // (예외 처리) 마지막 곡에서 한 곡 반복 중이면 인덱스 유지
           // (위에서 index++를 안 했으니 자동으로 유지되지만 안전장치)
           index = this.queue.length - 1;
        } else if (await this.tryAppendRelatedTrack(song, interactive)) {
          index = this.queue.length - 1;
        } else {
          break; // 반복 없으면 종료
        }
      }
      
      // ⚡ 안전 장치: 프로세스 정리 및 과부하 방지를 위해 0.5초 대기
      // 아까는 continue 때문에 이 부분이 무시되어서 오류가 났던 것입니다.
      await new Promise(r => setTimeout(r, 500));
    }

    if (interactive) {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    if (this.loopMode === 'NONE' && this.currentIndex >= this.queue.length - 1 && !this.stopRequested) {
      this.currentIndex = 0;
    }
    this.saveState();
  }

  playOneSong(song, currentIdx, totalIdx, options = {}) {
    const interactive = options.interactive !== false;
    return new Promise(async (resolve) => {
      this.currentSec = 0;
      this.totalSec = song.duration || 0;
      this.isPlaying = true;
      
      // 매번 고유한 파이프 이름 생성
      const pipeName = `devdeck-mpv-${Date.now()}`;
      this.ipcPath = process.platform === 'win32' 
        ? `\\\\.\\pipe\\${pipeName}` 
        : path.join(os.tmpdir(), `${pipeName}.sock`);

      if (interactive) {
        console.clear();
        console.log(chalk.cyan(`\n  🎵 ${this.t('loading_song', { title: song.title })}`));
      }

      let streamUrl = '';
      try {
        streamUrl = this.resolveStreamUrl(song.videoId);
      } catch (e) {
        if (interactive) {
          console.log(chalk.red(this.t('stream_fail')));
        }
        setTimeout(() => resolve('SKIP'), 1000);
        return;
      }

      // Windows에서는 mpv.com이 정책으로 차단될 수 있어 mpv.exe를 명시한다.
      const mpvCommand = process.platform === 'win32' ? 'mpv.exe' : 'mpv';

      // --idle=no: 재생 끝나면 자동 종료
      this.mpvProcess = spawn(mpvCommand, [
        '--no-video',
        `--volume=${this.volume}`,
        `--input-ipc-server=${this.ipcPath}`,
        '--idle=no', 
        streamUrl
      ], { stdio: 'ignore' });

      this.mpvProcess.on('error', (err) => {
        this.cleanup();
        console.log(chalk.red(`\n  🚫 mpv 실행 실패: ${err.code || err.message}`));
        setTimeout(() => resolve('SKIP'), 1500);
      });

      this.ipcClient = await this.connectToMpv();
      if (interactive) this.startTimer(song, currentIdx, totalIdx);

      let keyHandler = null;
      if (interactive) {
        keyHandler = (str, key) => {
          if (!key) return;
          if ((key.ctrl && key.name === 'c') || key.name === 'q') {
            this.cleanup(keyHandler);
            resolve('QUIT');
          } else if (key.name === 's') {
            this.cleanup(keyHandler);
            resolve('SKIP');
          } else if (key.name === 'space') {
            this.togglePause();
            this.renderUI(song, currentIdx, totalIdx);
          } else if (key.name === 'right') {
            this.seek(10);
            this.renderUI(song, currentIdx, totalIdx);
          } else if (key.name === 'left') {
            this.seek(-10);
            this.renderUI(song, currentIdx, totalIdx);
          } else if (key.name === 'up') {
            this.changeVolume(5);
            this.renderUI(song, currentIdx, totalIdx);
          } else if (key.name === 'down') {
            this.changeVolume(-5);
            this.renderUI(song, currentIdx, totalIdx);
          }
        };

        process.stdin.on('keypress', keyHandler);
      }

      this.mpvProcess.on('close', () => {
        this.cleanup(keyHandler);
        resolve('NEXT');
      });

      // 윈도우용 이중 안전장치 (EOF 감지)
      if (this.ipcClient) {
        this.ipcClient.on('data', (data) => {
          const msg = data.toString();
          if (msg.includes('"event":"end-file"') || msg.includes('"reason":"eof"')) {
            this.cleanup(keyHandler);
            resolve('NEXT');
          }
        });
        this.sendCommand('{ "command": ["observe_property", 1, "eof-reached"] }');
      }
    });
  }

  async connectToMpv() {
    for (let i = 0; i < 30; i++) {
      try {
        return await new Promise((resolve, reject) => {
          const socket = net.createConnection(this.ipcPath);
          socket.on('connect', () => resolve(socket));
          socket.on('error', reject);
          setTimeout(() => reject(new Error('timeout')), 200);
        });
      } catch (e) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    return null;
  }

  sendCommand(cmd) {
    if (this.ipcClient && !this.ipcClient.destroyed) {
      try { this.ipcClient.write(cmd + '\n'); } catch (e) {}
    }
  }

  cleanup(handler) {
    this.stopTimer();
    this.isPlaying = false;
    if (handler) process.stdin.removeListener('keypress', handler);

    if (this.ipcClient) {
      this.ipcClient.destroy();
      this.ipcClient = null;
    }

    if (this.mpvProcess) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${this.mpvProcess.pid} /f /t`, { stdio: 'ignore' });
        } else {
          this.mpvProcess.kill('SIGKILL');
        }
      } catch (e) {}
      this.mpvProcess = null;
    }
    this.saveState();
  }

  startTimer(song, current, total) {
    this.renderUI(song, current, total);
    this.timer = setInterval(() => {
      if (this.isPlaying) {
        this.currentSec++;
        if (this.totalSec > 0 && this.currentSec >= this.totalSec) {
          this.currentSec = this.totalSec;
        }
      }
      this.renderUI(song, current, total);
    }, 1000);
  }

  stopTimer() { if (this.timer) clearInterval(this.timer); }

  togglePause() {
    this.isPlaying = !this.isPlaying;
    this.sendCommand('{ "command": ["cycle", "pause"] }');
  }

  seek(seconds) {
    this.currentSec += seconds;
    if (this.currentSec < 0) this.currentSec = 0;
    if (this.totalSec > 0 && this.currentSec > this.totalSec) this.currentSec = this.totalSec;
    this.sendCommand(`{ "command": ["seek", ${seconds}, "relative"] }`);
  }

  changeVolume(delta) {
    this.volume = Math.max(0, Math.min(100, this.volume + delta));
    this.sendCommand(`{ "command": ["set_property", "volume", ${this.volume}] }`);
    this.saveState();
  }

  resolveStreamUrl(videoId) {
    const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const attempts = [
      ['--no-warnings', '-f', 'bestaudio/best', '-g', '--extractor-args', 'youtube:player-client=ios,web,android', targetUrl],
      ['--no-warnings', '-f', 'best', '-g', '--extractor-args', 'youtube:player-client=web,android', targetUrl],
      ['--no-warnings', '-g', '--extractor-args', 'youtube:player-client=web', targetUrl],
      ['--no-warnings', '-g', targetUrl]
    ];

    for (const args of attempts) {
      try {
        const output = execFileSync('yt-dlp', args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        const url = output.split('\n').find((line) => line.startsWith('http'));
        if (url) return url;
      } catch (e) {
        // try next fallback strategy
      }
    }

    throw new Error(this.t('stream_unresolved'));
  }

  async tryAppendRelatedTrack(song, interactive) {
    const config = getConfig();
    if (!config.autoRelatedMusic || !song) return false;

    try {
      const excludedIds = this.queue.map((item) => item?.videoId).filter(Boolean);
      const related = await findRelatedTrack(song, excludedIds);
      if (!related) {
        if (interactive) console.log(chalk.yellow(this.getRelatedMessage('failed')));
        return false;
      }

      this.queue.push(related);
      this.saveState();
      if (interactive) {
        console.log(chalk.green(this.getRelatedMessage('added', related.title)));
      }
      return true;
    } catch (e) {
      if (interactive) console.log(chalk.yellow(this.getRelatedMessage('failed')));
      return false;
    }
  }

  getRelatedMessage(type, title = '') {
    const lang = getConfig().language || 'ko';
    const messages = {
      added: {
        ko: `\n  ✨ 연관곡을 추가했습니다: ${title}`,
        en: `\n  ✨ Added a related track: ${title}`,
        ja: `\n  ✨ 関連曲を追加しました: ${title}`,
        'zh-CN': `\n  ✨ 已添加相关歌曲: ${title}`
      },
      failed: {
        ko: '\n  ℹ️ 연관곡을 찾지 못해 재생을 종료합니다.',
        en: '\n  ℹ️ No related track found. Playback will stop.',
        ja: '\n  ℹ️ 関連曲が見つからないため再生を終了します。',
        'zh-CN': '\n  ℹ️ 未找到相关歌曲，播放将结束。'
      }
    };

    return messages[type]?.[lang] ?? messages[type]?.ko ?? '';
  }

  renderUI(song, current, total) {
    console.clear();
    const loopIcon = this.loopMode === 'ONE' ? '🔂 One' : this.loopMode === 'ALL' ? '🔁 All' : '➡️ Off';
    const statusIcon = this.isPlaying ? '▶️' : '⏸️';
    const volIcon = this.volume === 0 ? '🔇' : this.volume < 50 ? '🔉' : '🔊';
    
    console.log(`\n ${chalk.cyan.bold('DevDeck Player')}  ${chalk.dim('|')}  Track ${chalk.yellow(current)}/${chalk.dim(total)}  ${chalk.dim('|')}  ${chalk.blue(loopIcon)}`);
    console.log(chalk.gray(' ───────────────────────────────────────────'));
    console.log(`\n ${chalk.white.bold(this.truncate(song.title, 40))}`);
    console.log(` ${chalk.gray(this.truncate(song.author?.name || 'Unknown', 40))}   ${chalk.dim(volIcon + ' ' + this.volume + '%')}`);
    console.log('');

    const barWidth = 25;
    let bar = '';
    if (this.totalSec > 0) {
      const percent = Math.min(this.currentSec / this.totalSec, 1);
      const filled = Math.floor(barWidth * percent);
      const empty = barWidth - filled;
      bar = chalk.green('━'.repeat(filled)) + chalk.dim('━'.repeat(empty));
    } else {
      bar = chalk.green('━'.repeat(barWidth));
    }

    console.log(`   ${statusIcon}  ${chalk.yellow(this.formatTime(this.currentSec))}  ${bar}  ${chalk.dim(this.formatTime(this.totalSec))}`);
    console.log('');
    console.log(chalk.gray(' ───────────────────────────────────────────'));
    console.log(chalk.cyan(this.t('controls_1')));
    console.log(chalk.cyan(this.t('controls_2')));
  }

  truncate(str, n) { return str?.length > n ? str.substr(0, n - 1) + '…' : str; }
  formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  loadState() {
    try {
      if (!fs.existsSync(this.stateFile)) return;
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      this.queue = Array.isArray(parsed.queue) ? parsed.queue : [];
      this.loopMode = ['NONE', 'ALL', 'ONE'].includes(parsed.loopMode) ? parsed.loopMode : 'NONE';
      this.volume = Number.isFinite(parsed.volume) ? Math.max(0, Math.min(100, parsed.volume)) : 100;
      this.currentIndex = Number.isInteger(parsed.currentIndex) ? Math.max(0, parsed.currentIndex) : 0;
      this.hadRestoredQueue = this.queue.length > 0;
    } catch (e) {
      // ignore restore failure and keep defaults
    }
  }

  saveState() {
    try {
      if (!fs.existsSync(this.stateDir)) fs.mkdirSync(this.stateDir, { recursive: true });
      const payload = {
        queue: this.queue,
        loopMode: this.loopMode,
        volume: this.volume,
        currentIndex: this.currentIndex,
        currentTitle: this.currentTitle
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      // ignore save failure
    }
  }

  t(key, vars = {}) {
    const lang = getConfig().language || 'ko';
    const m = {
      loading_song: { ko: "'{title}' 로딩 중...", en: "Loading '{title}'...", ja: "'{title}' をロード中...", 'zh-CN': "正在加载 '{title}'..." },
      stream_fail: { ko: '\n  🚫 스트림 URL을 가져오지 못했습니다. 다음 곡으로 넘어갑니다.', en: '\n  🚫 Could not resolve stream URL. Skipping to next track.', ja: '\n  🚫 ストリームURLを取得できません。次の曲へ移動します。', 'zh-CN': '\n  🚫 无法解析流地址，跳到下一首。' },
      stream_unresolved: { ko: '스트림 URL을 확인할 수 없습니다.', en: 'Unable to resolve stream URL', ja: 'ストリームURLを解決できません。', 'zh-CN': '无法解析流地址。' },
      controls_1: { ko: '  [Space] 일시정지    [←/→] 탐색    [↑/↓] 볼륨', en: '  [Space] Pause    [←/→] Seek    [↑/↓] Volume', ja: '  [Space] 一時停止    [←/→] シーク    [↑/↓] 音量', 'zh-CN': '  [Space] 暂停    [←/→] 快进/后退    [↑/↓] 音量' },
      controls_2: { ko: '  [s] 다음곡         [q] 종료', en: '  [s] Skip         [q] Quit', ja: '  [s] スキップ      [q] 終了', 'zh-CN': '  [s] 跳过         [q] 退出' }
    };
    const raw = (m[key]?.[lang] ?? m[key]?.ko ?? key);
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
  }
}


