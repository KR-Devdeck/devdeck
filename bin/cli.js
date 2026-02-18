#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 각 앱의 메인 함수 가져오기
import { runDaily } from '../apps/daily/index.js';
import { runMusic } from '../apps/music/index.js';
import { runGit } from '../apps/git/index.js';
import { getConfig, getDefaultConfig, saveConfig, updateConfig } from '../apps/core/config.js';
import { buildDoctorReport, printDoctorReport, runAutoDoctorIfNeeded, runAutoUpdateIfNeeded, runSelfUpdate } from '../apps/core/system.js';
import { getTheme } from '../apps/core/theme.js';
import { tr, getSupportedLanguages } from '../apps/core/i18n.js';

const program = new Command();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

program
  .name('deck')
  .description('🎴 DevDeck: Developer\'s Command Center')
  .version(pkg.version || '0.0.0');

// 1. 단축키 실행 (deck d, deck m ...) -> 얘네는 끝나면 그냥 꺼지는 게 맞음
program.command('daily').alias('d').action(runDaily);
program.command('music').alias('m').action(runMusic);
program.command('git').alias('g').action(runGit);
program.command('doctor').action(() => {
  const report = buildDoctorReport();
  printDoctorReport(report);
});
program.command('update').action(() => {
  runSelfUpdate();
});
program.command('config').action(async () => {
  await openConfigMenu();
});

const runToolByKey = async (tool) => {
  if (tool === 'daily') return runDaily();
  if (tool === 'music') return runMusic();
  if (tool === 'git') return runGit();
};

const getModeLabel = (mode, lang) => {
  if (mode === 'foreground') return tr('playback_fg', lang);
  return tr('playback_bg', lang);
};

const getStartupToolLabel = (tool, lang) => {
  if (tool === 'daily') return tr('startup_tool_daily', lang);
  if (tool === 'music') return tr('startup_tool_music', lang);
  if (tool === 'git') return tr('startup_tool_git', lang);
  return tr('startup_tool_menu', lang);
};

// 2. 메인 메뉴 함수 (무한 루프 구조)
const showMainMenu = async () => {
  console.clear();

  const config = getConfig();
  const lang = config.language || 'ko';
  const t = getTheme();
  if (config.showWelcomeBanner) {
    console.log(
      t.primary(
        figlet.textSync('DevDeck', { horizontalLayout: 'full' })
      )
    );
  }
  console.log(t.accent(tr('welcome', lang)));

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: tr('select_tool', lang),
      pageSize: 10,
      choices: [
        { name: tr('menu_daily', lang), value: 'daily' },
        { name: tr('menu_music', lang), value: 'music' },
        { name: tr('menu_git', lang), value: 'git' },
        new inquirer.Separator(),
        { name: tr('menu_config', lang), value: 'config' },
        { name: tr('menu_help', lang), value: 'help' },
        new inquirer.Separator(),
        { name: tr('menu_exit', lang), value: 'exit' }
      ]
    }
  ]);

  // [핵심 수정] 앱 실행이 끝나면 다시 showMainMenu()를 호출
  try {
    if (choice === 'daily') {
      await runToolByKey('daily');
      await showMainMenu(); // <--- 돌아오기!
    } 
    else if (choice === 'music') {
      await runToolByKey('music');
      await showMainMenu(); // <--- 돌아오기!
    } 
    else if (choice === 'git') {
      await runToolByKey('git');
      await showMainMenu(); // <--- 돌아오기!
    } 
    else if (choice === 'config') {
      await openConfigMenu();
      await showMainMenu();
    }
    else if (choice === 'help') {
      console.log(t.title(tr('help_title', lang)));
      console.log(t.muted(tr('help_d', lang)));
      console.log(t.muted(tr('help_m', lang)));
      console.log(t.muted(tr('help_g', lang)));
      console.log(t.muted(tr('help_doctor', lang)));
      console.log(t.muted(tr('help_update', lang)));
      await inquirer.prompt([{
        type: 'input',
        name: 'ok',
        message: tr('help_back', lang)
      }]);
      await showMainMenu();
    }
    else {
      // Exit 선택 시
      console.log(t.muted(tr('goodbye', lang)));
      process.exit(0);
    }
  } catch (error) {
    const detail = error?.message ? `: ${error.message}` : '';
    console.error(t.danger(tr('error_return', lang, { detail })));
    await new Promise(r => setTimeout(r, 1000));
    await showMainMenu();
  }
};

const openConfigMenu = async () => {
  while (true) {
    const config = getConfig();
    const lang = config.language || 'ko';
    const t = getTheme();
    console.clear();
    console.log(t.title(tr('cfg_title', lang)));
    console.log(t.muted('  ──────────────────────────────────'));
    console.log(`  ${tr('cfg_startup_tool', lang)}: ${t.accent(getStartupToolLabel(config.startupTool, lang))}`);
    console.log(`  ${tr('cfg_cat_language', lang)}: ${t.accent(config.language || 'ko')}`);
    console.log(`  ${tr('cfg_auto_doctor', lang)}: ${t.accent(`${String(config.autoDoctor)} (${config.doctorCheckIntervalHours})`)}`);
    console.log(`  ${tr('cfg_auto_update', lang)}: ${t.accent(`${String(config.autoUpdate)} (${config.updateCheckIntervalHours})`)}`);
    console.log(`  ${tr('cfg_default_playback', lang)}: ${t.accent(getModeLabel(config.defaultPlaybackMode, lang))} / ${tr('cfg_auto_resume', lang)}=${t.accent(String(config.autoResumeMusic))}`);
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: tr('cfg_select_category', lang),
      loop: false,
      choices: [
        { name: tr('cfg_cat_startup', lang), value: 'startup' },
        { name: tr('cfg_cat_playback', lang), value: 'playback' },
        { name: tr('cfg_cat_theme', lang), value: 'theme' },
        { name: tr('cfg_cat_language', lang), value: 'language' },
        { name: tr('cfg_cat_reset', lang), value: 'reset' },
        { name: tr('cfg_cat_back', lang), value: 'back' }
      ]
    }]);

    if (action === 'back') break;

    if (action === 'theme') {
      const { value } = await inquirer.prompt([{
        type: 'list',
        name: 'value',
        message: tr('theme_select', lang),
        loop: false,
        choices: [
          { name: tr('theme_default', lang), value: 'default' },
          { name: tr('theme_minimal', lang), value: 'minimal' }
        ]
      }]);
      updateConfig({ theme: value });
    }
    if (action === 'language') {
      const supported = getSupportedLanguages();
      const { value } = await inquirer.prompt([{
        type: 'list',
        name: 'value',
        message: tr('language_select', lang),
        loop: false,
        choices: supported.map((code) => ({
          name: code === 'ko' ? tr('lang_ko', lang)
            : code === 'en' ? tr('lang_en', lang)
            : code === 'ja' ? tr('lang_ja', lang)
            : tr('lang_zh_cn', lang),
          value: code
        }))
      }]);
      updateConfig({ language: value });
    }
    if (action === 'playback') {
      const { field } = await inquirer.prompt([{
        type: 'list',
        name: 'field',
        message: tr('playback_menu', lang),
        choices: [
          { name: tr('playback_mode_item', lang, { value: getModeLabel(config.defaultPlaybackMode, lang) }), value: 'mode' },
          { name: tr('playback_resume_item', lang, { value: String(config.autoResumeMusic) }), value: 'resume' },
          { name: tr('back', lang), value: 'back' }
        ]
      }]);
      if (field === 'mode') {
        const { value } = await inquirer.prompt([{
          type: 'list',
          name: 'value',
          message: tr('playback_mode_select', lang),
          loop: false,
          choices: [
            { name: tr('playback_bg', lang), value: 'background' },
            { name: tr('playback_fg', lang), value: 'foreground' }
          ]
        }]);
        updateConfig({ defaultPlaybackMode: value });
      }
      if (field === 'resume') {
        const { value } = await inquirer.prompt([{
          type: 'confirm',
          name: 'value',
          message: tr('playback_resume_confirm', lang),
          default: config.autoResumeMusic
        }]);
        updateConfig({ autoResumeMusic: value });
      }
    }
    if (action === 'startup') {
      const { field } = await inquirer.prompt([{
        type: 'list',
        name: 'field',
        message: tr('startup_menu', lang),
        choices: [
          { name: tr('startup_tool_item', lang, { value: getStartupToolLabel(config.startupTool, lang) }), value: 'startupTool' },
          { name: tr('startup_banner_item', lang, { value: String(config.showWelcomeBanner) }), value: 'banner' },
          { name: tr('startup_doctor_item', lang, { value: String(config.autoDoctor) }), value: 'autoDoctor' },
          { name: tr('startup_doctor_interval_item', lang, { value: config.doctorCheckIntervalHours }), value: 'doctorInterval' },
          { name: tr('startup_update_item', lang, { value: String(config.autoUpdate) }), value: 'autoUpdate' },
          { name: tr('startup_update_interval_item', lang, { value: config.updateCheckIntervalHours }), value: 'updateInterval' },
          { name: tr('back', lang), value: 'back' }
        ]
      }]);

      if (field === 'startupTool') {
        const { value } = await inquirer.prompt([{
          type: 'list',
          name: 'value',
          message: tr('startup_tool_select', lang),
          choices: [
            { name: tr('startup_tool_menu', lang), value: 'menu' },
            { name: tr('startup_tool_daily', lang), value: 'daily' },
            { name: tr('startup_tool_music', lang), value: 'music' },
            { name: tr('startup_tool_git', lang), value: 'git' }
          ]
        }]);
        updateConfig({ startupTool: value });
      }
      if (field === 'banner') {
        const { value } = await inquirer.prompt([{
          type: 'confirm',
          name: 'value',
          message: tr('startup_banner_confirm', lang),
          default: config.showWelcomeBanner
        }]);
        updateConfig({ showWelcomeBanner: value });
      }
      if (field === 'autoDoctor') {
        const { value } = await inquirer.prompt([{
          type: 'confirm',
          name: 'value',
          message: tr('startup_doctor_confirm', lang),
          default: config.autoDoctor
        }]);
        updateConfig({ autoDoctor: value });
      }
      if (field === 'doctorInterval') {
        const { value } = await inquirer.prompt([{
          type: 'list',
          name: 'value',
          message: tr('startup_doctor_interval_select', lang),
          choices: [
            { name: tr('hours_6', lang), value: 6 },
            { name: tr('hours_12', lang), value: 12 },
            { name: tr('hours_24', lang), value: 24 },
            { name: tr('hours_48', lang), value: 48 }
          ]
        }]);
        updateConfig({ doctorCheckIntervalHours: value });
      }
      if (field === 'autoUpdate') {
        const { value } = await inquirer.prompt([{
          type: 'confirm',
          name: 'value',
          message: tr('startup_update_confirm', lang),
          default: config.autoUpdate
        }]);
        updateConfig({ autoUpdate: value });
      }
      if (field === 'updateInterval') {
        const { value } = await inquirer.prompt([{
          type: 'list',
          name: 'value',
          message: tr('startup_update_interval_select', lang),
          choices: [
            { name: tr('hours_6', lang), value: 6 },
            { name: tr('hours_12', lang), value: 12 },
            { name: tr('hours_24', lang), value: 24 },
            { name: tr('hours_48', lang), value: 48 }
          ]
        }]);
        updateConfig({ updateCheckIntervalHours: value });
      }
    }
    if (action === 'reset') {
      const { ok } = await inquirer.prompt([{
        type: 'confirm',
        name: 'ok',
        message: tr('reset_confirm', lang),
        default: false
      }]);
      if (ok) saveConfig(getDefaultConfig());
    }
  }
};

const runDefaultStartupFlow = async () => {
  runAutoDoctorIfNeeded();
  runAutoUpdateIfNeeded();

  const config = getConfig();
  if (config.startupTool && config.startupTool !== 'menu') {
    await runToolByKey(config.startupTool);
  }
  await showMainMenu();
};

// 3. 실행 로직 판단
// 인자가 없으면 메인 메뉴 실행
if (!process.argv.slice(2).length) {
  runDefaultStartupFlow();
} else {
  program.parse(process.argv);
}
