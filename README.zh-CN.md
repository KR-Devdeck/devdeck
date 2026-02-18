# 🎴 DevDeck (Developer's Command Center)

**Language**: [한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

> 默认文档为韩语 (`README.md`)。请在上方选择你的语言。

> **“连把手移到鼠标上的时间都不想浪费。”**
> 面向开发者的一体化终端效率工具（日程、音乐、Git 管理）。

![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-Non--Commercial-red.svg)

**DevDeck** 让你在不离开终端的情况下完成常用开发流程。
只需一个 `deck` 命令，即可管理每日任务、播放音乐和处理 Git。

---

## ✨ 主要功能

### 📅 Daily Dashboard

- 在终端快速查看和管理今日待办
- 显示天气信息和开发者名言

### 🎧 Terminal Jukebox

- 直接流式播放，不在本地保存音频文件
- 基于 `mpv` 与 `yt-dlp` 的轻量播放与搜索
- 支持队列、循环、快进快退、跳过、后台控制

### 🐙 Git Manager

- 多文件批量暂存
- 基于当前状态的智能提交流程
- `.gitignore` 辅助生成

---

## 🛠 环境要求

- Node.js 18+（推荐 LTS）
- 音乐功能需要 `mpv` 和 `yt-dlp`

Node.js 安装地址: [nodejs.org](https://nodejs.org/)。

---

## 🚀 安装

### A) 全局安装（推荐）

```bash
npm install -g @beargame/devdeck
```

`postinstall` 会尝试自动安装 `mpv` 与 `yt-dlp`。

### B) 从源码安装

```bash
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck
npm run setup
```

---

## 🎮 使用方式

```bash
deck
```

| 命令 | 说明 |
| :-- | :-- |
| `deck` | 主仪表盘 |
| `deck m` | 音乐播放器 |
| `deck g` | Git 管理器 |

---

## ❓ 常见问题

- 音乐无法播放/搜索: 检查 `mpv --version` 与 `yt-dlp --version`
- 找不到 `deck`: 重新全局安装并重启终端
- Windows 播放进程未退出:

```powershell
taskkill /F /IM mpv.exe
```

---

## ⚠️ 免责声明

本项目用于教育和个人学习场景。
程序不会在用户设备保存音频文件，仅作为流媒体客户端运行。
用户需自行遵守相关平台条款和适用法律。

## 📜 许可证

本项目采用 **DevDeck Non-Commercial License**。
完整条款见 `LICENSE`。

### 许可证摘要

- 禁止商业用途
- 禁止销售本软件
- 禁止用于付费服务/产品或任何盈利分发
- 再分发时必须保留许可证声明

该许可证为自定义非商业许可证，不属于 OSI 批准的开源许可证。
贡献条款请见 `CONTRIBUTING.md`。
