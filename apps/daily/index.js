import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import weather from 'weather-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const BOX_WIDTH = 52;

let isFetchingWeather = false;

// 🇰🇷 [업데이트] 모든 키를 소문자로 통일 (대소문자 무시 매칭용)
const WEATHER_DICT = {
  'sunny': '맑음 ☀️',
  'clear': '맑음 ☀️',
  'mostly sunny': '대체로 맑음 🌤️',
  'Mostly clear': '대체로 맑음 🌤️',
  'partly sunny': '구름 조금 ⛅',
  'partly cloudy': '구름 조금 ⛅',
  'mostly cloudy': '대체로 흐림 🌥️',
  'cloudy': '흐림 ☁️',
  'overcast': '매우 흐림 ☁️',
  'rain': '비 ☔',
  'showers': '소나기 ☔',
  'light rain': '가벼운 비 ☔',
  'rain showers': '비/소나기 ☔',
  'heavy rain': '폭우 ☔',
  'snow': '눈 ❄️',
  'light snow': '가벼운 눈 🌨️',
  'blowing snow': '날리는 눈 🌨️',
  'rain and snow': '진눈깨비 🌨️',
  'snow showers': '눈발 날림 🌨️',
  'ice/snow': '얼음/눈 🧊',
  'thunderstorm': '뇌우 ⚡',
  'haze': '안개 🌫️',
  'fog': '짙은 안개 🌫️',
  'mist': '옅은 안개 🌫️',
  'smoke': '미세먼지/연기 😷',
  'dust': '먼지 😷'
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
  if (!fs.existsSync(DATA_FILE)) return { todos: [], weather: null, lastFetch: 0 };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } 
  catch { return { todos: [], weather: null, lastFetch: 0 }; }
};

const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const fetchWeatherFromLib = () => {
  return new Promise((resolve, reject) => {
    weather.find({ search: 'Seoul, South Korea', degreeType: 'C' }, (err, result) => {
      if (err) reject(err);
      if (!result || result.length === 0) reject(new Error('No Data'));
      
      const current = result[0].current;
      const engText = current.skytext; // 예: "Mostly Clear"
      
      // [수정] 소문자로 변환해서 찾음 (대소문자 문제 해결)
      const lowerKey = engText.toLowerCase().trim();
      const korText = WEATHER_DICT[lowerKey] || engText;
      
      resolve(`${korText} (${current.temperature}°C)`);
    });
  });
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
    const weatherText = await fetchWeatherFromLib();
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
    data.todos[idx].done = !data.todos[idx].done; saveData(data);
  } else if (action === 'delete' && data.todos.length) {
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: '삭제:', choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
    data.todos.splice(idx, 1); saveData(data);
  }

  console.clear();
  await runDaily();
};