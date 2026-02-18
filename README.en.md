# 🎴 DevDeck (Developer's Command Center)

**Language**: [한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

> Default document: Korean (`README.md`). Select your preferred language above.

> **"Even moving your hand to the mouse is too much."**
> An all-in-one terminal productivity tool for developers (schedule, music, Git).

![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-Non--Commercial-red.svg)

**DevDeck** helps you stay inside the terminal without breaking your development flow.
Run one command, `deck`, to manage your day, play music, and handle Git tasks.

---

## ✨ Features

### 📅 Daily Dashboard

- Manage today's todos quickly from the terminal.
- Start the day with weather info and a developer quote.

### 🎧 Terminal Jukebox

- Direct streaming (no local audio file storage).
- Lightweight playback with `mpv` and search via `yt-dlp`.
- Queue, loop, seek, skip, and background control.

### 🐙 Git Manager

- Multi-select file staging.
- Smart commit flow based on current state.
- `.gitignore` helper generation.

---

## 🛠 Prerequisites

- Node.js 18+ (LTS recommended)
- `mpv` and `yt-dlp` for music features

Install Node.js from [nodejs.org](https://nodejs.org/).

---

## 🚀 Installation

### A) Global install (recommended)

```bash
npm install -g @beargame/devdeck
```

`postinstall` attempts automatic setup for `mpv` and `yt-dlp`.

### B) Install from source

```bash
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck
npm run setup
```

---

## 🎮 Usage

```bash
deck
```

| Command  | Description |
| :-- | :-- |
| `deck` | Main dashboard |
| `deck m` | Music player |
| `deck g` | Git manager |

---

## ❓ Troubleshooting

- Music/search issues: check `mpv --version` and `yt-dlp --version`.
- `deck` not found: reinstall globally and restart terminal.
- Windows stuck playback:

```powershell
taskkill /F /IM mpv.exe
```

---

## ⚠️ Disclaimer

This project is intended for educational and personal use.
It does not store audio files locally and works as a direct streaming client.
Users are responsible for complying with platform terms and applicable laws.

## 📜 License

This project uses the **DevDeck Non-Commercial License**.
See `LICENSE` for the full text.

### License Summary

- Commercial use is not allowed.
- Selling this software is not allowed.
- Monetized distribution or paid service usage is not allowed.
- Redistributed copies must include the license notice.

This is a custom non-commercial license and not an OSI-approved open-source license.
Contribution terms are in `CONTRIBUTING.md`.
