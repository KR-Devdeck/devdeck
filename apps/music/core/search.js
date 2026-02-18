import inquirer from 'inquirer';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from '../../core/config.js';

// 📂 경로 설정: 프로젝트 루트의 data/history.json 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 현재 위치(apps/music/core)에서 세 번 위로 올라가면 프로젝트 루트 -> data 폴더
const DATA_DIR = path.join(__dirname, '../../../data'); 
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const T = (key, vars = {}) => {
  const lang = getConfig().language || 'ko';
  const m = {
    save_fail: { ko: '데이터 저장 실패:', en: 'Failed to save data:', ja: 'データ保存失敗:', 'zh-CN': '数据保存失败:' },
    opt_select: { ko: '검색 옵션을 선택하세요:', en: 'Select search option:', ja: '検索オプションを選択:', 'zh-CN': '请选择搜索选项:' },
    by_title: { ko: '🎵 노래 제목 검색', en: '🎵 Search by title', ja: '🎵 曲名で検索', 'zh-CN': '🎵 按歌曲名搜索' },
    by_artist: { ko: '🎤 가수 이름 검색', en: '🎤 Search by artist', ja: '🎤 アーティスト名で検索', 'zh-CN': '🎤 按歌手搜索' },
    recent: { ko: '🕒 최근 검색어 ({n})', en: '🕒 Recent searches ({n})', ja: '🕒 最近の検索 ({n})', 'zh-CN': '🕒 最近搜索 ({n})' },
    cancel: { ko: '🔙 취소', en: '🔙 Cancel', ja: '🔙 キャンセル', 'zh-CN': '🔙 取消' },
    recent_title: { ko: '최근 검색한 기록:', en: 'Recent search history:', ja: '最近の検索履歴:', 'zh-CN': '最近搜索记录:' },
    back: { ko: '🔙 뒤로', en: '🔙 Back', ja: '🔙 戻る', 'zh-CN': '🔙 返回' },
    ask_artist: { ko: '가수 이름을 입력하세요:', en: 'Enter artist name:', ja: 'アーティスト名を入力:', 'zh-CN': '请输入歌手名称:' },
    ask_title: { ko: '노래 제목을 입력하세요:', en: 'Enter song title:', ja: '曲名を入力:', 'zh-CN': '请输入歌曲名:' },
    need_query: { ko: '검색어를 입력해주세요.', en: 'Please enter a query.', ja: '検索語を入力してください。', 'zh-CN': '请输入搜索词。' },
    searching: { ko: "'{q}' 검색 중...", en: "Searching '{q}'...", ja: "'{q}' を検索中...", 'zh-CN': "正在搜索 '{q}'..." },
    no_result: { ko: '\n❌ 검색 결과가 없습니다.', en: '\n❌ No search results.', ja: '\n❌ 検索結果がありません。', 'zh-CN': '\n❌ 没有搜索结果。' },
    search_fail: { ko: '\n🚫 검색 실패:', en: '\n🚫 Search failed:', ja: '\n🚫 検索失敗:', 'zh-CN': '\n🚫 搜索失败:' },
    prev: { ko: '⏪  이전 페이지 (Prev)', en: '⏪  Previous page', ja: '⏪  前のページ', 'zh-CN': '⏪  上一页' },
    next: { ko: '⏩  다음 페이지 (Next)', en: '⏩  Next page', ja: '⏩  次のページ', 'zh-CN': '⏩  下一页' },
    unknown: { ko: 'Unknown', en: 'Unknown', ja: 'Unknown', 'zh-CN': 'Unknown' },
    choose_song: { ko: '노래 선택 ({page}/{total}) - [Space:선택, Enter:확정]', en: 'Select songs ({page}/{total}) - [Space:select, Enter:confirm]', ja: '曲を選択 ({page}/{total}) - [Space:選択, Enter:確定]', 'zh-CN': '选择歌曲 ({page}/{total}) - [Space:选择, Enter:确认]' }
  };
  const raw = (m[key]?.[lang] ?? m[key]?.ko ?? key);
  return Object.entries(vars).reduce((a,[k,v])=>a.replaceAll(`{${k}}`, String(v)), raw);
};

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
    console.error(chalk.red(T('save_fail')), e.message);
  }
};

export const searchMenu = async () => {
  const allData = getHistoryData();
  const history = allData.searchHistory || []; // 검색 기록만 추출
  
  // 1. 🔍 검색 방식 선택
  const menuChoices = [
    { name: T('by_title'), value: 'title' },
    { name: T('by_artist'), value: 'artist' }
  ];

  if (history.length > 0) {
    menuChoices.push(new inquirer.Separator());
    menuChoices.push({ name: T('recent', { n: history.length }), value: 'history' });
  }

  menuChoices.push(new inquirer.Separator());
  menuChoices.push({ name: T('cancel'), value: 'back' });

  const { searchType } = await inquirer.prompt([{
    type: 'list',
    name: 'searchType',
    message: T('opt_select'),
    loop: false,
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
      message: T('recent_title'),
      loop: false,
      choices: [...history, new inquirer.Separator(), { name: T('back'), value: 'back' }]
    }]);
    if (selectedHistory === 'back') return searchMenu();
    query = selectedHistory;
    finalQuery = query;

  } else {
    const { inputQuery } = await inquirer.prompt([{
      type: 'input',
      name: 'inputQuery',
      message: searchType === 'artist' ? T('ask_artist') : T('ask_title'),
      validate: (input) => input.trim() ? true : T('need_query')
    }]);
    query = inputQuery;
    finalQuery = searchType === 'artist' ? `${query} song audio` : query;
    
    // ✅ 통합된 history.json에 저장
    saveSearchKeyword(query);
  }

  // 3. 🚀 검색 실행 (50개 미리 로드)
  const spinner = ora(chalk.cyan(T('searching', { q: query }))).start();
  let allItems = [];
  
  try {
    allItems = await runYtDlpSearch(finalQuery, 50);
    spinner.stop();

    if (allItems.length === 0) {
      console.log(chalk.red(T('no_result')));
      await pause(1500);
      return null;
    }

  } catch (e) {
    spinner.stop();
    console.log(chalk.red(T('search_fail')), e.message);
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
      choices.push({ name: chalk.cyan(T('prev')), value: 'PREV_PAGE' });
      choices.push(new inquirer.Separator());
    }

    currentItems.forEach(v => {
      const timeStr = v.duration ? `(${formatTime(v.duration)})` : '';
      choices.push({
        name: `${chalk.bold(v.title)} ${chalk.dim(timeStr)} - ${chalk.gray(v.uploader || T('unknown'))}`,
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
      choices.push({ name: chalk.cyan(T('next')), value: 'NEXT_PAGE' });
    }

    const { selectedVideos } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedVideos',
      message: T('choose_song', { page: currentPage + 1, total: totalPages }),
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
