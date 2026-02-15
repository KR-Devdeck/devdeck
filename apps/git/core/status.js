import { execSync } from 'child_process';

export const getChangedFiles = () => {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    const files = [];

    output.split('\n').forEach((line) => {
      if (!line.trim()) return;

      const x = line[0];
      const y = line[1];
      let filePath = line.substring(3).trim().replace(/"/g, '');

      if (filePath.includes('->')) filePath = filePath.split('->')[1].trim();

      files.push({
        path: filePath,
        statusX: x,
        statusY: y,
        parts: filePath.split('/')
      });
    });

    return files;
  } catch (e) {
    return [];
  }
};

export const isStaged = (file) => file.statusX !== ' ' && file.statusX !== '?';

export const getStatusSummary = (files) => {
  const stagedCount = files.filter(isStaged).length;
  return {
    stagedCount,
    modifiedCount: files.length - stagedCount,
    totalCount: files.length
  };
};
