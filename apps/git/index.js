import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { GitNavigator } from './core/navigator.js';
import { getTheme } from '../core/theme.js';
import { getConfig } from '../core/config.js';
import { tr } from '../core/i18n.js';

// 탐색기 인스턴스 생성
const navigator = new GitNavigator();

export const runGit = async () => {
  const t = getTheme();
  while (true) {
    const lang = getConfig().language || 'ko';
    console.clear();
    console.log(t.title(tr('git_title', lang)));
    console.log(t.muted('  ──────────────────────────────────'));

    // 1. 현재 Git 상태 요약 표시
    try {
      // -s: short format (변경사항 요약)
      const statusOutput = execSync('git status -s', { encoding: 'utf8' });
      
      if (statusOutput.trim()) {
        const lines = statusOutput.split('\n').filter(l => l.trim());
        // Staged(초록), Modified(빨강), Untracked(빨강) 개수 파악
        const staged = lines.filter(l => l[0] !== ' ' && l[0] !== '?').length;
        const changes = lines.length;
        
        console.log(tr('git_status_summary', lang, { changes: t.warning(changes), staged: t.success(staged) }));
      } else {
        console.log(t.muted(tr('git_no_changes', lang)));
      }
    } catch (e) {
      console.log(t.danger(tr('git_not_repo', lang)));
    }
    console.log('');

    // 2. 메인 메뉴 선택
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: tr('git_select_action', lang),
      choices: [
        { name: tr('git_nav', lang), value: 'navigator' },
        { name: tr('git_commit', lang), value: 'commit' },
        { name: tr('git_push', lang), value: 'push' },
        { name: tr('git_pull', lang), value: 'pull' },
        new inquirer.Separator(),
        { name: tr('git_exit', lang), value: 'exit' }
      ]
    }]);

    if (action === 'exit') break;

    try {
      switch (action) {
        case 'navigator':
          // 📂 탐색기 실행
          await navigator.start();
          break;

        case 'commit':
          // 📦 커밋 로직
          try {
            // Staged 된 파일이 있는지 확인
            const stagedCheck = execSync('git diff --cached --name-only', { encoding: 'utf8' });
            if (!stagedCheck.trim()) {
              console.log(chalk.yellow(tr('git_no_staged', lang)));
              console.log(chalk.gray(tr('git_no_staged_hint', lang)));
              await pause(2000);
              break;
            }

            const { message } = await inquirer.prompt([{
              type: 'input',
              name: 'message',
              message: tr('git_commit_msg', lang),
              validate: (input) => input.trim() ? true : tr('git_commit_msg_required', lang)
            }]);

            execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
            console.log(chalk.green(tr('git_commit_done', lang)));
            await pause(1000);

          } catch (e) {
            console.log(chalk.red(tr('git_commit_failed', lang, { value: e.message })));
            await pause(1500);
          }
          break;

        case 'push':
          // 🚀 푸시 로직
          console.log(chalk.cyan(tr('git_pushing', lang)));
          try {
            execSync('git push', { stdio: 'inherit' });
            console.log(chalk.green(tr('git_push_done', lang)));
          } catch (e) {
            console.log(chalk.red(tr('git_push_failed', lang)));
          }
          await pause(1500);
          break;

        case 'pull':
          // ⬇️ 풀 로직
          console.log(chalk.cyan(tr('git_pulling', lang)));
          try {
            execSync('git pull', { stdio: 'inherit' });
            console.log(chalk.green(tr('git_pull_done', lang)));
          } catch (e) {
            console.log(chalk.red(tr('git_pull_failed', lang)));
          }
          await pause(1500);
          break;
      }
    } catch (error) {
      console.log(chalk.red(tr('git_fatal', lang, { value: error.message })));
      await pause(1500);
    }
  }
};

const pause = (ms) => new Promise(r => setTimeout(r, ms));
