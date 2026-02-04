import inquirer from 'inquirer';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 경로 설정: 프로젝트 루트의 data/history.json 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 현재 위치(apps/music/core)에서 세 번 위로 올라가면 프로젝트 루트 -> data 폴더
const DATA_DIR = path.join(__dirname, '../../../data'); 
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// 디렉토리가 없으면 생성 (에러 방지)
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// 📖 데이터 읽기 (기존 데이터 유지)
const getHistoryData = () => {
  try { 
    if (!fs.existsSync(HISTORY_FILE)) return {};
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); 
  } 
  catch { return {}; }
};

// 💾 검색어만 쏙 저장하는 함수
const saveSearchKeyword = (query) => {
  if (!query) return;
  
  const allData = getHistoryData(); // 전체 데이터를 불러옴 (투두 등 포함)
  let history = allData.searchHistory || []; // 기존 검색 기록 가져오기

  // 중복 제거 후 맨 앞에 추가 (최신순 10개 유지)
  history = [query, ...history.filter(q => q !== query)].slice(0, 10); 
  
  // 전체 데이터에 다시 병합
  allData.searchHistory = history;

  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(allData, null, 2), 'utf8');
  } catch (e) {
    console.error(chalk.red('데이터 저장 실패:', e.message));
  }
};

export const searchMenu = async () => {
  const allData = getHistoryData();
  const history = allData.searchHistory || []; // 검색 기록만 추출
  
  // 1. 🔍 검색 방식 선택
  const menuChoices = [
    { name: '🎵 노래 제목 검색', value: 'title' },
    { name: '🎤 가수 이름 검색', value: 'artist' }
  ];

  if (history.length > 0) {
    menuChoices.push(new inquirer.Separator());
    menuChoices.push({ name: `🕒 최근 검색어 (${history.length})`, value: 'history' });
  }

  menuChoices.push(new inquirer.Separator());
  menuChoices.push({ name: '🔙 취소', value: 'back' });

  const { searchType } = await inquirer.prompt([{
    type: 'list',
    name: 'searchType',
    message: '검색 옵션을 선택하세요:',
    choices: menuChoices
  }]);

  if (searchType === 'back') return null;

  let query = '';
  let finalQuery = '';

  // 2. ⌨️ 검색어 입력 로직
  if (searchType === 'history') {
    const { selectedHistory } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedHistory',
      message: '최근 검색한 기록:',
      choices: [...history, new inquirer.Separator(), { name: '🔙 뒤로', value: 'back' }]
    }]);
    if (selectedHistory === 'back') return searchMenu();
    query = selectedHistory;
    finalQuery = query;

  } else {
    const { inputQuery } = await inquirer.prompt([{
      type: 'input',
      name: 'inputQuery',
      message: searchType === 'artist' ? '가수 이름을 입력하세요:' : '노래 제목을 입력하세요:',
      validate: (input) => input.trim() ? true : '검색어를 입력해주세요.'
    }]);
    query = inputQuery;
    finalQuery = searchType === 'artist' ? `${query} song audio` : query;
    
    // ✅ 통합된 history.json에 저장
    saveSearchKeyword(query);
  }

  // 3. 🚀 검색 실행 (50개 미리 로드)
  const spinner = ora(chalk.cyan(`'${query}' 검색 중...`)).start();
  let allItems = [];
  
  try {
    allItems = await runYtDlpSearch(finalQuery, 50);
    spinner.stop();

    if (allItems.length === 0) {
      console.log(chalk.red('\n❌ 검색 결과가 없습니다.'));
      await pause(1500);
      return null;
    }

  } catch (e) {
    spinner.stop();
    console.log(chalk.red('\n🚫 검색 실패:'), e.message);
    await pause(2000);
    return null;
  }

  // 4. 📄 페이지네이션 (7개씩 끊어서 보여주기)
  let currentPage = 0;
  const pageSize = 7;

  while (true) {
    const startIdx = currentPage * pageSize;
    const currentItems = allItems.slice(startIdx, startIdx + pageSize);
    const totalPages = Math.ceil(allItems.length / pageSize);

    const choices = [];
    
    if (currentPage > 0) {
      choices.push({ name: chalk.cyan('⏪  이전 페이지 (Prev)'), value: 'PREV_PAGE' });
      choices.push(new inquirer.Separator());
    }

    currentItems.forEach(v => {
      const timeStr = v.duration ? `(${formatTime(v.duration)})` : '';
      choices.push({
        name: `${chalk.bold(v.title)} ${chalk.dim(timeStr)} - ${chalk.gray(v.uploader || 'Unknown')}`,
        value: {
          title: v.title,
          videoId: v.id,
          duration: v.duration || 0,
          author: { name: v.uploader || 'Unknown' }
        }
      });
    });

    if (currentPage < totalPages - 1) {
      choices.push(new inquirer.Separator());
      choices.push({ name: chalk.cyan('⏩  다음 페이지 (Next)'), value: 'NEXT_PAGE' });
    }

    const { selectedVideos } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedVideos',
      message: `노래 선택 (${currentPage + 1}/${totalPages}) - [Space:선택, Enter:확정]`,
      pageSize: 12,
      loop: false,
      choices: choices
    }]);

    if (!selectedVideos || selectedVideos.length === 0) return null;

    if (selectedVideos.includes('NEXT_PAGE')) {
      currentPage++;
      continue;
    }
    if (selectedVideos.includes('PREV_PAGE')) {
      currentPage--;
      continue;
    }

    return selectedVideos;
  }
};

const runYtDlpSearch = (query, limit) => {
  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch${limit}:${query}`,
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--default-search', 'ytsearch'
    ];

    const child = spawn('yt-dlp', args);
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    
    child.on('close', () => {
      const output = Buffer.concat(chunks).toString('utf8');
      const seen = new Set();
      
      const results = output.trim().split('\n')
        .map(line => { try { return JSON.parse(line); } catch { return null; } })
        .filter(item => item && item.id)
        .filter(item => {
          const title = (item.title || '').toLowerCase();
          if (title.includes('trailer') || title.includes('teaser')) return false;
          if (item.duration && item.duration > 360) return false;

          const key = (item.title || '').replace(/\s+/g, '').toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      resolve(results);
    });

    child.on('error', (err) => reject(err));
  });
};

const formatTime = (s) => s ? `${Math.floor(s/60)}:${(Math.floor(s%60)+'').padStart(2,'0')}` : '';
const pause = (ms) => new Promise(r => setTimeout(r, ms));