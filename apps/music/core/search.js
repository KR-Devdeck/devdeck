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

  const finalQuery = searchType === 'artist' ? `${query} official audio` : query;
  
  const spinner = ora('YouTube 검색 중...').start();

  try {
    const items = await runYtDlpSearch(finalQuery);
    spinner.stop();

    if (items.length === 0) {
      console.log(chalk.red('\n❌ 검색 결과가 없습니다.'));
      await pause(1000);
      return null;
    }

    // 3. [핵심 변경] 결과 선택 (Checkbox)
    // 이제 스페이스바로 여러 개 선택 가능합니다!
    const { selectedVideos } = await inquirer.prompt([{
      type: 'checkbox',  // list -> checkbox 변경
      name: 'selectedVideos',
      message: '추가할 노래를 선택하세요 (Space:선택, Enter:확정):',
      pageSize: 15,
      choices: items.map(v => ({
        name: `${chalk.bold(v.title)} ${v.duration ? chalk.dim(`(${formatTime(v.duration)})`) : ''} - ${chalk.gray(v.uploader || 'Unknown')}`,
        value: {
          title: v.title,
          videoId: v.id,
          duration: v.duration || 0,
          author: { name: v.uploader || 'Unknown' }
        }
      }))
    }]);

    // 아무것도 선택 안 하고 엔터 치면 취소로 간주
    if (selectedVideos.length === 0) return null;
    
    // 배열(여러 곡)을 반환
    return selectedVideos;

  } catch (e) {
    spinner.fail('검색 실패');
    console.log(chalk.red('\n🚫 에러:'), e.message);
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
    let output = '';

    child.stdout.on('data', (data) => output += data.toString());

    child.on('close', () => {
      const results = output
        .trim()
        .split('\n')
        .map(line => { try { return JSON.parse(line); } catch (e) { return null; } })
        .filter(item => item && item.id)
        .filter(item => {
           const dur = item.duration;
           if (dur && (dur < 10 || dur > 900)) return false; 
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