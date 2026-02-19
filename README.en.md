<p align="center">
  <img width="100%" alt="DevDeck hero" src="docs/media/devdeck-hero.svg" />
</p>

<p align="center">
  <b>Developer's Command Center</b><br/>
  All-in-one terminal CLI for schedule, music, and Git workflows
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

Run from source:

```bash
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck
npm run setup
```

---

## Features

- Daily Dashboard: todos, weather, and dev quotes
- Terminal Jukebox: search/play/loop/seek with `mpv` + `yt-dlp`
- Git Manager: multi-stage, smart commit flow, `.gitignore` helper

---

## Commands

| Command | Description |
| :-- | :-- |
| `deck` | Open main dashboard |
| `deck m` | Open music player |
| `deck g` | Open Git manager |

---

## Prerequisites

- Node.js `>=18`
- `mpv`
- `yt-dlp`

The setup script attempts automatic installation for `mpv` and `yt-dlp`.

---

## Troubleshooting

- Music/search issues: `mpv --version`, `yt-dlp --version`
- `deck` not found: reinstall globally and restart terminal
- Windows stuck playback:

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
