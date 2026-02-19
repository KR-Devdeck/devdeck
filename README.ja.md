<p align="center">
  <img width="100%" alt="DevDeck hero" src="docs/media/devdeck-hero.svg" />
</p>

<p align="center">
  <b>Developer's Command Center</b><br/>
  スケジュール、音楽、Git をターミナルで一括管理するオールインワン CLI
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

ソースから実行:

```bash
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck
npm run setup
```

---

## Features

- Daily Dashboard: Todo、天気、開発者向け名言
- Terminal Jukebox: `mpv` + `yt-dlp` による検索/再生/ループ/シーク
- Git Manager: 複数ステージ、スマートコミット、`.gitignore` 補助

---

## Commands

| Command | Description |
| :-- | :-- |
| `deck` | メインダッシュボード |
| `deck m` | 音楽プレイヤー |
| `deck g` | Git マネージャー |

---

## Prerequisites

- Node.js `>=18`
- `mpv`
- `yt-dlp`

セットアップスクリプトが `mpv` と `yt-dlp` の自動インストールを試行します。

---

## Troubleshooting

- 音楽/検索の問題: `mpv --version`, `yt-dlp --version`
- `deck` が見つからない: グローバル再インストール後にターミナル再起動
- Windows で再生プロセスが残る場合:

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
