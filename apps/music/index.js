import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import { MusicPlayer } from './core/player.js';
import { searchMenu } from './core/search.js';

const player = new MusicPlayer();

export const runMusic = async () => {
  while (true) {
    console.clear();
    printHeader(); // 상단 로고 및 상태바 출력

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Command:',
      prefix: '💿', // 기본 '?' 대신 디스크 아이콘
      pageSize: 10,
      loop: false,
      choices: [
        { name: chalk.bold('➕  노래 검색 및 추가 (Add Song)'), value: 'add' },
        { name: chalk.bold('▶️   재생 시작 (Start Player)'), value: 'play' },
        new inquirer.Separator(chalk.dim('──────────────────────────────')),
        { name: `🔁  반복 모드 변경 [ 현재: ${chalk.cyan(getLoopName(player.loopMode))} ]`, value: 'loop' },
        { name: `📜  대기열 관리 [ ${chalk.yellow(player.queue.length)}곡 대기 중 ]`, value: 'queue' },
        new inquirer.Separator(chalk.dim('──────────────────────────────')),
        { name: chalk.red('🚪  종료 (Exit)'), value: 'quit' }
      ]
    }]);

    if (action === 'quit') return;

    if (action === 'add') {
      const song = await searchMenu();
      if (song) {
        player.add(song);
        console.log(chalk.green('\n ✅ 대기열에 추가되었습니다!'));
        await pause(600);
      }
    } 
    else if (action === 'play') {
      if (player.queue.length === 0) {
        console.log(chalk.red('\n ⚠️  대기열이 비었습니다. 노래를 먼저 추가해주세요.'));
        await pause(1000);
      } else {
        await player.playQueue(); // 플레이어 화면으로 전환
      }
    }
    else if (action === 'loop') {
      await handleLoopMenu();
    }
    else if (action === 'queue') {
      await manageQueue();
    }
  }
};

// 🎨 상단 헤더 디자인
const printHeader = () => {
  // 로고
  console.log(chalk.cyan(figlet.textSync('MUSIC CLI', { font: 'Small' })));
  
  // 상태바 박스
  const qLen = `${player.queue.length} Songs`.padEnd(10);
  const loopSt = getLoopName(player.loopMode).padEnd(10);

  console.log(chalk.white('╔══════════════════════════════════════════════╗'));
  console.log(`║ 📊 Queue : ${chalk.yellow(qLen)}  |  🔁 Loop : ${chalk.cyan(loopSt)} ║`);
  console.log(chalk.white('╚══════════════════════════════════════════════╝'));
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
  printHeader(); // 대기열 화면에서도 헤더 유지

  const choices = player.queue.map((s, i) => ({
    name: `${chalk.dim(i + 1 + '.')} ${s.title}`, value: i
  }));
  choices.push(new inquirer.Separator());
  choices.push({ name: '🔙 뒤로 가기', value: 'back' });

  const { targetIdx } = await inquirer.prompt([{
    type: 'list', name: 'targetIdx', message: '삭제할 노래 선택:', choices, pageSize: 12, loop: false
  }]);

  if (targetIdx !== 'back') {
    player.remove(targetIdx);
    console.log(chalk.green('🗑️  삭제되었습니다.'));
    await pause(500);
  }
};

const getLoopName = (mode) => (mode === 'ONE' ? 'One' : mode === 'ALL' ? 'All' : 'Off');
const pause = (ms) => new Promise(r => setTimeout(r, ms));