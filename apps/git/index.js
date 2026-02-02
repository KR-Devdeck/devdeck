import simpleGit from 'simple-git';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

const git = simpleGit();

export const runGit = async () => {
  // 1. Git 레포지토리인지 확인
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    console.log(chalk.red('❌ 현재 폴더는 Git 저장소가 아닙니다.'));
    return;
  }
  
  console.clear();
  console.log(chalk.blue.bold('🐙 DevDeck Git Manager'));
  await gitLoop();
};

const gitLoop = async () => {
  // 상태 확인
  const status = await git.status();
  
  // 변경사항이 있으면 보여줌
  if (status.files.length > 0) {
    console.log(chalk.dim('─'.repeat(40)));
    status.files.forEach(f => {
      const icon = f.index === '?' ? '❓' : '📝';
      const color = f.index === '?' ? chalk.red : chalk.green;
      console.log(`${icon} ${color(f.path)}`);
    });
    console.log(chalk.dim('─'.repeat(40)));
  }

  const { input } = await inquirer.prompt([{
    type: 'input',
    name: 'input',
    message: `${chalk.blue(`git(${status.current})`)} >`,
    prefix: ''
  }]);

  const [cmd, ...args] = input.trim().split(' ');
  const param = args.join(' ');

  try {
    switch (cmd) {
      case '/add':
        if (!param) {
          console.log(chalk.red('⚠️ 파일명 또는 all을 입력하세요.'));
        } else {
          await git.add(param === 'all' ? '.' : param);
          console.log(chalk.green('✅ Staged.'));
        }
        break;

      case '/commit':
        if (status.staged.length === 0) {
          console.log(chalk.yellow('⚠️ 스테이징된 파일이 없습니다. /add 먼저 하세요.'));
        } else {
          const { msg } = await inquirer.prompt([{ type: 'input', name: 'msg', message: 'Commit Message:' }]);
          if (msg) {
            await git.commit(msg);
            console.log(chalk.green('✨ Committed.'));
          }
        }
        break;

      case '/push':
        const targetBranch = param || status.current;
        const spinner = ora(`Pushing to origin/${targetBranch}...`).start();
        await git.push('origin', targetBranch);
        spinner.succeed(chalk.green('🚀 Pushed successfully.'));
        break;

      case '/log':
        const logs = await git.log({ maxCount: 5 });
        console.log(chalk.yellow('\n📜 Recent Commits:'));
        logs.all.forEach(l => console.log(` • ${chalk.cyan(l.hash.substring(0,7))} ${l.message}`));
        console.log('');
        break;

      case '/quit':
      case '/exit':
      case 'q':
        console.log(chalk.gray('Git Manager Closed.'));
        return;

      default:
        console.log(chalk.gray('ℹ️  Commands: /add <file|all>, /commit, /push, /log, /quit'));
    }
  } catch (error) {
    console.log(chalk.bgRed(' ERROR '), error.message);
  }

  await gitLoop();
};