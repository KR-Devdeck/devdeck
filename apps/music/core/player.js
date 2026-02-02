import { spawn } from 'child_process';
import chalk from 'chalk';

export class MusicPlayer {
  constructor() {
    this.queue = [];
    this.loopMode = 'NONE';
  }

  add(song) { this.queue.push(song); }

  remove(index) {
    if (index < 0 || index >= this.queue.length) return false;
    this.queue.splice(index, 1);
    return true;
  }

  setLoop(mode) { this.loopMode = mode; }

  // ▶️ 재생 루프
  async playQueue() {
    if (this.queue.length === 0) return;

    let index = 0;
    while (index < this.queue.length) {
      const song = this.queue[index];

      // 🎨 UI: 깔끔한 재생 화면 그리기
      this.printNowPlaying(song, index + 1, this.queue.length);

      // 🚀 MPV 실행 (키보드 제어권 넘김)
      await this.spawnMpv(song.videoId);

      // --- 다음 곡 로직 ---
      if (this.loopMode === 'ONE') {
        // 반복 없음 (인덱스 유지)
      } else {
        index++;
        if (index >= this.queue.length) {
          if (this.loopMode === 'ALL') index = 0;
          else break;
        }
      }
    }
  }

  // 📺 화면 그리기 함수
  printNowPlaying(song, current, total) {
    console.clear();
    
    // 박스 라인 정의
    const line = chalk.magenta('──────────────────────────────────────────────');
    const title = this.cutStr(song.title, 42);
    const artist = this.cutStr(song.author.name, 42);
    
    console.log('\n');
    console.log(chalk.magenta('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓'));
    console.log(chalk.magenta('┃') + chalk.yellow.bold('  🎵  NOW PLAYING...                          ') + chalk.magenta('┃'));
    console.log(chalk.magenta('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫'));
    console.log(chalk.magenta('┃') + `  ${chalk.white(title)}  ` + chalk.magenta('┃'));
    console.log(chalk.magenta('┃') + `  ${chalk.dim(artist)}  ` + chalk.magenta('┃'));
    console.log(chalk.magenta('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛'));
    
    // 상태 정보
    console.log(chalk.cyan(`   📊 Track: ${current}/${total}  |  🔁 Loop: ${this.loopMode}`));
    console.log(chalk.dim(line));
    
    // 조작법 안내
    console.log(chalk.white.bold('\n   [ 🎮 Controls ]'));
    console.log(chalk.white('   Space  ') + chalk.dim(': 일시정지 / 재생'));
    console.log(chalk.white('   ← / →  ') + chalk.dim(': 10초 뒤로 / 앞으로'));
    console.log(chalk.white('     q    ') + chalk.dim(': 다음 곡 (Skip)'));
    console.log(chalk.white('   Ctrl+C ') + chalk.dim(': 메뉴로 나가기 (Stop)'));
    console.log('\n' + chalk.dim('   (Loading audio stream...)'));
  }

  spawnMpv(videoId) {
    return new Promise((resolve) => {
      const mpv = spawn('mpv', [
        '--no-video',
        '--quiet',       // 불필요한 로그 숨김
        '--msg-level=all=error', // 에러만 출력
        `https://www.youtube.com/watch?v=${videoId}`
      ], { stdio: 'inherit' }); // 키보드 직접 제어

      mpv.on('close', () => resolve());
    });
  }

  // 문자열 자르기 (한글 패딩 보정)
  cutStr(str, len) {
    if (!str) return ''.padEnd(len);
    // 단순 길이 자르기 (복잡한 한글 계산 대신 안전하게)
    const formatted = str.length > len ? str.substring(0, len - 3) + '...' : str;
    return formatted.padEnd(len - (formatted.length - formatted.replace(/[^\x00-\x7F]/g, "").length)); // 한글 길이 보정 트릭
  }
}