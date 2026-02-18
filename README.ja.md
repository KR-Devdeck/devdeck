# 🎴 DevDeck (Developer's Command Center)

**Language**: [한국어](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

> 既定のドキュメントは韓国語 (`README.md`) です。上のリンクから言語を選択してください。

> **「マウスに手を伸ばす時間さえ惜しい。」**
> 開発者向けオールインワン・ターミナル生産性ツール（予定、音楽、Git 管理）。

![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-Non--Commercial-red.svg)

**DevDeck** は、開発フローを止めずにターミナル内で作業を完結させる CLI ツールです。
`deck` コマンド 1 つで、日程管理、音楽再生、Git 操作を行えます。

---

## ✨ 主な機能

### 📅 Daily Dashboard

- 今日の Todo をターミナルで素早く確認・管理
- 天気情報と開発者向け名言を表示

### 🎧 Terminal Jukebox

- ローカル保存なしのダイレクトストリーミング
- `mpv` と `yt-dlp` を使った軽量再生
- キュー、ループ、シーク、スキップ、バックグラウンド制御

### 🐙 Git Manager

- 複数ファイルの一括ステージ
- 状態に応じたスマートコミット
- `.gitignore` 生成補助

---

## 🛠 前提条件

- Node.js 18 以上（LTS 推奨）
- 音楽機能用に `mpv` と `yt-dlp`

Node.js は [nodejs.org](https://nodejs.org/) からインストールしてください。

---

## 🚀 インストール

### A) グローバルインストール（推奨）

```bash
npm install -g @beargame/devdeck
```

`postinstall` で `mpv` と `yt-dlp` の自動セットアップを試行します。

### B) ソースからインストール

```bash
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck
npm run setup
```

---

## 🎮 使い方

```bash
deck
```

| コマンド | 説明 |
| :-- | :-- |
| `deck` | メインダッシュボード |
| `deck m` | 音楽プレイヤー |
| `deck g` | Git マネージャー |

---

## ❓ トラブルシューティング

- 音楽検索/再生が動かない場合: `mpv --version` と `yt-dlp --version` を確認
- `deck` が見つからない場合: グローバル再インストール後、ターミナル再起動
- Windows で再生が残る場合:

```powershell
taskkill /F /IM mpv.exe
```

---

## ⚠️ 免責事項

本プロジェクトは教育目的および個人利用を想定しています。
音声ファイルを端末に保存せず、ストリーミングクライアントとして動作します。
利用規約および関連法令の遵守はユーザーの責任です。

## 📜 ライセンス

本プロジェクトは **DevDeck Non-Commercial License** で提供されます。
詳細は `LICENSE` を参照してください。

### ライセンス要約

- 商用利用は禁止
- ソフトウェア販売は禁止
- 有料サービスや収益化配布での利用は禁止
- 再配布時はライセンス表記が必要

これはカスタムの非商用ライセンスであり、OSI 承認オープンソースライセンスではありません。
コントリビューション条件は `CONTRIBUTING.md` を参照してください。
