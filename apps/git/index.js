import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { GitNavigator } from './core/navigator.js';

// 탐색기 인스턴스 생성
const navigator = new GitNavigator();

export const runGit = async () => {
  while (true) {
    console.clear();
    console.log(chalk.magenta.bold('\n  🐙 DevDeck Git Manager'));
    console.log(chalk.gray('  ──────────────────────────────────'));

    // 1. 현재 Git 상태 요약 표시
    try {
      // -s: short format (변경사항 요약)
      const statusOutput = execSync('git status -s', { encoding: 'utf8' });
      
      if (statusOutput.trim()) {
        const lines = statusOutput.split('\n').filter(l => l.trim());
        // Staged(초록), Modified(빨강), Untracked(빨강) 개수 파악
        const staged = lines.filter(l => l[0] !== ' ' && l[0] !== '?').length;
        const changes = lines.length;
        
        console.log(`  상태: ${chalk.yellow(changes)}개 변경됨 / ${chalk.green(staged)}개 Staged(담김)`);
      } else {
        console.log(chalk.gray('  (현재 변경된 파일이 없습니다)'));
      }
    } catch (e) {
      console.log(chalk.red('  🚫 현재 위치는 Git 저장소가 아닙니다.'));
    }
    console.log('');

    // 2. 메인 메뉴 선택
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '작업을 선택하세요:',
      choices: [
        { name: '📂 디렉토리별 탐색 & Staging', value: 'navigator' },
        { name: '📦 변경사항 커밋 (Commit)', value: 'commit' },
        { name: '🚀 원격 저장소로 푸시 (Push)', value: 'push' },
        { name: '⬇️  원격 변경사항 당겨오기 (Pull)', value: 'pull' },
        new inquirer.Separator(),
        { name: '🔙 메인으로', value: 'exit' }
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
              console.log(chalk.yellow('\n  ⚠️ 커밋할 파일이 담기지(Staged) 않았습니다.'));
              console.log(chalk.gray('  먼저 "📂 디렉토리별 탐색" 메뉴에서 파일을 Space로 체크 후 Enter로 선택해주세요.'));
              await pause(2000);
              break;
            }

            const { message } = await inquirer.prompt([{
              type: 'input',
              name: 'message',
              message: '커밋 메시지를 입력하세요:',
              validate: (input) => input.trim() ? true : '메시지를 입력해주세요.'
            }]);

            execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
            console.log(chalk.green('\n  ✅ 커밋 완료!'));
            await pause(1000);

          } catch (e) {
            console.log(chalk.red(`\n  🚫 커밋 실패: ${e.message}`));
            await pause(1500);
          }
          break;

        case 'push':
          // 🚀 푸시 로직
          console.log(chalk.cyan('\n  🚀 Pushing to remote...'));
          try {
            execSync('git push', { stdio: 'inherit' });
            console.log(chalk.green('\n  ✅ 푸시 완료!'));
          } catch (e) {
            console.log(chalk.red('\n  🚫 푸시 실패 (충돌이 있거나 권한이 없을 수 있습니다).'));
          }
          await pause(1500);
          break;

        case 'pull':
          // ⬇️ 풀 로직
          console.log(chalk.cyan('\n  ⬇️  Pulling from remote...'));
          try {
            execSync('git pull', { stdio: 'inherit' });
            console.log(chalk.green('\n  ✅ 업데이트 완료!'));
          } catch (e) {
            console.log(chalk.red('\n  🚫 풀 실패.'));
          }
          await pause(1500);
          break;
      }
    } catch (error) {
      console.log(chalk.red(`\n🚫 치명적 오류: ${error.message}`));
      await pause(1500);
    }
  }
};

const pause = (ms) => new Promise(r => setTimeout(r, ms));
