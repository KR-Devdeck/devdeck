import chalk from 'chalk';
import { isStaged } from './status.js';
import { getConfig } from '../../core/config.js';

export const createTreeChoices = (files) => {
  const tree = createFileTree(files);
  const choices = [];
  traverseTree(tree, 0, choices);
  return choices;
};

const createFileTree = (files) => {
  const root = { name: 'root', path: '', folders: {}, files: [] };

  files.forEach((file) => {
    let current = root;
    file.parts.forEach((part, index) => {
      if (index === file.parts.length - 1) {
        current.files.push(file);
        return;
      }

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
    });
  });

  return root;
};

const traverseTree = (node, depth, choices) => {
  const folderKeys = Object.keys(node.folders).sort();

  folderKeys.forEach((key) => {
    let childNode = node.folders[key];
    let displayPath = childNode.name;
    let fullPath = childNode.path;

    while (Object.keys(childNode.folders).length === 1 && childNode.files.length === 0) {
      const singleChildKey = Object.keys(childNode.folders)[0];
      const singleChildNode = childNode.folders[singleChildKey];

      displayPath += '/' + singleChildNode.name;
      fullPath = singleChildNode.path;
      childNode = singleChildNode;
    }

    const indent = '  '.repeat(depth);
    const count = countNodeFiles(childNode);
    choices.push({
      name: `${indent}${chalk.cyan(`${displayPath}/`)} ${chalk.gray(`· ${count}`)}`,
      value: { type: 'FOLDER', path: fullPath }
    });

    traverseTree(childNode, depth + 1, choices);
  });

  node.files.sort((a, b) => a.path.localeCompare(b.path)).forEach((file) => {
    const fileName = file.path.split('/').pop() || file.path;
    const indent = '  '.repeat(depth);
    const status = `${file.statusX}${file.statusY}`;
    const fileDisplay = getFileDisplay(file, fileName);
    const statusDisplay = getStatusDisplay(status);

    choices.push({
      name: `${indent}  ${statusDisplay} ${fileDisplay}`,
      value: { type: 'FILE', path: file.path, statusX: file.statusX }
    });
  });
};

const countNodeFiles = (node) => {
  let count = node.files.length;
  for (const folder of Object.values(node.folders)) {
    count += countNodeFiles(folder);
  }
  return count;
};

const getFileDisplay = (file, fileName) => {
  const isDeleted = file.statusX === 'D' || file.statusY === 'D';
  if (isDeleted) return chalk.gray.strikethrough(fileName);
  if (isStaged(file)) return chalk.green(fileName);
  return chalk.white(fileName);
};

const getStatusDisplay = (status) => {
  if (status === '??') {
    const lang = getConfig().language || 'ko';
    const newLabel = lang === 'ko'
      ? '신규'
      : lang === 'ja'
      ? '新規'
      : lang === 'zh-CN'
      ? '新增'
      : 'NEW';
    return chalk.cyan(`[${newLabel}]`);
  }
  if (status.includes('D')) return chalk.gray(`[${status}]`);
  if (status[0] !== ' ' && status[1] !== ' ') return chalk.magenta(`[${status}]`);
  if (status[0] !== ' ') return chalk.green(`[${status}]`);
  return chalk.yellow(`[${status}]`);
};
