import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import { MusicPlayer } from './core/player.js';
import { searchMenu } from './core/search.js';

const player = new MusicPlayer();

export const runMusic = async () => {
  while (true) {
    console.clear();
    printHeader();

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      prefix: '💿',
      pageSize: 10,
      choices: [
        { name: chalk.bold('🔎  노래 검색 및 추가 (Search & Add)'), value: 'add' },
        { name: chalk.bold('▶️   재생 시작 (Play Queue)'), value: 'play' },
        new inquirer.Separator(chalk.gray('──────────────────────────────────────')),
        { name: `🔁  반복 모드 설정 [ Current: ${chalk.cyan(getLoopName(player.loopMode))} ]`, value: 'loop' },
        { name: `📜  대기열 관리    [ ${chalk.yellow(player.queue.length)} Tracks ]`, value: 'queue' },
        new inquirer.Separator(chalk.gray('──────────────────────────────────────')),
        { name: chalk.red('🚪  나가기 (Exit)'), value: 'quit' }
      ]
    }]);

    if (action === 'quit') return;

    if (action === 'add') {
      const songs = await searchMenu();
      if (songs && songs.length > 0) {
        songs.forEach(song => player.add(song));
        console.log(chalk.green(`\n ✅ ${songs.length}곡을 대기열에 담았습니다.`));
        await pause(800);
      }
    } 
    else if (action === 'play') {
      if (player.queue.length === 0) {
        console.log(chalk.red('\n ⚠️  대기열이 텅 비었습니다. 노래를 먼저 추가해주세요.'));
        await pause(1000);
      } else {
        await player.playQueue();
      }
    }
    else if (action === 'loop') await handleLoopMenu();
    else if (action === 'queue') await manageQueue();
  }
};

const printHeader = () => {
  // 로고를 조금 더 작고 단단한 느낌으로
  console.log(chalk.cyan(figlet.textSync('DEVDECK', { font: 'Slant' })));
  console.log(chalk.cyan(' MUSIC STATION '));
  
  const qLen = `${player.queue.length} Tracks`.padEnd(10);
  const loopSt = getLoopName(player.loopMode).padEnd(10);

  // 상단 정보바
  console.log(chalk.gray('┌──────────────────────────────────────────────┐'));
  console.log(`│ 📊 Queue: ${chalk.yellow(qLen)} │ 🔁 Mode: ${chalk.cyan(loopSt)} │`);
  console.log(chalk.gray('└──────────────────────────────────────────────┘'));
  console.log('');
};

const handleLoopMenu = async () => {
  const { mode } = await inquirer.prompt([{
    type: 'list', name: 'mode', message: 'Loop Mode:',
    choices: [
      { name: '➡️  반복 없음 (None)', value: 'NONE' },
      { name: '🔁  전체 반복 (All)', value: 'ALL' },
      { name: '🔂  한 곡 반복 (One)', value: 'ONE' },
      new inquirer.Separator(),
      { name: '🔙  취소', value: 'back' }
    ]
  }]);
  if (mode !== 'back') player.setLoop(mode);
};

const manageQueue = async () => {
  if (player.queue.length === 0) {
    console.log(chalk.red('대기열이 비었습니다.'));
    await pause(800);
    return;
  }
  console.clear();
  printHeader();

  const choices = player.queue.map((s, i) => ({
    name: `${chalk.dim(String(i + 1).padStart(2, '0') + '.')} ${s.title}`, value: i
  }));
  choices.push(new inquirer.Separator());
  choices.push({ name: '🔙 뒤로 가기', value: 'back' });

  const { targetIdx } = await inquirer.prompt([{
    type: 'list', name: 'targetIdx', message: '삭제할 노래 선택:', choices, pageSize: 12
  }]);

  if (targetIdx !== 'back') {
    player.remove(targetIdx);
    console.log(chalk.green('🗑️  삭제되었습니다.'));
    await pause(500);
  }
};

const getLoopName = (mode) => (mode === 'ONE' ? 'One' : mode === 'ALL' ? 'All' : 'Off');
const pause = (ms) => new Promise(r => setTimeout(r, ms));