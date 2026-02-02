#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';

// 각 앱의 메인 함수 가져오기
import { runDaily } from '../apps/daily/index.js';
import { runMusic } from '../apps/music/index.js';
import { runGit } from '../apps/git/index.js';

const program = new Command();

program
  .name('deck')
  .description('🎴 DevDeck: Developer\'s Command Center')
  .version('2.0.0');

// 1. 단축키 실행 (deck d, deck m ...) -> 얘네는 끝나면 그냥 꺼지는 게 맞음
program.command('daily').alias('d').action(runDaily);
program.command('music').alias('m').action(runMusic);
program.command('git').alias('g').action(runGit);

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

// 3. 실행 로직 판단
// 인자가 없으면 메인 메뉴 실행
if (!process.argv.slice(2).length) {
  showMainMenu();
} else {
  program.parse(process.argv);
}