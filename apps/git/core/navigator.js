import inquirer from 'inquirer';
import chalk from 'chalk';
import { getChangedFiles, getStatusSummary } from './status.js';
import { createTreeChoices } from './tree.js';
import {
  buildBatchOperations,
  summarizeOperations,
  applyBatchOperations
} from './operations.js';
import { getConfig } from '../../core/config.js';

const T = (key, vars = {}) => {
  const lang = getConfig().language || 'ko';
  const m = {
    title: { ko: '  Git Change Explorer', en: '  Git Change Explorer', ja: '  Git 変更エクスプローラ', 'zh-CN': '  Git 变更浏览器' },
    clean: { ko: '\n  ✨  모든 변경사항이 커밋되었거나 깨끗합니다! (Clean)', en: '\n  ✨  Working tree is clean!', ja: '\n  ✨  変更はありません (Clean)', 'zh-CN': '\n  ✨  工作区干净 (Clean)' },
    legend: { ko: 'Legend: [XY]/[NEW] path   (X=staged, Y=unstaged)', en: 'Legend: [XY]/[NEW] path   (X=staged, Y=unstaged)', ja: '凡例: [XY]/[NEW] path   (X=staged, Y=unstaged)', 'zh-CN': '图例: [XY]/[NEW] path   (X=staged, Y=unstaged)' },
    back: { ko: 'Back', en: 'Back', ja: '戻る', 'zh-CN': '返回' },
    pick: { ko: 'Space로 항목 체크 후 Enter로 반영하세요 (미선택 Enter=새로고침):', en: 'Select with Space then Enter (Enter without selection = refresh):', ja: 'Space で選択、Enter で適用 (未選択 Enter=更新):', 'zh-CN': 'Space 选择，Enter 应用（未选择 Enter=刷新）:' },
    confirm: { ko: '선택 적용: add {a}개 / reset {r}개. 진행할까요?', en: 'Apply selection: add {a} / reset {r}. Continue?', ja: '選択適用: add {a} / reset {r}。続行しますか?', 'zh-CN': '应用选择: add {a} / reset {r}。继续吗?' }
  };
  const raw = (m[key]?.[lang] ?? m[key]?.ko ?? key);
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
};

export class GitNavigator {
  async start() {
    while (true) {
      const files = getChangedFiles();

      console.clear();
      console.log(chalk.bold(T('title')));

      if (files.length === 0) {
        console.log(chalk.gray('  ────────────────────────────────────────'));
        console.log(chalk.green(T('clean')));
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
    console.log(`   ${chalk.gray(T('legend'))}`);
    console.log(chalk.gray('  ────────────────────────────────────────'));
  }

  async handleSelectionFlow(visibleFiles) {
    const choices = createTreeChoices(visibleFiles);
    if (!choices.length) {
      await this.pause(300);
      return 'CONTINUE';
    }

    choices.push(new inquirer.Separator(chalk.gray('  ────────────────')));
    choices.push({ name: T('back'), value: { type: 'EXIT' } });

    const { selectedItems } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedItems',
        message: T('pick'),
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
        message: T('confirm', { a: summary.addCount, r: summary.resetCount })
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
