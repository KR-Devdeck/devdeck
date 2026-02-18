import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const BOX_WIDTH = 52;

let isFetchingWeather = false;

const WEATHER_CODE_KO = {
  0: '맑음 ☀️',
  1: '대체로 맑음 🌤️',
  2: '구름 조금 ⛅',
  3: '흐림 ☁️',
  45: '안개 🌫️',
  48: '안개(서리) 🌫️',
  51: '약한 이슬비 ☔',
  53: '이슬비 ☔',
  55: '강한 이슬비 ☔',
  56: '약한 어는비 🧊',
  57: '강한 어는비 🧊',
  61: '약한 비 ☔',
  63: '비 ☔',
  65: '강한 비 ☔',
  66: '약한 어는비 🧊',
  67: '강한 어는비 🧊',
  71: '약한 눈 🌨️',
  73: '눈 ❄️',
  75: '강한 눈 ❄️',
  77: '싸락눈 ❄️',
  80: '약한 소나기 ☔',
  81: '소나기 ☔',
  82: '강한 소나기 ⛈️',
  85: '약한 눈 소나기 🌨️',
  86: '강한 눈 소나기 🌨️',
  95: '뇌우 ⚡',
  96: '우박 동반 뇌우 ⚡',
  99: '강한 우박 동반 뇌우 ⚡'
};

const FALLBACK_QUOTES = [
  { content: "코드는 거짓말을 하지 않는다. 주석은 가끔 한다.", author: "Unknown" },
  { content: "내일의 나를 위해 오늘의 코드를 깨끗하게 하라.", author: "Clean Code" },
  { content: "버그를 없애는 유일한 방법은 코드를 안 짜는 것이다.", author: "Wise Dev" },
  { content: "일단 돌아가게 만들어라. 그 다음 올바르게 만들어라.", author: "Kent Beck" },
  { content: "배포 없는 금요일, 버그 없는 주말.", author: "DevDeck" }
];

const getTextWidth = (str) => {
  let width = 0;
  for (const char of str) {
    if (char.match(/[^\u0000-\u00ff]/)) width += 2;
    else width += 1;
  }
  return width;
};

const printBoxLine = (text) => {
  const textLen = getTextWidth(text);
  const paddingLen = Math.max(0, BOX_WIDTH - textLen);
  console.log(`┃ ${text}${' '.repeat(paddingLen)} ┃`);
};

const loadData = () => {
  if (!fs.existsSync(DATA_FILE)) return { todos: [], weather: null, lastFetch: 0, workflow: [] };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } 
  catch { return { todos: [], weather: null, lastFetch: 0, workflow: [] }; }
};

const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const fetchWeatherFromApi = async () => {
  const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
    timeout: 1200,
    params: {
      latitude: 37.5665,
      longitude: 126.9780,
      current: 'temperature_2m,weather_code',
      timezone: 'Asia/Seoul',
      forecast_days: 1
    }
  });

  const current = response?.data?.current;
  if (!current) throw new Error('No Data');

  const temp = Math.round(Number(current.temperature_2m));
  const weatherCode = Number(current.weather_code);
  const weatherText = WEATHER_CODE_KO[weatherCode] || '날씨 정보 확인 불가';
  return `${weatherText} (${temp}°C)`;
};

const getWeatherNonBlocking = (currentData) => {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  if (currentData.weather && (now - currentData.lastFetch < ONE_HOUR)) {
    return { data: currentData.weather, icon: '⚡' };
  }

  if (!isFetchingWeather) {
    updateWeatherBackground();
  }

  return { 
    data: currentData.weather || '날씨 불러오는 중...', 
    icon: '⏳' 
  };
};

const updateWeatherBackground = async () => {
  isFetchingWeather = true;
  try {
    const weatherText = await fetchWeatherFromApi();
    const newData = loadData();
    newData.weather = weatherText;
    newData.lastFetch = Date.now();
    saveData(newData);
  } catch (e) {
  } finally {
    isFetchingWeather = false;
  }
};

const getDevQuote = async () => {
  try {
    const res = await axios.get('https://api.quotable.io/random?tags=technology', { timeout: 800 });
    return { content: res.data.content, author: res.data.author };
  } catch (e) {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
};

export const runDaily = async () => {
  console.clear();
  
  const data = loadData();
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const weatherInfo = getWeatherNonBlocking(data);
  const quote = await getDevQuote();
  
  const topBorder = '┏' + '━'.repeat(BOX_WIDTH + 2) + '┓';
  const midBorder = '┣' + '━'.repeat(BOX_WIDTH + 2) + '┫';
  const botBorder = '┗' + '━'.repeat(BOX_WIDTH + 2) + '┛';

  console.log(chalk.cyan(topBorder));
  printBoxLine(`${chalk.bold(dateStr)} ${timeStr}`);
  
  const rawText = `${weatherInfo.data} ${weatherInfo.icon}`;
  const wWidth = getTextWidth(rawText);
  const wPadding = Math.max(0, BOX_WIDTH - wWidth);
  
  const coloredWeather = weatherInfo.icon === '⚡' 
    ? `${chalk.yellow(weatherInfo.data)} ${weatherInfo.icon}` 
    : `${chalk.gray(weatherInfo.data)} ${weatherInfo.icon}`;

  console.log(`┃ ${coloredWeather}${' '.repeat(wPadding)} ┃`);

  console.log(midBorder);

  let qText = quote.content;
  if (qText.length > 45) qText = qText.substring(0, 42) + '...';
  
  const quoteLine = `❝ ${qText} ❞`;
  const authorLine = `- ${quote.author}`;

  const qWidth = getTextWidth(quoteLine);
  const qPadding = Math.max(0, BOX_WIDTH - qWidth);
  console.log(`┃ ${chalk.italic.white(quoteLine)}${' '.repeat(qPadding)} ┃`);

  const aWidth = getTextWidth(authorLine);
  const aPadding = Math.max(0, BOX_WIDTH - aWidth);
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
      { name: '🔗 작업 흐름 보기 (Workflow)', value: 'workflow' },
      new inquirer.Separator(),
      { name: '🔄 새로고침 (Refresh)', value: 'refresh' },
      { name: '🔙 종료 (Exit)', value: 'quit' }
    ]
  }]);

  if (action === 'quit') return;

  if (action === 'refresh') {
    // Refresh loop
  } else if (action === 'add') {
    // [수정] 취소 기능 추가
    const { task } = await inquirer.prompt([{ 
      type: 'input', 
      name: 'task', 
      message: '할 일 (취소하려면 그냥 엔터):' 
    }]);
    
    // 내용이 없으면(엔터만 치면) 저장하지 않음
    if (task.trim()) { 
      data.todos.push({ task, done: false }); 
      saveData(data); 
    } else {
      console.log(chalk.gray('취소되었습니다.'));
      // 잠시 메시지 보여주기 위해 0.5초 대기
      await new Promise(r => setTimeout(r, 500));
    }
    
  } else if (action === 'toggle' && data.todos.length) {
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: '선택:', choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
    data.todos[idx].done = !data.todos[idx].done;
    if (data.todos[idx].done) {
      const context = captureGitContext();
      data.todos[idx].completedAt = new Date().toISOString();
      data.todos[idx].git = context;
      data.workflow = Array.isArray(data.workflow) ? data.workflow : [];
      data.workflow.unshift({
        task: data.todos[idx].task,
        completedAt: data.todos[idx].completedAt,
        git: context
      });
      data.workflow = data.workflow.slice(0, 20);
    } else {
      delete data.todos[idx].completedAt;
      delete data.todos[idx].git;
    }
    saveData(data);
  } else if (action === 'delete' && data.todos.length) {
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: '삭제:', choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
    data.todos.splice(idx, 1); saveData(data);
  } else if (action === 'workflow') {
    await showWorkflow(data);
  }

  console.clear();
  await runDaily();
};

const captureGitContext = () => {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const files = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.slice(3).replace(/"/g, ''))
      .slice(0, 8);

    return {
      branch: branch || '(detached)',
      changedFiles: files
    };
  } catch (e) {
    return {
      branch: '(not a git repo)',
      changedFiles: []
    };
  }
};

const showWorkflow = async (data) => {
  console.clear();
  console.log(chalk.cyan.bold('\n🔗 오늘 작업 흐름'));
  console.log(chalk.gray('────────────────────────────────────────'));
  const items = Array.isArray(data.workflow) ? data.workflow : [];
  if (!items.length) {
    console.log(chalk.gray('기록이 없습니다.'));
  } else {
    items.slice(0, 10).forEach((item, idx) => {
      const time = item.completedAt ? new Date(item.completedAt).toLocaleString('ko-KR') : '-';
      console.log(chalk.yellow(`${idx + 1}. ${item.task}`));
      console.log(chalk.gray(`   시간: ${time}`));
      console.log(chalk.gray(`   브랜치: ${item.git?.branch || '-'}`));
      const files = item.git?.changedFiles || [];
      if (files.length) {
        console.log(chalk.gray(`   파일: ${files.join(', ')}`));
      }
    });
  }
  await inquirer.prompt([{ type: 'input', name: 'ok', message: '엔터를 누르면 돌아갑니다.' }]);
};
