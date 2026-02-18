import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { getTheme } from '../core/theme.js';
import { getConfig } from '../core/config.js';
import { tr } from '../core/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const BOX_WIDTH = 52;
const ANSI_REGEX = /\u001B\[[0-9;]*m/g;

let isFetchingWeather = false;
let isFetchingQuote = false;

const WEATHER_CODE_TEXT = {
  ko: {
    0: '맑음 ☀️', 1: '대체로 맑음 🌤️', 2: '구름 조금 ⛅', 3: '흐림 ☁️',
    45: '안개 🌫️', 48: '안개(서리) 🌫️',
    51: '약한 이슬비 ☔', 53: '이슬비 ☔', 55: '강한 이슬비 ☔',
    56: '약한 어는비 🧊', 57: '강한 어는비 🧊',
    61: '약한 비 ☔', 63: '비 ☔', 65: '강한 비 ☔',
    66: '약한 어는비 🧊', 67: '강한 어는비 🧊',
    71: '약한 눈 🌨️', 73: '눈 ❄️', 75: '강한 눈 ❄️', 77: '싸락눈 ❄️',
    80: '약한 소나기 ☔', 81: '소나기 ☔', 82: '강한 소나기 ⛈️',
    85: '약한 눈 소나기 🌨️', 86: '강한 눈 소나기 🌨️',
    95: '뇌우 ⚡', 96: '우박 동반 뇌우 ⚡', 99: '강한 우박 동반 뇌우 ⚡'
  },
  en: {
    0: 'Clear ☀️', 1: 'Mainly clear 🌤️', 2: 'Partly cloudy ⛅', 3: 'Overcast ☁️',
    45: 'Fog 🌫️', 48: 'Rime fog 🌫️',
    51: 'Light drizzle ☔', 53: 'Drizzle ☔', 55: 'Dense drizzle ☔',
    56: 'Light freezing drizzle 🧊', 57: 'Dense freezing drizzle 🧊',
    61: 'Light rain ☔', 63: 'Rain ☔', 65: 'Heavy rain ☔',
    66: 'Light freezing rain 🧊', 67: 'Heavy freezing rain 🧊',
    71: 'Light snow 🌨️', 73: 'Snow ❄️', 75: 'Heavy snow ❄️', 77: 'Snow grains ❄️',
    80: 'Light showers ☔', 81: 'Showers ☔', 82: 'Heavy showers ⛈️',
    85: 'Light snow showers 🌨️', 86: 'Heavy snow showers 🌨️',
    95: 'Thunderstorm ⚡', 96: 'Thunderstorm with hail ⚡', 99: 'Severe thunderstorm with hail ⚡'
  },
  ja: {
    0: '快晴 ☀️', 1: 'ほぼ晴れ 🌤️', 2: '一部曇り ⛅', 3: '曇り ☁️',
    45: '霧 🌫️', 48: '着氷性の霧 🌫️',
    51: '弱い霧雨 ☔', 53: '霧雨 ☔', 55: '強い霧雨 ☔',
    56: '弱い着氷性霧雨 🧊', 57: '強い着氷性霧雨 🧊',
    61: '弱い雨 ☔', 63: '雨 ☔', 65: '強い雨 ☔',
    66: '弱い着氷性雨 🧊', 67: '強い着氷性雨 🧊',
    71: '弱い雪 🌨️', 73: '雪 ❄️', 75: '大雪 ❄️', 77: '雪粒 ❄️',
    80: '弱いにわか雨 ☔', 81: 'にわか雨 ☔', 82: '激しいにわか雨 ⛈️',
    85: '弱いにわか雪 🌨️', 86: '強いにわか雪 🌨️',
    95: '雷雨 ⚡', 96: 'ひょうを伴う雷雨 ⚡', 99: '激しいひょうを伴う雷雨 ⚡'
  },
  'zh-CN': {
    0: '晴 ☀️', 1: '基本晴 🌤️', 2: '局部多云 ⛅', 3: '阴 ☁️',
    45: '雾 🌫️', 48: '冻雾 🌫️',
    51: '小毛毛雨 ☔', 53: '毛毛雨 ☔', 55: '强毛毛雨 ☔',
    56: '轻冻毛毛雨 🧊', 57: '强冻毛毛雨 🧊',
    61: '小雨 ☔', 63: '雨 ☔', 65: '大雨 ☔',
    66: '轻冻雨 🧊', 67: '强冻雨 🧊',
    71: '小雪 🌨️', 73: '雪 ❄️', 75: '大雪 ❄️', 77: '米雪 ❄️',
    80: '小阵雨 ☔', 81: '阵雨 ☔', 82: '强阵雨 ⛈️',
    85: '小阵雪 🌨️', 86: '强阵雪 🌨️',
    95: '雷暴 ⚡', 96: '伴冰雹雷暴 ⚡', 99: '强冰雹雷暴 ⚡'
  }
};

const getWeatherTextByCode = (code, lang) => {
  const table = WEATHER_CODE_TEXT[lang] || WEATHER_CODE_TEXT.ko;
  return table[code] || tr('daily_weather_unavailable', lang);
};

const FALLBACK_QUOTES = [
  { content: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { content: "Programs must be written for people to read.", author: "Harold Abelson" },
  { content: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  { content: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { content: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { content: "Premature optimization is the root of all evil.", author: "Donald Knuth" },
  { content: "First, solve the problem. Then, write the code.", author: "John Johnson" }
];
const DEFAULT_DATA = { todos: [], weather: null, lastFetch: 0, quote: null, quoteLastFetch: 0, workflow: [] };

const getTextWidth = (input) => {
  const text = String(input ?? '').replace(ANSI_REGEX, '');
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (!cp) continue;
    // Ignore zero-width joiner and variation selectors.
    if (cp === 0x200d || cp === 0xfe0e || cp === 0xfe0f) continue;
    // Ignore common combining diacritical marks.
    if (cp >= 0x0300 && cp <= 0x036f) continue;
    // Wide ranges for CJK + Hangul + emoji blocks.
    if (
      (cp >= 0x1100 && cp <= 0x11ff) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe10 && cp <= 0xfe6f) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0x1f300 && cp <= 0x1faff)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
};

const normalizeEmojiText = (input) =>
  String(input ?? '')
    .replace(/[\uFE0E\uFE0F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const fitToWidth = (input, width) => {
  const text = String(input ?? '');
  if (getTextWidth(text) <= width) return text;

  const ellipsis = '...';
  const target = Math.max(0, width - getTextWidth(ellipsis));
  let out = '';
  for (const ch of text) {
    if (getTextWidth(out + ch) > target) break;
    out += ch;
  }
  return out + ellipsis;
};

const printBoxLine = (plainText, render = (t) => t) => {
  const fitted = fitToWidth(plainText, BOX_WIDTH);
  const textLen = getTextWidth(fitted);
  const paddingLen = Math.max(0, BOX_WIDTH - textLen);
  const side = getTheme().primary('┃');
  console.log(`${side} ${render(fitted)}${' '.repeat(paddingLen)} ${side}`);
};

const formatDateLine = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const loadData = () => {
  if (!fs.existsSync(DATA_FILE)) return { ...DEFAULT_DATA };
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return { ...DEFAULT_DATA };
  }
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
  const lang = getConfig().language || 'ko';
  const weatherText = getWeatherTextByCode(weatherCode, lang);
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
    data: currentData.weather || tr('daily_weather_loading', getConfig().language || 'ko'),
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

const fetchDevQuote = async () => {
  // 1) Primary source: ZenQuotes
  try {
    const res = await axios.get('https://zenquotes.io/api/random', { timeout: 2000 });
    const item = Array.isArray(res.data) ? res.data[0] : null;
    if (item?.q && item?.a) {
      return { content: String(item.q), author: String(item.a) };
    }
  } catch (e) {}

  // 2) Secondary source: Quotable
  try {
    const res = await axios.get('https://api.quotable.io/random?tags=technology', { timeout: 2000 });
    if (res?.data?.content && res?.data?.author) {
      return { content: String(res.data.content), author: String(res.data.author) };
    }
  } catch (e) {}

  // 3) Curated fallback
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
};

const getQuoteNonBlocking = (currentData) => {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const now = Date.now();

  if (currentData.quote && (now - Number(currentData.quoteLastFetch || 0) < SIX_HOURS)) {
    return { data: currentData.quote, icon: '⚡' };
  }

  if (!isFetchingQuote) {
    updateQuoteBackground();
  }

  if (currentData.quote?.content && currentData.quote?.author) {
    return { data: currentData.quote, icon: '⏳' };
  }

  return {
    data: FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)],
    icon: '⏳'
  };
};

const updateQuoteBackground = async () => {
  isFetchingQuote = true;
  try {
    const quote = await fetchDevQuote();
    const newData = loadData();
    newData.quote = quote;
    newData.quoteLastFetch = Date.now();
    saveData(newData);
  } catch (e) {
  } finally {
    isFetchingQuote = false;
  }
};

export const runDaily = async () => {
  console.clear();

  const t = getTheme();
  const lang = getConfig().language || 'ko';
  
  const data = loadData();
  const now = new Date();
  const dateLine = formatDateLine(now);

  const weatherInfo = getWeatherNonBlocking(data);
  const quoteInfo = getQuoteNonBlocking(data);
  const quote = quoteInfo.data;
  
  const topBorder = '┏' + '━'.repeat(BOX_WIDTH + 2) + '┓';
  const midBorder = '┣' + '━'.repeat(BOX_WIDTH + 2) + '┫';
  const botBorder = '┗' + '━'.repeat(BOX_WIDTH + 2) + '┛';

  console.log(t.primary(topBorder));
  printBoxLine(dateLine, (v) => t.accent(chalk.bold(v)));
  
  const statusText = weatherInfo.icon === '⚡' ? tr('daily_cached', lang) : tr('daily_loading', lang);
  const rawText = `${normalizeEmojiText(weatherInfo.data)} (${statusText})`;
  const coloredWeather = weatherInfo.icon === '⚡' 
    ? t.success
    : t.info;
  printBoxLine(rawText, (v) => coloredWeather(v));
  console.log(t.primary(midBorder));

  let qText = fitToWidth(quote.content, 45);
  
  const quoteLine = `"${qText}"`;
  const authorLine = `- ${quote.author}`;

  printBoxLine(quoteLine, (v) => chalk.italic(t.primary(v)));
  printBoxLine(authorLine, (v) => t.muted(v));

  console.log(t.primary(botBorder));

  await todoLoop(data);
};

const todoLoop = async (data) => {
  const theme = getTheme();
  const lang = getConfig().language || 'ko';
  console.log(theme.accent(tr('daily_todo_title', lang)));
  if (data.todos.length === 0) console.log(theme.muted(tr('daily_todo_empty', lang)));

  data.todos.forEach((item, i) => {
    const check = item.done ? theme.success('✔') : theme.danger('☐');
    const text = item.done ? chalk.dim.strikethrough(item.task) : chalk.bold(item.task);
    console.log(`   ${theme.primary(i + 1)} ${check} ${text}`);
  });
  console.log('');

  const { action } = await inquirer.prompt([{
    type: 'list', name: 'action', message: tr('daily_action_message', lang), pageSize: 10,
    choices: [
      { name: tr('daily_add', lang), value: 'add' },
      { name: tr('daily_toggle', lang), value: 'toggle' },
      { name: tr('daily_delete', lang), value: 'delete' },
      { name: tr('daily_workflow', lang), value: 'workflow' },
      new inquirer.Separator(),
      { name: tr('daily_refresh', lang), value: 'refresh' },
      { name: tr('daily_exit', lang), value: 'quit' }
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
      message: tr('daily_task_input', lang)
    }]);
    
    // 내용이 없으면(엔터만 치면) 저장하지 않음
    if (task.trim()) { 
      data.todos.push({ task, done: false }); 
      saveData(data); 
    } else {
      console.log(chalk.gray(tr('daily_cancelled', lang)));
      // 잠시 메시지 보여주기 위해 0.5초 대기
      await new Promise(r => setTimeout(r, 500));
    }
    
  } else if (action === 'toggle' && data.todos.length) {
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: tr('daily_select', lang), choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
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
    const { idx } = await inquirer.prompt([{ type: 'list', name: 'idx', message: tr('daily_delete_prompt', lang), choices: data.todos.map((t, i) => ({ name: t.task, value: i })) }]);
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
  const lang = getConfig().language || 'ko';
  console.clear();
  console.log(chalk.cyan.bold(tr('daily_workflow_title', lang)));
  console.log(chalk.gray('────────────────────────────────────────'));
  const items = Array.isArray(data.workflow) ? data.workflow : [];
  if (!items.length) {
    console.log(chalk.gray(tr('daily_workflow_empty', lang)));
  } else {
    items.slice(0, 10).forEach((item, idx) => {
      const time = item.completedAt ? new Date(item.completedAt).toLocaleString('ko-KR') : '-';
      console.log(chalk.yellow(`${idx + 1}. ${item.task}`));
      console.log(chalk.gray(tr('daily_workflow_time', lang, { value: time })));
      console.log(chalk.gray(tr('daily_workflow_branch', lang, { value: item.git?.branch || '-' })));
      const files = item.git?.changedFiles || [];
      if (files.length) {
        console.log(chalk.gray(tr('daily_workflow_files', lang, { value: files.join(', ') })));
      }
    });
  }
  await inquirer.prompt([{ type: 'input', name: 'ok', message: tr('daily_back_enter', lang) }]);
};
