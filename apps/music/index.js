import inquirer from 'inquirer';
import chalk from 'chalk';
import { MusicPlayer } from './core/player.js';
import { searchMenu } from './core/search.js';
import { managePlaylists } from './core/playlist.js'; // ✅ 추가됨
import { getConfig } from '../core/config.js';
import { getTheme } from '../core/theme.js';
import { tr } from '../core/i18n.js';

const player = new MusicPlayer();

export const runMusic = async () => {
  await maybeHandleRestoredQueue(player);

  const t = getTheme();
  const lang = getConfig().language || 'ko';

  while (true) {
    console.clear();
    console.log(t.title(tr('music_title', lang)));
    console.log(t.muted('  ──────────────────────────────────'));
    
    if (player.queue.length > 0) {
      console.log(tr('music_queue_count', lang, { value: t.accent(player.queue.length) }));
      console.log(`  모드: ${player.loopMode === 'ONE' ? tr('music_mode_one', lang) : player.loopMode === 'ALL' ? tr('music_mode_all', lang) : tr('music_mode_none', lang)}`);
    } else {
      console.log(t.muted(tr('music_empty_queue', lang)));
    }
    if (player.isBackgroundRunning()) {
      console.log(`  상태: ${t.success(tr('music_status_bg', lang))} ${t.muted(player.currentTitle ? `(${player.currentTitle})` : '')}`);
    }
    console.log('');

    const choices = [
      { name: tr('music_menu_search', lang), value: 'search' },
      { name: tr('music_menu_play', lang), value: 'play' },
      { name: tr('music_menu_library', lang), value: 'library' },
      { name: tr('music_menu_settings', lang), value: 'settings' },
      new inquirer.Separator(),
      { name: tr('music_menu_exit', lang), value: 'exit' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: tr('music_select_menu', lang),
      loop: false,
      choices
    }]);

    if (action === 'exit') break;

    switch (action) {
      case 'search':
        const selected = await searchMenu();
        if (selected && selected.length > 0) {
          selected.forEach(song => player.add(song));
          console.log(chalk.green(tr('music_added_count', lang, { value: selected.length })));
          await pause(1000);
        }
        break;

      case 'library':
        await openLibraryMenu(player);
        break;

      case 'play':
        if (player.queue.length === 0) {
          console.log(chalk.red(tr('music_no_song', lang)));
          await pause(1000);
        } else {
          const config = getConfig();
          const defaultMode = config.defaultPlaybackMode === 'foreground' ? 'foreground' : 'background';
          const { mode } = await inquirer.prompt([{
            type: 'list',
            name: 'mode',
            message: tr('music_play_mode', lang),
            default: defaultMode,
            loop: false,
            choices: [
              { name: tr('music_play_fg', lang), value: 'foreground' },
              { name: tr('music_play_bg', lang), value: 'background' }
            ]
          }]);

          if (mode === 'foreground') {
            if (player.isBackgroundRunning()) {
              console.log(chalk.yellow(tr('music_warn_fg_while_bg', lang)));
              console.log(chalk.gray(tr('music_hint_stop_bg_first', lang)));
              await pause(1200);
            } else {
              await player.playQueue({ interactive: true });
            }
          } else {
            if (player.isBackgroundRunning()) {
              console.log(chalk.yellow(tr('music_info_already_bg', lang)));
              await pause(900);
            } else {
              player.startBackgroundPlayback();
              console.log(chalk.green(tr('music_bg_started', lang)));
              console.log(chalk.gray(tr('music_bg_continues', lang)));
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
  const lang = getConfig().language || 'ko';
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: tr('music_library_menu', lang),
    loop: false,
    choices: [
      { name: tr('music_library_playlist', lang), value: 'playlist' },
      { name: tr('music_library_queue_edit', lang), value: 'queue' },
      { name: tr('music_library_clear', lang), value: 'clear' },
      { name: tr('music_library_back', lang), value: 'back' }
    ]
  }]);

  if (action === 'playlist') await managePlaylists(player);
  if (action === 'queue') await manageQueue(player);
  if (action === 'clear') {
    if (player.queue.length === 0) {
      console.log(chalk.yellow(tr('music_already_empty', lang)));
      await pause(800);
      return;
    }
    const { ok } = await inquirer.prompt([{
      type: 'confirm',
      name: 'ok',
      message: tr('music_clear_confirm', lang, { value: player.queue.length }),
      default: false
    }]);
    if (ok) {
      player.clearQueue();
      console.log(chalk.green(tr('music_cleared', lang)));
      await pause(900);
    }
  }
};

const openSettingsMenu = async (player) => {
  const lang = getConfig().language || 'ko';
  const choices = [
    { name: tr('music_settings_loop', lang), value: 'loop' }
  ];
  if (player.isBackgroundRunning()) {
    choices.push({ name: tr('music_settings_stop_bg', lang), value: 'stop_bg' });
  }
  choices.push({ name: tr('music_library_back', lang), value: 'back' });

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: tr('music_settings_menu', lang),
    loop: false,
    choices
  }]);

  if (action === 'loop') {
    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: tr('music_loop_select', lang),
      loop: false,
      choices: [
        { name: tr('music_mode_none', lang), value: 'NONE' },
        { name: tr('music_mode_all', lang), value: 'ALL' },
        { name: tr('music_mode_one', lang), value: 'ONE' }
      ]
    }]);
    player.setLoop(mode);
    console.log(chalk.green(tr('music_settings_changed', lang)));
    await pause(800);
  }

  if (action === 'stop_bg') {
    player.stopBackgroundPlayback();
    console.log(chalk.green(tr('music_bg_stopped', lang)));
    await pause(900);
  }
};

const manageQueue = async (player) => {
  const lang = getConfig().language || 'ko';
  if (player.queue.length === 0) {
    console.log(chalk.yellow(tr('music_queue_empty', lang)));
    await pause(1000);
    return;
  }

  const { indexesToDelete } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'indexesToDelete',
    message: tr('music_delete_select', lang),
    pageSize: 10,
    loop: false,
    choices: player.queue.map((song, idx) => ({
      name: `${idx + 1}. ${chalk.bold(song.title)} ${chalk.dim(`(${song.author?.name})`)}`,
      value: idx
    }))
  }]);

  if (!indexesToDelete || indexesToDelete.length === 0) return;

  indexesToDelete.sort((a, b) => b - a).forEach(index => player.remove(index));
  console.log(chalk.green(tr('music_deleted_count', lang, { value: indexesToDelete.length })));
  await pause(1000);
};

const pause = (ms) => new Promise(r => setTimeout(r, ms));

const maybeHandleRestoredQueue = async (player) => {
  if (!player.hadRestoredQueue || player.queue.length === 0 || player.isBackgroundRunning()) return;
  const config = getConfig();
  const lang = config.language || 'ko';
  if (!config.autoResumeMusic) return;

  const currentTrack = player.queue[player.currentIndex];
  const currentLabel = currentTrack?.title ? tr('music_restore_pos', lang, { value: chalk.yellow(currentTrack.title) }) : '';

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: tr('music_restore_message', lang, { value: player.queue.length, current: currentLabel }),
    loop: false,
    choices: [
      { name: tr('music_restore_resume', lang), value: 'resume' },
      { name: tr('music_restore_keep', lang), value: 'keep' },
      { name: tr('music_restore_clear', lang), value: 'clear' }
    ]
  }]);

  player.hadRestoredQueue = false;

  if (action === 'resume') {
    player.startBackgroundPlayback();
    console.log(chalk.green(tr('music_restore_resumed', lang)));
    await pause(1000);
    return;
  }

  if (action === 'clear') {
    player.clearQueue();
    console.log(chalk.green(tr('music_restore_cleared', lang)));
    await pause(900);
  }
};
