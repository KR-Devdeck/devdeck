import inquirer from 'inquirer';
import chalk from 'chalk';
import { MusicPlayer } from './core/player.js';
import { searchMenu } from './core/search.js';
import { managePlaylists } from './core/playlist.js'; // ✅ 추가됨

const player = new MusicPlayer();

export const runMusic = async () => {
  while (true) {
    console.clear();
    console.log(chalk.cyan.bold('\n  🎵  DevDeck Music Player  🎵'));
    console.log(chalk.gray('  ──────────────────────────────────'));
    
    if (player.queue.length > 0) {
      console.log(`  목록: ${chalk.yellow(player.queue.length)}곡 대기 중`);
      console.log(`  모드: ${player.loopMode === 'ONE' ? '🔂 한곡 반복' : player.loopMode === 'ALL' ? '🔁 전체 반복' : '➡️ 반복 없음'}`);
    } else {
      console.log(chalk.gray('  (재생 목록이 비어있습니다)'));
    }
    if (player.isBackgroundRunning()) {
      console.log(`  상태: ${chalk.green('백그라운드 재생 중')} ${chalk.gray(player.currentTitle ? `(${player.currentTitle})` : '')}`);
    }
    console.log('');

    const choices = [
      { name: '🔍 노래 검색 및 추가', value: 'search' },
      { name: '▶️ 재생 시작', value: 'play' },
      { name: '📚 보관함 관리', value: 'library' },
      { name: '⚙️ 재생 설정', value: 'settings' },
      new inquirer.Separator(),
      { name: '🔙 메인으로', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '메뉴를 선택하세요:',
      loop: false,
      choices
    }]);

    if (action === 'exit') break;

    switch (action) {
      case 'search':
        const selected = await searchMenu();
        if (selected && selected.length > 0) {
          selected.forEach(song => player.add(song));
          console.log(chalk.green(`\n  ✅ ${selected.length}곡이 추가되었습니다!`));
          await pause(1000);
        }
        break;

      case 'library':
        await openLibraryMenu(player);
        break;

      case 'play':
        if (player.queue.length === 0) {
          console.log(chalk.red('\n  ❌ 재생할 노래가 없습니다.'));
          await pause(1000);
        } else {
          const { mode } = await inquirer.prompt([{
            type: 'list',
            name: 'mode',
            message: '재생 모드:',
            loop: false,
            choices: [
              { name: '🖥️ 전면 재생', value: 'foreground' },
              { name: '🧩 백그라운드 재생', value: 'background' }
            ]
          }]);

          if (mode === 'foreground') {
            if (player.isBackgroundRunning()) {
              console.log(chalk.yellow('\n  ℹ️ 백그라운드 재생 중에는 전면 재생을 시작할 수 없습니다.'));
              console.log(chalk.gray('  먼저 설정 메뉴에서 백그라운드 재생을 중지해주세요.'));
              await pause(1200);
            } else {
              await player.playQueue({ interactive: true });
            }
          } else {
            if (player.isBackgroundRunning()) {
              console.log(chalk.yellow('\n  ℹ️ 이미 백그라운드 재생 중입니다.'));
              await pause(900);
            } else {
              player.startBackgroundPlayback();
              console.log(chalk.green('\n  ✅ 백그라운드 재생이 시작되었습니다.'));
              console.log(chalk.gray('  이제 메인으로 이동해도 음악이 계속 재생됩니다.'));
              await pause(1200);
            }
          }
        }
        break;

      case 'settings':
        await openSettingsMenu(player);
        break;
    }
  }
};

const openLibraryMenu = async (player) => {
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: '보관함 관리:',
    loop: false,
    choices: [
      { name: '📂 플레이리스트 관리', value: 'playlist' },
      { name: '📋 재생 목록 편집 (다중 삭제)', value: 'queue' },
      { name: '🔙 뒤로', value: 'back' }
    ]
  }]);

  if (action === 'playlist') await managePlaylists(player);
  if (action === 'queue') await manageQueue(player);
};

const openSettingsMenu = async (player) => {
  const choices = [
    { name: '🔄 반복 모드 변경', value: 'loop' }
  ];
  if (player.isBackgroundRunning()) {
    choices.push({ name: '⏹ 백그라운드 재생 중지', value: 'stop_bg' });
  }
  choices.push({ name: '🔙 뒤로', value: 'back' });

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: '재생 설정:',
    loop: false,
    choices
  }]);

  if (action === 'loop') {
    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: '반복 모드 설정:',
      loop: false,
      choices: [
        { name: '➡️ 반복 없음', value: 'NONE' },
        { name: '🔁 전체 반복', value: 'ALL' },
        { name: '🔂 한곡 반복', value: 'ONE' }
      ]
    }]);
    player.setLoop(mode);
    console.log(chalk.green('\n  ✅ 설정이 변경되었습니다.'));
    await pause(800);
  }

  if (action === 'stop_bg') {
    player.stopBackgroundPlayback();
    console.log(chalk.green('\n  ⏹ 백그라운드 재생을 중지했습니다.'));
    await pause(900);
  }
};

const manageQueue = async (player) => {
  if (player.queue.length === 0) {
    console.log(chalk.yellow('\n  📭 재생 목록이 비어있습니다.'));
    await pause(1000);
    return;
  }

  const { indexesToDelete } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'indexesToDelete',
    message: '삭제할 노래를 선택하세요 (Space:선택, Enter:확정):',
    pageSize: 10,
    loop: false,
    choices: player.queue.map((song, idx) => ({
      name: `${idx + 1}. ${chalk.bold(song.title)} ${chalk.dim(`(${song.author?.name})`)}`,
      value: idx
    }))
  }]);

  if (!indexesToDelete || indexesToDelete.length === 0) return;

  indexesToDelete.sort((a, b) => b - a).forEach(index => player.remove(index));
  console.log(chalk.green(`\n  🗑️ ${indexesToDelete.length}곡을 삭제했습니다.`));
  await pause(1000);
};

const pause = (ms) => new Promise(r => setTimeout(r, ms));
