import fs from 'fs';
import os from 'os';
import path from 'path';

const DEVDECK_DIR = path.join(os.homedir(), '.devdeck');
const CONFIG_FILE = path.join(DEVDECK_DIR, 'config.json');

const DEFAULT_CONFIG = {
  theme: 'default',
  defaultPlaybackMode: 'background',
  autoUpdate: false,
  autoResumeMusic: true,
  lastUpdateCheck: 0
};

const ensureConfigFile = () => {
  if (!fs.existsSync(DEVDECK_DIR)) fs.mkdirSync(DEVDECK_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  }
};

export const getConfig = () => {
  ensureConfigFile();
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
};

export const getDefaultConfig = () => ({ ...DEFAULT_CONFIG });

export const saveConfig = (nextConfig) => {
  ensureConfigFile();
  const merged = { ...DEFAULT_CONFIG, ...nextConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
};

export const updateConfig = (patch) => {
  const current = getConfig();
  return saveConfig({ ...current, ...patch });
};

export const getConfigPath = () => CONFIG_FILE;
