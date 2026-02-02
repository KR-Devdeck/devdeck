import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const BOX_WIDTH = 52; // 박스 내부 너비 고정

// 🛡️ 백업용 명언 (API 실패시)
const FALLBACK_QUOTES = [
  { content: "코드는 거짓말을 하지 않는다. 주석은 가끔 한다.", author: "Unknown" },
  { content: "내일의 나를 위해 오늘의 코드를 깨끗하게 하라.", author: "Clean Code" },
  { content: "버그를 없애는 유일한 방법은 코드를 안 짜는 것이다.", author: "Wise Dev" },
  { content: "일단 돌아가게 만들어라. 그 다음 올바르게 만들어라.", author: "Kent Beck" },
  { content: "배포 없는 금요일, 버그 없는 주말.", author: "DevDeck" }
];

// 📏 [핵심] 글자 너비 계산 함수 (한글=2칸, 영어=1칸)
const getTextWidth = (str) => {
  let width = 0;
  for (const char of str) {
    // 한글 및 2바이트 문자 범위 체크
    if (char.match(/[^\u0000-\u00ff]/)) width += 2;
    else width += 1;
  }
  return width;
};

// 📦 박스 라인 출력 헬퍼
const printBoxLine = (text) => {
  const textLen = getTextWidth(text);
  const paddingLen = Math.max(0, BOX_WIDTH - textLen);
  console.log(`┃ ${text}${' '.repeat(paddingLen)} ┃`);
};

// 💾 데이터 로드/저장
const loadData = () => {
  if (!fs.existsSync(DATA_FILE)) return { todos: [], weather: null, lastFetch: 0 };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } 
  catch { return { todos: [], weather: null, lastFetch: 0 }; }
};

const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// 🌤️ 날씨 가져오기 (한국어 & 캐싱)
const getWeatherWithCache = async (currentData) => {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  if (currentData.weather && (now - currentData.lastFetch < ONE_HOUR)) {
    return { data: currentData.weather, fromCache: true };
  }

  try {
    // [수정] lang=ko 파라미터 추가
    const res = await axios.get('https://wttr.in/Seoul?format="%C+%t+(%w)"&lang=ko', { timeout: 1500 });
    const weatherText = res.data.replace(/"/g, '').trim();
    currentData.weather = weatherText;
    currentData.lastFetch = now;
    saveData(currentData);
    return { data: weatherText, fromCache: false };
  } catch (e) {
    return { data: currentData.weather || '날씨 정보 없음', fromCache: true };
  }
};

// 💬 명언 가져오기
const getDevQuote = async () => {
  try {
    const res = await axios.get('https://api.quotable.io/random?tags=technology', { timeout: 1000 });
    return { content: res.data.content, author: res.data.author };
  } catch (e) {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
};

// 🚀 메인 실행
export const runDaily = async () => {
  console.clear();
  
  const data = loadData();
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const [weatherInfo, quote] = await Promise.all([
    getWeatherWithCache(data),
    getDevQuote()
  ]);
  
  const weatherIcon = weatherInfo.fromCache ? '⚡' : '🔄';

  // 📐 박스 그리기
  const topBorder = '┏' + '━'.repeat(BOX_WIDTH + 2) + '┓';
  const midBorder = '┣' + '━'.repeat(BOX_WIDTH + 2) + '┫';
  const botBorder = '┗' + '━'.repeat(BOX_WIDTH + 2) + '┛';

  console.log(chalk.cyan(topBorder));
  
  // 1. 날짜 줄
  const dateLine = `${chalk.bold(dateStr)} ${timeStr}`;
  printBoxLine(dateLine);
  
  // 2. 날씨 줄
  // 색상 코드가 들어가면 길이 계산이 꼬이므로, 출력할 땐 색 입히고 길이 계산은 평문으로 함
  // 하지만 간단하게 처리하기 위해 날씨 텍스트만 출력
  const weatherLine = `${weatherInfo.data} ${weatherIcon}`;
  printBoxLine(weatherLine);
  
  console.log(midBorder);

  // 3. 명언 줄 (길면 자름)
  let qText = quote.content;
  if (qText.length > 45) qText = qText.substring(0, 42) + '...';
  
  // 명언은 이탤릭체라 특수문자 취급 주의, 여기선 심플하게
  const quoteLine = `❝ ${qText} ❞`;
  const authorLine = `- ${quote.author}`;

  // 수동 패딩 계산해서 출력 (printBoxLine 활용)
  // 색상 코드(chalk)가 들어가면 getTextWidth가 꼬이므로, 공백을 먼저 계산하고 나중에 색을 입힘
  const qWidth = getTextWidth(quoteLine);
  const qPadding = Math.max(0, BOX_WIDTH - qWidth);
  console.log(`┃ ${chalk.italic.white(quoteLine)}${' '.repeat(qPadding)} ┃`);

  const aWidth = getTextWidth(authorLine);
  const aPadding = Math.max(0, BOX_WIDTH - aWidth);
  // 저자는 오른쪽 정렬 느낌을 위해 앞쪽에 공백을 줌 (여기선 그냥 왼쪽 정렬 통일하되 박스만 맞춤)
  console.log(`┃ ${chalk.dim(authorLine)}${' '.repeat(aPadding)} ┃`);

  console.log(chalk.cyan(botBorder));

  await todoLoop(data);
};

const todoLoop = async (data) => {
  console.log(chalk.yellow('\n📝 To-Do List'));
  if (data.todos.length === 0) console.log(chalk.gray('   (할 일이 없습니다. ➕ 추가해보세요!)'));

  data.todos.forEach((t, i) => {
    const check = t.done ? chalk.green('✔') : chalk.red('☐');
    const text = t.done ? chalk.dim.strikethrough(t.task) : chalk.bold(t.task);
    console.log(`   ${chalk.cyan(i + 1)} ${check} ${text}`);
  });
  console.log('');

  const { action } = await inquirer.prompt([{
    type: 'list', name: 'action', message: 'Action:', pageSize: 10,
    choices: [
      { name: '➕ 추가 (Add)', value: 'add' },
      { name: '✅ 완료 (Toggle)', value: 'toggle' },
      { name: '🗑  삭제 (Delete)', value: 'delete' },
      new inquirer.Separator(),
      { name: '🧹 청소 (Clear Done)', value: 'clear' },
      { name: '🔙 종료 (Exit)', value: 'quit' }
    ]
  }]);

  if (action === 'quit') {
    console.log(chalk.gray('Bye! 👋'));
    return;
  }

  if (action === 'add') {
    const { task } = await inquirer.prompt([{ type: 'input', name: 'task', message: '할 일:' }]);
    if (task.trim()) { data.todos.push({ task, done: false }); saveData(data); }
  } else if (action === 'toggle' && data.todos.length) {
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: '선택:', choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
    data.todos[idx].done = !data.todos[idx].done; saveData(data);
  } else if (action === 'delete' && data.todos.length) {
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: '삭제:', choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
    data.todos.splice(idx, 1); saveData(data);
  } else if (action === 'clear') {
    data.todos = data.todos.filter(t => !t.done); saveData(data);
  }

  console.clear();
  await runDaily();
};