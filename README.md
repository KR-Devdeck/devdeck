# 🎴 DevDeck (Developer's Command Center)

> **"마우스에 손을 올리는 시간조차 아깝다."**
> 개발자를 위한 올인원 터미널 생산성 도구 (일정, 음악, Git 관리)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**DevDeck**은 개발 작업 흐름을 끊지 않고 터미널 안에서 모든 것을 해결할 수 있도록 돕는 CLI 도구입니다. 복잡한 설정 없이 `deck` 명령어 하나로 하루 일정 관리, 노동요 재생, Git 관리를 시작하세요.

---

## ✨ Features (주요 기능)

### 📅 Daily Dashboard
- **Todo 관리:** 오늘 할 일을 터미널에서 빠르게 확인하고 체크합니다.
- **Daily Info:** 실시간 날씨 정보와 영감을 주는 개발 명언으로 하루를 시작하세요.

### 🎧 Terminal Jukebox
- **유튜브 스트리밍:** 광고 없는 고품질 오디오 스트리밍을 지원합니다.
- **경량 엔진:** `mpv` 기반의 가벼운 백그라운드 재생.
- **편의 기능:** 검색, 재생 목록 관리, 루프(한곡/전체), 10초 건너뛰기.

### 🐙 Git Manager
- **Multi-Select Add:** 스페이스바로 여러 파일을 선택하여 한 번에 Staging 영역에 추가합니다.
- **Smart Commit:** 상태 자동 감지로 실수 없는 커밋을 유도합니다.
- **Auto Ignore:** 편리한 `.gitignore` 자동 생성 기능을 제공합니다.

---

## 🛠 Prerequisites (필수 준비물)

본 도구는 **Node.js** 환경에서 동작하며, 음악 재생을 위해 **mpv**와 **yt-dlp**가 필요합니다.

### 1. Node.js 설치
[Node.js 공식 홈페이지](https://nodejs.org/)에서 **v18 이상(LTS 권장)** 버전을 설치해주세요.

### 2. 미디어 관련 라이브러리 설치 (필수)
음악 재생을 위해 운영체제에 맞는 명령어를 입력해주세요.

| OS | 패키지 매니저 | 명령어 |
| :--- | :--- | :--- |
| **macOS** | Homebrew | `brew install mpv yt-dlp` |
| **Windows** | Scoop (**추천**) | `scoop bucket add extras; scoop install mpv yt-dlp` |
| **Windows** | Chocolatey | `choco install mpv yt-dlp` |

> **💡 Windows 사용자 필독**
> `scoop` 명령어가 없다면 PowerShell에서 아래 명령어로 먼저 설치하세요.
> ```powershell
> Set-ExecutionPolicy RemoteSigned -Scope CurrentUser; irm get.scoop.sh | iex
> ```
---

## 🚀 Installation (설치하기)

준비물이 완료되었다면, 터미널에서 아래 과정을 진행하세요.

```bash
# 1. 소스 코드 다운로드
git clone https://github.com/KR-Devdeck/devdeck.git
cd devdeck

# 2. 라이브러리 설치
npm install

# 3. 전역 명령어 등록 (어디서든 'deck'으로 실행 가능)
npm link
```

---

## 🎮 Usage (사용법)

터미널 어디서든 `deck`을 입력하여 실행할 수 있습니다.

### 메인 명령어
| 명령어 | 기능 설명 |
| :--- | :--- |
| `deck` | 🏠 메인 대시보드 실행 |
| `deck m` | 🎵 뮤직 플레이어 바로 실행 |
| `deck g` | 🐙 Git 매니저 바로 실행 |

### ⌨️ 조작법 (Controls)
| 키(Key) | 액션(Action) | 컨텍스트 |
| :--- | :--- | :--- |
| `↑` / `↓` | 메뉴 및 리스트 이동 | 공통 |
| `Enter` | 선택 및 실행 | 공통 |
| `Space` | 재생/일시정지 혹은 파일 다중 선택 | Music / Git |
| `←` / `→` | 10초 뒤로 / 앞으로 감기 | Music |
| `q` | 뒤로 가기 및 종료 | 공통 |

---

## ❓ Troubleshooting (문제 해결)

**Q. 음악이 재생되지 않아요!**
> `mpv`나 `yt-dlp`가 제대로 설치되지 않았을 확률이 높습니다. 터미널에 `mpv --version`을 입력하여 설치 여부를 확인해주세요.

**Q. 'deck' 명령어를 찾을 수 없다고 나옵니다.**
> 설치 단계에서 `npm link`가 정상적으로 완료되었는지 확인하세요. 권한 오류 발생 시 `sudo npm link`를 시도해야 할 수 있습니다.

---

Made with ❤️ by **beargame123**