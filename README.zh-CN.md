<p align="center">
  <img width="100%" alt="DevDeck hero" src="docs/media/devdeck-hero.svg" />
</p>

<p align="center">
  <b>Developer's Command Center</b><br/>
  在终端中统一处理日程、音乐和 Git 工作流的一体化 CLI
</p>

<p align="center">
  <a href="README.md">한국어</a> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-1f883d" alt="node" />
  <img src="https://img.shields.io/badge/license-Non--Commercial-c62828" alt="license" />
  <img src="https://img.shields.io/badge/npm-%40beargame%2Fdevdeck-CB3837" alt="npm" />
</p>

---

## Preview

| Dashboard | Music | Git Manager |
| :--: | :--: | :--: |
| <img width="230" height="130" alt="Dashboard preview" src="docs/media/preview-dashboard.png" /> | <img width="230" height="130" alt="Music preview" src="docs/media/preview-music.png" /> | <img width="230" height="130" alt="Git preview" src="docs/media/preview-git.png" /> |

<p align="center">
  <img width="680" alt="DevDeck demo" src="docs/media/devdeck-demo.gif" />
</p>

---

## Quick Start

```bash
npm install -g @beargame/devdeck
deck
```

从源码运行:

```bash
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck
npm run setup
```

---

## Features

- Daily Dashboard: 待办、天气、开发者语录
- Terminal Jukebox: 基于 `mpv` + `yt-dlp` 的搜索/播放/循环/快进快退
- Git Manager: 多文件暂存、智能提交流程、`.gitignore` 辅助

---

## Commands

| Command | Description |
| :-- | :-- |
| `deck` | 打开主面板 |
| `deck m` | 打开音乐播放器 |
| `deck g` | 打开 Git 管理器 |

---

## Prerequisites

- Node.js `>=18`
- `mpv`
- `yt-dlp`

安装脚本会尝试自动安装 `mpv` 和 `yt-dlp`。

---

## Troubleshooting

- 音乐/搜索异常: `mpv --version`, `yt-dlp --version`
- 找不到 `deck`: 重新全局安装并重启终端
- Windows 播放进程残留:

```powershell
taskkill /F /IM mpv.exe
```

---

## License

This project is distributed under the **DevDeck Non-Commercial License**.

- Commercial use is not allowed.
- Selling this software is not allowed.
- Monetized distribution is not allowed.
- Redistributed copies must include the license notice.

This is a custom non-commercial license and not an OSI-approved open-source license.
See `LICENSE` and `CONTRIBUTING.md` for details.
