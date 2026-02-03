import { spawn, execSync } from 'child_process';
import chalk from 'chalk';
import readline from 'readline';
import net from 'net';
import os from 'os';
import path from 'path';

export class MusicPlayer {
  constructor() {
    this.queue = [];
    this.loopMode = 'NONE';
    this.isPlaying = false;
    this.currentSec = 0;
    this.totalSec = 0;
    this.timer = null;
    this.mpvProcess = null;
    this.ipcClient = null;
    this.ipcPath = '';
  }

  add(song) { this.queue.push(song); }
  remove(index) {
    if (index < 0 || index >= this.queue.length) return false;
    this.queue.splice(index, 1);
    return true;
  }
  setLoop(mode) { this.loopMode = mode; }

  async playQueue() {
    if (this.queue.length === 0) return;

    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    readline.emitKeypressEvents(process.stdin);

    let index = 0;
    while (index < this.queue.length) {
      const song = this.queue[index];
      const action = await this.playOneSong(song, index + 1, this.queue.length);

      if (action === 'QUIT') break;

      // 루프 로직
      if (this.loopMode === 'ONE') {
        if (action === 'SKIP' || action === 'NEXT') { 
          // 'ONE' 모드에서 'NEXT'는 사실상 같은 곡 반복이므로 
          // index를 건드리지 않고 continue만 하면 됩니다.
          if (action === 'SKIP') index++;
          else continue; 
        }
      } else {
        index++;
      }

      if (index >= this.queue.length) {
        if (this.loopMode === 'ALL') index = 0;
        else break;
      }
      
      await new Promise(r => setTimeout(r, 500)); // 다음 곡 준비 여유 시간
    }

    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }

  playOneSong(song, currentIdx, totalIdx) {
    return new Promise(async (resolve) => {
      this.currentSec = 0;
      this.totalSec = song.duration || 0;
      this.isPlaying = true;
      
      const pipeName = `devdeck-mpv-${Date.now()}`;
      this.ipcPath = process.platform === 'win32' 
        ? `\\\\.\\pipe\\${pipeName}` 
        : path.join(os.tmpdir(), `${pipeName}.sock`);

      console.clear();
      console.log(chalk.cyan(`\n  🎵 '${song.title}' 로딩 중...`));

      let streamUrl = '';
      try {
        streamUrl = execSync(`yt-dlp -f bestaudio -g "https://www.youtube.com/watch?v=${song.videoId}"`, { encoding: 'utf8' }).trim();
      } catch (e) {
        setTimeout(() => resolve('SKIP'), 1000);
        return;
      }

      // ✅ 핵심: --idle=no 로 설정하여 재생이 끝나면 프로세스가 죽게 만듭니다.
      this.mpvProcess = spawn('mpv', [
        '--no-video',
        '--volume=100',
        `--input-ipc-server=${this.ipcPath}`,
        '--idle=no', 
        streamUrl
      ], { stdio: 'ignore' });

      this.ipcClient = await this.connectToMpv();
      this.startTimer(song, currentIdx, totalIdx);

      const keyHandler = (str, key) => {
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
        }
      };

      process.stdin.on('keypress', keyHandler);

      // ✅ 재생 종료 감지
      this.mpvProcess.on('close', () => {
        this.cleanup(keyHandler);
        resolve('NEXT');
      });

      // IPC를 통해 mpv 내부에서 재생이 끝났는지 한 번 더 체크 (윈도우용 보강)
      if (this.ipcClient) {
        this.ipcClient.on('data', (data) => {
          const msg = data.toString();
          if (msg.includes('"event":"end-file"') || msg.includes('"reason":"eof"')) {
            this.cleanup(keyHandler);
            resolve('NEXT');
          }
        });
        // mpv에 이벤트 감지 활성화 요청
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
  }

  startTimer(song, current, total) {
    this.renderUI(song, current, total);
    this.timer = setInterval(() => {
      if (this.isPlaying) {
        this.currentSec++;
        if (this.totalSec > 0 && this.currentSec >= this.totalSec) {
          this.currentSec = this.totalSec;
          // 여기서 강제로 다음 곡을 부르지 않고 mpv의 종료 이벤트를 기다립니다.
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

  renderUI(song, current, total) {
    console.clear();
    const loopIcon = this.loopMode === 'ONE' ? '🔂 One' : this.loopMode === 'ALL' ? '🔁 All' : '➡️ Off';
    const statusIcon = this.isPlaying ? '▶️' : '⏸️';
    
    console.log(`\n ${chalk.cyan.bold('DevDeck Player')}  ${chalk.dim('|')}  Track ${chalk.yellow(current)}/${chalk.dim(total)}  ${chalk.dim('|')}  ${chalk.blue(loopIcon)}`);
    console.log(chalk.gray(' ───────────────────────────────────────────'));
    console.log(`\n ${chalk.white.bold(this.truncate(song.title, 40))}`);
    console.log(` ${chalk.gray(this.truncate(song.author?.name || 'Unknown', 40))}`);
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
    console.log(chalk.cyan(`  [Space] Pause    [←/→] Seek    [s] Skip    [q] Quit`));
  }

  truncate(str, n) { return str?.length > n ? str.substr(0, n - 1) + '…' : str; }
  formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
}