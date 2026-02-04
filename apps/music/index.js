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
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '메뉴를 선택하세요:',
      choices: [
        { name: '🔍 노래 검색 및 추가', value: 'search' },
        { name: '▶️  재생 시작', value: 'play' },
        { name: '📂 플레이리스트 관리', value: 'playlist' }, // 메뉴 추가
        { name: '📋 재생 목록 편집 (다중 삭제)', value: 'queue' },
        { name: '🔄 반복 모드 변경', value: 'loop' },
        new inquirer.Separator(),
        { name: '🔙 메인으로', value: 'exit' }
      ]
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

      case 'playlist': // ✅ 연결
        await managePlaylists(player);
        break;

      case 'play':
        if (player.queue.length === 0) {
          console.log(chalk.red('\n  ❌ 재생할 노래가 없습니다.'));
          await pause(1000);
        } else {
          await player.playQueue();
        }
        break;

      case 'queue':
        await manageQueue(player);
        break;

      case 'loop':
        const { mode } = await inquirer.prompt([{
          type: 'list',
          name: 'mode',
          message: '반복 모드 설정:',
          choices: [
            { name: '➡️ 반복 없음', value: 'NONE' },
            { name: '🔁 전체 반복', value: 'ALL' },
            { name: '🔂 한곡 반복', value: 'ONE' }
          ]
        }]);
        player.setLoop(mode);
        console.log(chalk.green('\n  ✅ 설정이 변경되었습니다.'));
        await pause(800);
        break;
    }
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
    loop: true,
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