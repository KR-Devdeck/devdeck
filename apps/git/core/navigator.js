import inquirer from 'inquirer';
import chalk from 'chalk';
import { getChangedFiles, getStatusSummary } from './status.js';
import { createTreeChoices } from './tree.js';
import {
  buildBatchOperations,
  summarizeOperations,
  applyBatchOperations
} from './operations.js';

export class GitNavigator {
  async start() {
    while (true) {
      const files = getChangedFiles();

      console.clear();
      console.log(chalk.bold('  Git Change Explorer'));

      if (files.length === 0) {
        console.log(chalk.gray('  ────────────────────────────────────────'));
        console.log(chalk.green('\n  ✨  모든 변경사항이 커밋되었거나 깨끗합니다! (Clean)'));
        await this.pause(1500);
        break;
      }

      this.renderHeader(files);
      const visibleFiles = files;

      const result = await this.handleSelectionFlow(visibleFiles);
      if (result === 'EXIT') break;
    }
  }

  renderHeader(files) {
    const summary = getStatusSummary(files);
    console.log(chalk.gray('  ────────────────────────────────────────'));
    console.log(
      `   ${chalk.green.bold(`Staged: ${summary.stagedCount}`)}   |   ${chalk.yellow.bold(`Modified: ${summary.modifiedCount}`)}   |   ${chalk.white(`Total: ${summary.totalCount}`)}`
    );
    console.log(`   ${chalk.gray('Legend: [XY]/[NEW] path   (X=staged, Y=unstaged)')}`);
    console.log(chalk.gray('  ────────────────────────────────────────'));
  }

  async handleSelectionFlow(visibleFiles) {
    const choices = createTreeChoices(visibleFiles);
    if (!choices.length) {
      await this.pause(300);
      return 'CONTINUE';
    }

    choices.push(new inquirer.Separator(chalk.gray('  ────────────────')));
    choices.push({ name: 'Back', value: { type: 'EXIT' } });

    const { selectedItems } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedItems',
        message: 'Space로 항목 체크 후 Enter로 반영하세요 (미선택 Enter=새로고침):',
        pageSize: 20,
        loop: false,
        choices
      }
    ]);

    if (!selectedItems.length) {
      return 'CONTINUE';
    }

    if (selectedItems.some((item) => item.type === 'EXIT')) return 'EXIT';

    const targets = selectedItems.filter((item) => item.type === 'FILE' || item.type === 'FOLDER');
    if (!targets.length) return 'CONTINUE';

    const operations = buildBatchOperations(targets, visibleFiles);
    const summary = summarizeOperations(operations);
    if (summary.addCount === 0 && summary.resetCount === 0) return 'CONTINUE';

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        default: true,
        message: `선택 적용: add ${summary.addCount}개 / reset ${summary.resetCount}개. 진행할까요?`
      }
    ]);

    if (!confirmed) return 'CONTINUE';
    applyBatchOperations(operations);
    return 'CONTINUE';
  }

  pause(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
