import simpleGit from 'simple-git';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';

const git = simpleGit();

// 🎨 파일 상태별 아이콘 (보기 좋게 꾸미기)
const getFileIcon = (status) => {
  if (status.includes('?')) return '❓ (New)'; 
  if (status.includes('M')) return '📝 (Mod)'; 
  if (status.includes('A')) return '✨ (Added)'; 
  if (status.includes('D')) return '🗑  (Del)'; 
  return '📄';
};

export const runGit = async () => {
  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log(chalk.red('❌ 현재 폴더는 Git 저장소가 아닙니다. (git init 필요)'));
      return;
    }
    await gitMenuLoop();
  } catch (e) {
    console.log(chalk.red('Git 초기화 에러:'), e.message);
  }
};

const gitMenuLoop = async () => {
  console.clear();
  
  // 🔄 상태를 매번 새로 불러옵니다 (가장 중요!)
  const status = await git.status();
  const currentBranch = status.current;
  
  // node_modules 등 지저분한 파일 숨기기
  const cleanFiles = status.files.filter(f => !f.path.includes('node_modules/'));
  const changedCount = cleanFiles.length;
  const stagedCount = status.staged.length; // 스테이징된 파일 개수

  console.log(chalk.blue.bold('╔══════════════════════════════════════════╗'));
  console.log(chalk.blue.bold(`║ 🐙 DevDeck Git Manager                   ║`));
  console.log(chalk.blue.bold(`║ 🌿 Branch : ${chalk.green(currentBranch.padEnd(28))} ║`));
  console.log(chalk.blue.bold(`║ 📝 Changed: ${chalk.yellow(String(changedCount).padEnd(28))} ║`));
  console.log(chalk.blue.bold(`║ 📦 Staged : ${chalk.green(String(stagedCount).padEnd(28))} ║`));
  console.log(chalk.blue.bold('╚══════════════════════════════════════════╝'));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Git 명령 선택:',
      pageSize: 12,
      choices: [
        { name: `📦 파일 스테이징 (Add) [${changedCount}개 대기]`, value: 'add' },
        { name: `💾 커밋 하기 (Commit) [${stagedCount}개 준비됨]`, value: 'commit' },
        { name: '🚀 푸시 (Push)', value: 'push' },
        { name: '⬇️  풀 (Pull)', value: 'pull' },
        new inquirer.Separator(),
        { name: '🌿 브랜치 관리 (Checkout)', value: 'branch' },
        { name: '📜 로그 확인 (Log)', value: 'log' },
        { name: '🙈 .gitignore 생성', value: 'ignore' },
        new inquirer.Separator(),
        { name: '🔙 나가기', value: 'quit' }
      ]
    }
  ]);

  if (action === 'quit') return;

  try {
    if (action === 'add') await handleAdd(cleanFiles);
    else if (action === 'commit') await handleCommit(); // 인자 없이 호출 (안에서 새로 조회)
    else if (action === 'push') await handlePush(currentBranch);
    else if (action === 'pull') await handlePull(currentBranch);
    else if (action === 'branch') await handleBranch(currentBranch);
    else if (action === 'log') await handleLog();
    else if (action === 'ignore') await handleIgnore();
  } catch (e) {
    console.log(chalk.bgRed(' ERROR '), e.message);
    await pause();
  }

  await gitMenuLoop(); // 무한 루프
};

// 📦 1. Add (멀티 체크박스 기능 적용)
const handleAdd = async (files) => {
  // 이미 스테이징 된 파일은 제외하거나 표시해줄 수 있지만, 
  // 심플하게 '변경된 파일' 전체를 보여줍니다.
  if (files.length === 0) {
    console.log(chalk.gray('변경사항이 없습니다.'));
    await pause();
    return;
  }

  const choices = files.map(f => ({
    name: `${getFileIcon(f.index + f.working_dir)} ${f.path}`,
    value: f.path,
    checked: false // 기본적으로 체크 해제
  }));

  const { selectedFiles } = await inquirer.prompt([
    {
      type: 'checkbox', // [핵심] 여러 개 선택 가능!
      name: 'selectedFiles',
      message: '스테이징할 파일을 선택하세요 (Space:선택, Enter:확정):',
      choices: choices,
      pageSize: 15
    }
  ]);

  if (selectedFiles.length > 0) {
    const spinner = ora('Staging files...').start();
    await git.add(selectedFiles);
    spinner.succeed(chalk.green(`${selectedFiles.length}개 파일이 Staged 되었습니다!`));
  } else {
    console.log(chalk.gray('선택된 파일이 없습니다.'));
  }
  await pause(1000);
};

// 💾 2. Commit (수정됨: 상태 재확인)
const handleCommit = async () => {
  // [핵심 Fix] 커밋 직전에 상태를 다시 조회해야 정확합니다.
  const status = await git.status(); 

  if (status.staged.length === 0) {
    console.log(chalk.yellow('⚠️  Commit 할 파일이 없습니다 (Staged 상태가 아님).'));
    console.log(chalk.gray('먼저 [Add] 메뉴를 통해 파일을 스테이징 해주세요.'));
    await pause();
    return;
  }

  const { msg } = await inquirer.prompt([
    { type: 'input', name: 'msg', message: '커밋 메시지 입력:' }
  ]);

  if (msg.trim()) {
    const spinner = ora('Committing...').start();
    try {
      await git.commit(msg);
      spinner.succeed(chalk.green('✨ 커밋 완료!'));
    } catch (e) {
      spinner.fail('커밋 실패');
      console.log(e.message);
    }
  }
  await pause(1000);
};

// 🚀 3. Push
const handlePush = async (branch) => {
  const spinner = ora(`Pushing to origin/${branch}...`).start();
  try { 
    await git.push('origin', branch); 
    spinner.succeed('🚀 Push 완료!'); 
  } catch(e) { 
    spinner.fail('Push 실패'); 
    console.log(chalk.red(e.message)); 
  }
  await pause();
};

// ⬇️ 4. Pull
const handlePull = async (branch) => {
  const spinner = ora(`Pulling from origin/${branch}...`).start();
  try { 
    await git.pull('origin', branch); 
    spinner.succeed('⬇️  Pull 완료!'); 
  } catch(e) { 
    spinner.fail('Pull 실패'); 
  }
  await pause();
};

// 🌿 5. Branch
const handleBranch = async (current) => {
  const branches = await git.branchLocal();
  const list = branches.all.filter(b => b !== current);
  
  const choices = [
    ...list.map(b => ({ name: `🌿 ${b}`, value: b })), 
    new inquirer.Separator(), 
    { name: '✨ 새 브랜치 생성', value: 'new' }, 
    { name: '🔙 취소', value: 'back' }
  ];

  const { target } = await inquirer.prompt([{
    type: 'list', name: 'target', message: '브랜치 관리:', choices
  }]);

  if (target === 'back') return;

  if (target === 'new') {
    const { newName } = await inquirer.prompt([{ type: 'input', name: 'newName', message: '새 브랜치 이름:' }]);
    if (newName) { 
      await git.checkoutLocalBranch(newName); 
      console.log(chalk.green(`✨ 브랜치 생성 및 이동: ${newName}`)); 
    }
  } else {
    await git.checkout(target); 
    console.log(chalk.green(`🌿 브랜치 이동 완료: ${target}`));
  }
  await pause();
};

// 📜 6. Log
const handleLog = async () => {
  try {
    const log = await git.log({ maxCount: 5 });
    console.log(chalk.yellow('\n📜 최근 커밋 로그 (Last 5)'));
    log.all.forEach(l => {
      console.log(`${chalk.cyan(l.hash.substring(0,7))} - ${l.message} ${chalk.dim(`(${l.author_name})`)}`);
    });
  } catch (e) {
    console.log(chalk.gray('로그를 불러올 수 없습니다 (아직 커밋이 없나요?)'));
  }
  await pause();
};

// 🙈 7. Ignore
const handleIgnore = async () => {
  if (fs.existsSync('.gitignore')) {
    const { overwrite } = await inquirer.prompt([{ type: 'confirm', name: 'overwrite', message: '.gitignore가 이미 있습니다. 덮어쓸까요?', default: false }]);
    if (!overwrite) return;
  }
  
  const ignoreContent = `# Logs\nlogs\n*.log\nnpm-debug.log*\n\n# Runtime data\n*.pid\n*.seed\n\n# Dependencies\nnode_modules/\n\n# Env\n.env\n.DS_Store`;
  fs.writeFileSync('.gitignore', ignoreContent);
  console.log(chalk.green('✅ .gitignore 파일 생성 완료!'));
  await pause();
};

// 유틸: 일시정지
const pause = async (ms) => {
  if (ms) await new Promise(r => setTimeout(r, ms));
  else await inquirer.prompt([{ type: 'input', name: 'enter', message: '엔터를 누르면 돌아갑니다...', prefix: '' }]);
};