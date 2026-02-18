import chalk from 'chalk';
import { getConfig } from './config.js';

const THEMES = {
  default: {
    primary: chalk.cyan,
    accent: chalk.yellowBright,
    muted: chalk.gray,
    success: chalk.greenBright,
    warning: chalk.yellow,
    danger: chalk.red,
    info: chalk.cyanBright,
    title: chalk.cyan.bold
  },
  minimal: {
    primary: chalk.white,
    accent: chalk.white.bold,
    muted: chalk.gray,
    success: chalk.white,
    warning: chalk.white,
    danger: chalk.white,
    info: chalk.white,
    title: chalk.white.bold
  }
};

export const getThemeName = () => {
  const cfg = getConfig();
  return cfg.theme === 'minimal' ? 'minimal' : 'default';
};

export const getTheme = () => THEMES[getThemeName()];

