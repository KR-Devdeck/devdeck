import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';

export class GitNavigator {
  constructor() {
    this.rootDir = process.cwd();
  }

  // 1. Git 상태 파싱
  getChangedFiles() {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf8' });
      const files = [];

      output.split('\n').forEach(line => {
        if (!line.trim()) return;
        
        const x = line[0]; 
        const y = line[1];
        let filePath = line.substring(3).trim().replace(/"/g, '');

        if (filePath.includes('->')) filePath = filePath.split('->')[1].trim();

        files.push({
          path: filePath,
          statusX: x,
          statusY: y,
          parts: filePath.split('/') // 경로 분해
        });
      });

      return files; // 정렬은 트리 빌더에서 처리
    } catch (e) {
      return [];
    }
  }

  // 2. 메인 실행 루프
  async start() {
    while (true) {
      const files = this.getChangedFiles();
      
      console.clear();
      console.log(chalk.bold('  🐙 Git Change Explorer (Compact View)'));
      
      if (files.length === 0) {
        console.log(chalk.gray('  ────────────────────────────────────────'));
        console.log(chalk.green('\n  ✨  모든 변경사항이 커밋되었거나 깨끗합니다! (Clean)'));
        await this.pause(1500);
        break;
      }

      // 상태 요약 바
      const stagedCount = files.filter(f => f.statusX !== ' ' && f.statusX !== '?').length;
      const modifiedCount = files.length - stagedCount;
      
      console.log(chalk.gray('  ────────────────────────────────────────'));
      console.log(`   ${chalk.green.bold(`✅ Staged: ${stagedCount}`)}   |   ${chalk.red.bold(`📝 Modified: ${modifiedCount}`)}   |   ${chalk.white(`Total: ${files.length}`)}`);
      console.log(chalk.gray('  ────────────────────────────────────────'));

      // 3. 트리 생성 (폴더 압축 로직 적용)
      const tree = this.createFileTree(files);
      const choices = [];
      this.traverseTree(tree, 0, choices);

      // 하단 메뉴
      choices.push(new inquirer.Separator(chalk.gray('  ────────────────')));
      choices.push({ name: '🔙  나가기 (Back)', value: 'EXIT' });

      const { selected } = await inquirer.prompt([{
        type: 'list',
        name: 'selected',
        message: '항목을 선택하여 상태를 토글하세요 (폴더는 일괄 처리):',
        pageSize: 20,
        loop: false,
        choices: choices
      }]);

      if (selected === 'EXIT') break;

      try {
        if (selected.type === 'FILE') {
          await this.toggleFile(selected.path, selected.statusX);
        } else if (selected.type === 'FOLDER') {
          await this.toggleFolder(selected.path, files);
        }
      } catch (e) {
        // 에러 무시
      }
    }
  }

  // 🌳 [Step 1] 파일 리스트를 트리 객체로 변환
  createFileTree(files) {
    const root = { name: 'root', path: '', folders: {}, files: [] };
    
    files.forEach(file => {
      let current = root;
      file.parts.forEach((part, index) => {
        // 마지막 부분은 파일
        if (index === file.parts.length - 1) {
          current.files.push(file);
        } else {
          // 폴더
          if (!current.folders[part]) {
            const folderPath = file.parts.slice(0, index + 1).join('/');
            current.folders[part] = { 
              name: part, 
              path: folderPath, 
              folders: {}, 
              files: [] 
            };
          }
          current = current.folders[part];
        }
      });
    });
    return root;
  }

  // 🌳 [Step 2] 트리를 순회하며 메뉴 생성 (여기에 압축 로직 포함!)
  traverseTree(node, depth, choices) {
    // 1. 폴더 처리
    const folderKeys = Object.keys(node.folders).sort();
    
    folderKeys.forEach(key => {
      let childNode = node.folders[key];
      
      // ✨ [폴더 압축 마법] ✨
      // 자식 폴더가 딱 하나고, 파일이 없다면? -> 계속 파고들어서 이름을 합친다!
      let displayPath = childNode.name;
      let fullPath = childNode.path;

      while (Object.keys(childNode.folders).length === 1 && childNode.files.length === 0) {
        const singleChildKey = Object.keys(childNode.folders)[0];
        const singleChildNode = childNode.folders[singleChildKey];
        
        displayPath += '/' + singleChildNode.name; // 이름 합치기 (src/main/kotlin)
        fullPath = singleChildNode.path;           // 실제 경로 업데이트
        childNode = singleChildNode;               // 한 단계 아래로 이동
      }

      // 압축된 폴더 출력
      const indent = '  '.repeat(depth);
      choices.push({
        name: `${indent}${chalk.cyan('📂 ' + displayPath)}/`,
        value: { type: 'FOLDER', path: fullPath }
      });

      // 재귀 호출 (압축된 곳 다음부터 깊이 +1)
      this.traverseTree(childNode, depth + 1, choices);
    });

    // 2. 파일 처리
    node.files.sort((a, b) => a.path.localeCompare(b.path)).forEach(file => {
      const fileName = path.basename(file.path);
      const indent = '  '.repeat(depth);
      
      const isStaged = file.statusX !== ' ' && file.statusX !== '?';
      const isUntracked = file.statusX === '?' && file.statusY === '?';
      const isDeleted = file.statusX === 'D' || file.statusY === 'D';

      let icon = isStaged ? '✅' : '📝';
      let fileDisplay = isStaged ? chalk.green(fileName) : chalk.white(fileName);
      let statusLabel = '';

      if (isUntracked) {
        icon = '🆕';
        fileDisplay = chalk.red(fileName);
        statusLabel = chalk.gray(' (New)');
      } else if (isDeleted) {
        icon = '🗑️';
        fileDisplay = chalk.gray.strikethrough(fileName);
        statusLabel = chalk.gray(' (Deleted)');
      } else if (!isStaged) {
        fileDisplay = chalk.yellow(fileName);
      }

      choices.push({
        name: `${indent}  ${icon} ${fileDisplay}${statusLabel}`,
        value: { type: 'FILE', path: file.path, statusX: file.statusX }
      });
    });
  }

  async toggleFile(filePath, statusX) {
    const isStaged = statusX !== ' ' && statusX !== '?';
    if (isStaged) execSync(`git reset "${filePath}"`);
    else execSync(`git add "${filePath}"`);
  }

  async toggleFolder(folderPath, allFiles) {
    // 해당 경로로 시작하는 모든 파일 찾기
    const targetFiles = allFiles.filter(f => f.path.startsWith(folderPath + '/'));
    const hasUnstaged = targetFiles.some(f => f.statusX === ' ' || f.statusX === '?');

    targetFiles.forEach(f => {
      try {
        if (hasUnstaged) execSync(`git add "${f.path}"`);
        else execSync(`git reset "${f.path}"`);
      } catch(e) {}
    });
  }

  pause(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}