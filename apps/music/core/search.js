import inquirer from 'inquirer';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export const searchMenu = async () => {
  // 1. 검색 모드 선택
  const { searchType } = await inquirer.prompt([{
    type: 'list',
    name: 'searchType',
    message: '검색 옵션 선택:',
    choices: [
      { name: '🎵 노래 제목 검색', value: 'title' },
      { name: '🎤 가수 이름 검색', value: 'artist' },
      new inquirer.Separator(),
      { name: '🔙 취소', value: 'back' }
    ]
  }]);

  if (searchType === 'back') return null;

  // 2. 검색어 입력
  const { query } = await inquirer.prompt([{
    type: 'input',
    name: 'query',
    message: '검색어:',
    validate: (input) => input.trim() ? true : '검색어를 입력해주세요.'
  }]);

  const finalQuery = searchType === 'artist' ? `${query} song audio` : query;
  
  const spinner = ora(chalk.cyan('YouTube 검색 중...')).start();

  try {
    const items = await runYtDlpSearch(finalQuery);
    spinner.stop();

    if (items.length === 0) {
      console.log(chalk.red('\n❌ 검색 결과가 없습니다.'));
      await pause(1000);
      return null;
    }

    // 3. 결과 선택 (Checkbox)
    // 💡 UI 최적화 적용됨
    const { selectedVideos } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedVideos',
      message: '추가할 노래를 선택하세요 (Space:선택, Enter:확정):',
      pageSize: 7,    // [수정] 15 -> 7 (화면 갱신 부하를 줄여서 깜빡임 방지)
      loop: false,    // [수정] 무한 스크롤 기능 끄기 (끝에 도달하면 멈춤)
      choices: items.map(v => {
        const timeStr = v.duration ? `(${formatTime(v.duration)})` : '';
        return {
          name: `${chalk.bold(v.title)} ${chalk.dim(timeStr)} - ${chalk.gray(v.uploader || 'Unknown')}`,
          value: {
            title: v.title,
            videoId: v.id,
            duration: v.duration || 0,
            author: { name: v.uploader || 'Unknown' }
          }
        };
      })
    }]);

    if (!selectedVideos || selectedVideos.length === 0) return null;
    return selectedVideos;

  } catch (e) {
    spinner.stop();
    console.log(chalk.red('\n🚫 검색 실패:'), e.message);
    await pause(2000);
    return null;
  }
};

const runYtDlpSearch = (query) => {
  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch10:${query}`,
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--default-search', 'ytsearch'
    ];

    const child = spawn('yt-dlp', args);
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    
    child.on('close', (code) => {
      const output = Buffer.concat(chunks).toString('utf8');
      
      const results = output
        .trim()
        .split('\n')
        .map(line => {
          try { return JSON.parse(line); } catch (e) { return null; }
        })
        .filter(item => item && item.id)
        .filter(item => {
           const title = (item.title || '').toLowerCase();
           if (title.includes('trailer') || title.includes('teaser')) return false;
           return true; 
        });

      resolve(results);
    });

    child.on('error', (err) => reject(err));
  });
};

const formatTime = (seconds) => {
  if (!seconds) return '';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const pause = (ms) => new Promise(r => setTimeout(r, ms));