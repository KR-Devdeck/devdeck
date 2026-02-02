#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runDaily } from '../apps/daily/index.js';
import { runMusic } from '../apps/music/index.js';
import { runGit } from '../apps/git/index.js';

const program = new Command();

program
  .name('deck')
  .description(chalk.cyan.bold('🎴 DevDeck: Developer\'s Command Center'))
  .version('1.0.0');

program.command('daily').alias('d').description('데일리 대시보드 (날씨/투두)').action(runDaily);
program.command('music').alias('m').description('유튜브 뮤직 플레이어').action(runMusic);
program.command('git').alias('g').description('Git 인터랙티브 매니저').action(runGit);

program.parse(process.argv);
