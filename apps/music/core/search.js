import yts from 'yt-search';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.join(__dirname, '../history.json');

// 💿 테마 리스트
const TOPICS = [
  { name: '👨‍💻 코딩 집중 (Lofi)', query: 'lofi hip hop radio' },
  { name: '☕ 카페 (Jazz)', query: 'starbucks jazz cafe' },
  { name: '💪 헬스 (Phonk/Rock)', query: 'workout motivation music' },
  { name: '🌧 비 오는 날 (Pop)', query: 'rainy day cozy pop' },
  { name: '🚗 드라이브 (City Pop)', query: 'city pop playlist' },
  { name: '🇰🇷 K-Pop', query: 'kpop latest hits' },
  { name: '🎸 밴드 (Rock)', query: 'rock band playlist' }
];

// 💾 히스토리 관리
const getHistory = () => {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch { return []; }
};

const addToHistory = (keyword) => {
  let history = getHistory();
  history = history.filter(h => h !== keyword);
  history.unshift(keyword);
  if (history.length > 10) history = history.slice(0, 10);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
};

export const searchMenu = async () => {
  const history = getHistory();
  
  const choices = [
    { name: '🔍 제목 검색', value: 'song' },
    { name: '🎤 가수 검색', value: 'artist' },
    { name: '💿 추천 테마', value: 'topic' }
  ];

  if (history.length > 0) {
    choices.push(new inquirer.Separator('--- 🕒 최근 검색어 ---'));
    history.forEach(h => {
      choices.push({ name: `🕒 ${h}`, value: `history:${h}` });
    });
  }

  choices.push(new inquirer.Separator('-----------------'));
  choices.push({ name: '🔙 취소', value: 'back' });

  const { type } = await inquirer.prompt([{
    type: 'list', name: 'type', message: '검색 방식:',
    choices: choices,
    pageSize: 15,
    loop: false // [수정] 무한 루프 끔 (맨 아래서 멈춤)
  }]);

  if (type === 'back') return null;

  let query = '';

  if (type.startsWith('history:')) {
    query = type.split('history:')[1];
    addToHistory(query);
  } 
  else if (type === 'topic') {
    const { topicQuery } = await inquirer.prompt([{
      type: 'list', name: 'topicQuery', message: '테마 선택:',
      choices: TOPICS.map(t => ({ name: t.name, value: t.query })),
      loop: false // [수정] 여기도 루프 끔
    }]);
    query = topicQuery;
  } 
  else {
    const { keyword } = await inquirer.prompt([{ type: 'input', name: 'keyword', message: '검색어:' }]);
    if (!keyword.trim()) return null;
    
    const realQuery = type === 'artist' ? `${keyword} best songs` : keyword;
    addToHistory(keyword);
    query = realQuery;
  }

  const spinner = ora(`'${query}' 찾는 중...`).start();
  try {
    const r = await yts(query);
    spinner.stop();
    const videos = r.videos.slice(0, 10);

    if (!videos.length) {
      console.log(chalk.red('❌ 결과 없음'));
      return null;
    }

    const { videoId } = await inquirer.prompt([{
      type: 'list', name: 'videoId', message: '추가할 노래 선택:',
      choices: [
        ...videos.map(v => ({
          name: `${chalk.bold(v.title)} - ${chalk.dim(v.author.name)} (${v.timestamp})`,
          value: v.videoId
        })),
        new inquirer.Separator(),
        { name: '🔙 취소', value: 'back' }
      ],
      pageSize: 12,
      loop: false // [핵심 수정] 노래 리스트 무한 루프 끔!
    }]);

    if (videoId === 'back') return null;
    return videos.find(v => v.videoId === videoId);

  } catch (e) {
    spinner.fail('검색 실패');
    return null;
  }
};