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
import { getConfig, getConfigPath, getDefaultConfig, saveConfig, updateConfig } from '../apps/core/config.js';
import { buildDoctorReport, printDoctorReport, runAutoUpdateIfNeeded, runSelfUpdate } from '../apps/core/system.js';

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

// 2. 메인 메뉴 함수 (무한 루프 구조)
const showMainMenu = async () => {
  console.clear();
  
  // 타이틀 출력
  console.log(
    chalk.cyan(
      figlet.textSync('DevDeck', { horizontalLayout: 'full' })
    )
  );
  console.log(chalk.yellow.bold('  🚀 Welcome to Your Command Center\n'));

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select Tool:',
      pageSize: 10,
      choices: [
        { name: '📅  데일리 대시보드 (Daily)', value: 'daily' },
        { name: '🎵  뮤직 플레이어 (Music)', value: 'music' },
        { name: '🐙  Git 매니저 (Git)', value: 'git' },
        new inquirer.Separator(),
        { name: '🩺  환경 진단 (Doctor)', value: 'doctor' },
        { name: '⚙️  설정 (Config)', value: 'config' },
        { name: '🔄  DevDeck 업데이트 (Update)', value: 'update' },
        new inquirer.Separator(),
        { name: '❌  종료 (Exit)', value: 'exit' }
      ]
    }
  ]);

  // [핵심 수정] 앱 실행이 끝나면 다시 showMainMenu()를 호출
  try {
    if (choice === 'daily') {
      await runDaily();
      await showMainMenu(); // <--- 돌아오기!
    } 
    else if (choice === 'music') {
      await runMusic();
      await showMainMenu(); // <--- 돌아오기!
    } 
    else if (choice === 'git') {
      await runGit();
      await showMainMenu(); // <--- 돌아오기!
    } 
    else if (choice === 'doctor') {
      const report = buildDoctorReport();
      printDoctorReport(report);
      await wait(800);
      await showMainMenu();
    }
    else if (choice === 'config') {
      await openConfigMenu();
      await showMainMenu();
    }
    else if (choice === 'update') {
      runSelfUpdate();
      await wait(800);
      await showMainMenu();
    }
    else {
      // Exit 선택 시
      console.log(chalk.gray('See you next time! 👋'));
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red('Error detected, returning to menu...'));
    await new Promise(r => setTimeout(r, 1000));
    await showMainMenu();
  }
};

const openConfigMenu = async () => {
  while (true) {
    const config = getConfig();
    console.clear();
    console.log(chalk.cyan.bold('\n  ⚙️ DevDeck Config'));
    console.log(chalk.gray('  ──────────────────────────────────'));
    console.log(`  path: ${chalk.gray(getConfigPath())}`);
    console.log(`  theme: ${chalk.yellow(config.theme)}`);
    console.log(`  defaultPlaybackMode: ${chalk.yellow(config.defaultPlaybackMode)}`);
    console.log(`  autoUpdate: ${chalk.yellow(String(config.autoUpdate))}`);
    console.log(`  autoResumeMusic: ${chalk.yellow(String(config.autoResumeMusic))}`);
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '수정할 항목을 선택하세요:',
      loop: false,
      choices: [
        { name: 'Theme', value: 'theme' },
        { name: 'Default Playback Mode', value: 'playback' },
        { name: 'Auto Update', value: 'autoUpdate' },
        { name: 'Auto Resume Music', value: 'autoResumeMusic' },
        { name: 'Reset to Defaults', value: 'reset' },
        { name: 'Back', value: 'back' }
      ]
    }]);

    if (action === 'back') break;

    if (action === 'theme') {
      const { value } = await inquirer.prompt([{
        type: 'list',
        name: 'value',
        message: 'Theme:',
        loop: false,
        choices: ['default', 'minimal']
      }]);
      updateConfig({ theme: value });
    }
    if (action === 'playback') {
      const { value } = await inquirer.prompt([{
        type: 'list',
        name: 'value',
        message: 'Default Playback Mode:',
        loop: false,
        choices: ['background', 'foreground']
      }]);
      updateConfig({ defaultPlaybackMode: value });
    }
    if (action === 'autoUpdate') {
      const { value } = await inquirer.prompt([{
        type: 'confirm',
        name: 'value',
        message: 'Enable auto update flag?',
        default: config.autoUpdate
      }]);
      updateConfig({ autoUpdate: value });
    }
    if (action === 'autoResumeMusic') {
      const { value } = await inquirer.prompt([{
        type: 'confirm',
        name: 'value',
        message: 'Restore previous queue when opening Music?',
        default: config.autoResumeMusic
      }]);
      updateConfig({ autoResumeMusic: value });
    }
    if (action === 'reset') {
      const { ok } = await inquirer.prompt([{
        type: 'confirm',
        name: 'ok',
        message: 'Reset all config values to defaults?',
        default: false
      }]);
      if (ok) saveConfig(getDefaultConfig());
    }
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 3. 실행 로직 판단
// 인자가 없으면 메인 메뉴 실행
if (!process.argv.slice(2).length) {
  runAutoUpdateIfNeeded();
  showMainMenu();
} else {
  runAutoUpdateIfNeeded();
  program.parse(process.argv);
}
