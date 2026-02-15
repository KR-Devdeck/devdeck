import { execSync } from 'child_process';
import { isStaged } from './status.js';

export const buildBatchOperations = (selectedItems, allFiles) => {
  const operations = new Map();
  const explicitFiles = selectedItems.filter((item) => item.type === 'FILE');
  const explicitPaths = new Set(explicitFiles.map((item) => item.path));

  const folders = selectedItems.filter((item) => item.type === 'FOLDER');
  for (const folder of folders) {
    const targetFiles = allFiles.filter((f) => f.path.startsWith(folder.path + '/'));
    if (!targetFiles.length) continue;

    const hasUnstaged = targetFiles.some((f) => f.statusX === ' ' || f.statusX === '?');
    const operation = hasUnstaged ? 'add' : 'reset';
    const folderDepth = folder.path.split('/').length;

    for (const f of targetFiles) {
      if (explicitPaths.has(f.path)) continue;

      const prev = operations.get(f.path);
      if (!prev || (prev.sourceType === 'FOLDER' && folderDepth > prev.folderDepth)) {
        operations.set(f.path, {
          operation,
          sourceType: 'FOLDER',
          folderDepth
        });
      }
    }
  }

  for (const file of explicitFiles) {
    operations.set(file.path, {
      operation: isStaged(file) ? 'reset' : 'add',
      sourceType: 'FILE',
      folderDepth: 0
    });
  }

  return operations;
};

export const summarizeOperations = (operations) => {
  const opList = [...operations.values()];
  return {
    addCount: opList.filter((op) => op.operation === 'add').length,
    resetCount: opList.filter((op) => op.operation === 'reset').length
  };
};

export const applyBatchOperations = (operations) => {
  for (const [filePath, op] of operations) {
    try {
      applyGitOperation(filePath, op.operation);
    } catch (e) {
      // ignore per-file failure and continue
    }
  }
};

const applyGitOperation = (filePath, operation) => {
  const escapedPath = filePath.replace(/"/g, '\\"');
  if (operation === 'reset') execSync(`git reset "${escapedPath}"`);
  else execSync(`git add "${escapedPath}"`);
};
