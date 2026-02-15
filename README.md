# 🎴 DevDeck (Developer's Command Center)

> **"마우스에 손을 올리는 시간조차 아깝다."**
> 개발자를 위한 올인원 터미널 생산성 도구 (일정, 음악, Git 관리)

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**DevDeck**은 개발 작업 흐름을 끊지 않고 터미널 안에서 모든 것을 해결할 수 있도록 돕는 CLI 도구입니다.
복잡한 설정 없이 `deck` 명령어 하나로 하루 일정 관리, 노동요 재생, Git 관리를 시작하세요.

---

## ✨ Features (주요 기능)

### 📅 Daily Dashboard

* **Todo 관리:** 오늘 할 일을 터미널에서 빠르게 확인하고 체크합니다.
* **Daily Info:** 실시간 날씨 정보와 영감을 주는 개발 명언으로 하루를 시작하세요.

### 🎧 Terminal Jukebox

* **Direct Streaming:** 파일을 저장하지 않고 메모리 기반의 실시간 스트리밍으로 재생합니다.
* **경량 엔진:** `mpv` 기반의 가벼운 백그라운드 재생 및 `yt-dlp`를 활용한 검색.
* **Player Control:** 검색, 재생 목록 관리, 루프(한 곡/전체), 구간 이동, 백그라운드 제어.

### 🐙 Git Manager

* **Multi-Select Add:** 스페이스바로 여러 파일을 선택하여 한 번에 Staging 영역에 추가합니다.
* **Smart Commit:** 상태 자동 감지로 실수 없는 커밋을 유도합니다.
* **Auto Ignore:** 편리한 `.gitignore` 자동 생성 기능을 제공합니다.

---

## 🛠 Prerequisites (필수 준비물)

본 도구는 **Node.js** 환경에서 동작합니다.
오디오 스트리밍에 필요한 **mpv**, **yt-dlp**는 설치 스크립트에서 자동 설치를 시도합니다.

### 1. Node.js 설치

[Node.js 공식 홈페이지](https://nodejs.org/)에서 **v18 이상 (LTS 권장)** 버전을 설치해주세요.

---

## 🚀 Installation (설치하기)

### A) 원커맨드 글로벌 설치 (추천)

```bash
npm install -g @beargame/devdeck
```

글로벌 설치 시 `postinstall`에서 `mpv` / `yt-dlp` 자동 설치를 시도합니다.

> 자동 설치가 실패하면 스크립트가 운영체제별 수동 명령어를 안내합니다.

### B) 소스 코드로 설치

터미널에서 아래 2단계를 실행하세요.

```bash
# 1. 소스 코드 다운로드
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck

# 2. 원커맨드 설치
# - npm 의존성 설치
# - mpv / yt-dlp 자동 설치 시도
# - deck 명령어 전역 링크
npm run setup
```

> 소스 설치도 자동 설치가 실패하면 스크립트가 운영체제별 수동 명령어를 안내합니다.

---

## 🎮 Usage (사용법)

터미널 어디서든 `deck`을 입력하여 실행할 수 있습니다.

### 메인 명령어

| 명령어      | 기능 설명            |
| :------- | :--------------- |
| `deck`   | 🏠 메인 대시보드 실행    |
| `deck m` | 🎵 뮤직 플레이어 바로 실행 |
| `deck g` | 🐙 Git 매니저 바로 실행 |

### ⌨️ 조작법 (Controls)

| 키(Key) | 액션(Action)            | 컨텍스트        |
| :----- | :-------------------- | :---------- |
| ↑ / ↓  | 메뉴 및 리스트 이동           | 공통          |
| Enter  | 선택 및 실행               | 공통          |
| Space  | 재생 / 일시정지 또는 파일 다중 선택 | Music / Git |
| ← / →  | 10초 뒤로 / 앞으로 감기       | Music       |
| s      | 다음 곡 넘기기 (Skip)       | Music       |
| q      | 뒤로 가기 및 종료            | 공통          |

---

## ❓ Troubleshooting (문제 해결)

**Q. 음악이 재생되지 않거나 검색이 안 됩니다.**

* `mpv`, `yt-dlp`가 설치되어 있는지 확인하세요.
  (`mpv --version`, `yt-dlp --version`)
* 설치 직후라면 터미널을 완전히 종료 후 다시 실행하세요 (환경변수 적용).

**Q. `deck` 명령어를 찾을 수 없다고 나옵니다.**

* 전역 설치가 정상적으로 완료됐는지 확인하세요.
  (`npm install -g @beargame/devdeck`)
* 설치 후 새 터미널을 열어 PATH를 다시 로드하세요.
* macOS/Linux에서 권한 오류가 나면 npm 전역 경로 권한 설정을 먼저 정리해야 할 수 있습니다.

**Q. 노래가 꺼지지 않고 계속 나와요 (Windows).**

* 프로그램이 비정상 종료된 경우입니다.
* 아래 명령어로 프로세스를 정리하세요.

  ```powershell
  taskkill /F /IM mpv.exe
  ```

---

## ⚠️ Disclaimer (면책 조항)

**EN**
This project is for educational and personal study purposes only.
This application does not store any audio files on the user's device and operates solely as a streaming client using strictly direct streams.
The developer respects the rights of content creators and platform providers. If you are a copyright holder and wish for your content to be excluded or have concerns, please contact the developer.
This tool relies on `yt-dlp` and `mpv`. The user is responsible for complying with the terms of service of the content providers.

**KR**
이 프로젝트는 개발 공부 및 개인적인 사용을 목적으로 만들어졌습니다.
이 프로그램은 사용자 컴퓨터에 음원 파일을 저장하지 않으며, 오직 실시간 스트리밍 방식으로만 작동합니다.
저작권자의 권리를 존중합니다. 본 프로그램은 `yt-dlp`와 `mpv`를 활용한 CLI 클라이언트일 뿐이며, 이를 통해 발생하는 문제에 대한 책임은 사용자 본인에게 있습니다.

---

Made with ❤️ by **beargame123**
