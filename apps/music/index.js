import yts from 'yt-search';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';

// 💿 추천 테마 프리셋 복구
const TOPICS = [
  { name: '👨‍💻 코딩할 때 듣기 좋은 Lofi', query: 'lofi hip hop radio - beats to relax/study to' },
  { name: '☕️ 스타벅스 감성 Jazz', query: 'starbucks jazz cafe music' },
  { name: '🔥 쇠질할 때 헬스장 플레이리스트', query: 'workout motivation music gym' },
  { name: '🌧 비 오는 날 듣기 좋은 팝송', query: 'rainy day cozy pop songs' },
  { name: '🇰🇷 최신 아이돌 노동요', query: 'kpop workout playlist' }
];

export const runMusic = async () => {
  console.clear();
  console.log(chalk.magenta.bold('╔══════════════════════════════════════════╗'));
  console.log(chalk.magenta.bold('║       🎵 DevDeck Music Player v2.0       ║'));
  console.log(chalk.magenta.bold('╚══════════════════════════════════════════╝'));
  await mainMenu();
};

// 🏠 메인 메뉴 (검색 방식 선택)
const mainMenu = async () => {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '무엇을 듣고 싶으신가요?',
      choices: [
        { name: '🔍 노래 제목으로 검색', value: 'song' },
        { name: '🎤 가수 이름으로 검색', value: 'artist' },
        { name: '💿 추천 테마 (Categories)', value: 'topic' },
        new inquirer.Separator(),
        { name: '🔙 종료', value: 'quit' }
      ]
    }
  ]);

  if (mode === 'quit') {
    console.log(chalk.gray('음악 플레이어를 종료합니다.'));
    return;
  }

  if (mode === 'song') await handleSearch('song');
  else if (mode === 'artist') await handleSearch('artist');
  else if (mode === 'topic') await handleTopic();
};

// 🔍 검색 로직 (노래 vs 가수)
const handleSearch = async (type) => {
  const label = type === 'song' ? '노래 제목' : '가수 이름';
  
  const { keyword } = await inquirer.prompt([
    {
      type: 'input',
      name: 'keyword',
      message: `${label}을 입력하세요:`,
      validate: (input) => input ? true : '검색어를 입력해야 합니다.'
    }
  ]);

  // 가수로 검색할 때는 뒤에 'playlist'나 'best songs'를 붙여서 정확도 높임
  const searchQuery = type === 'artist' ? `${keyword} best songs playlist` : keyword;
  
  await searchAndPlay(searchQuery);
};

// 💿 테마 선택 로직
const handleTopic = async () => {
  const { selectedQuery } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedQuery',
      message: '어떤 분위기의 노래를 틀까요?',
      choices: [
        ...TOPICS.map(t => ({ name: t.name, value: t.query })),
        new inquirer.Separator(),
        { name: '🔙 뒤로 가기', value: 'back' }
      ]
    }
  ]);

  if (selectedQuery === 'back') return mainMenu();
  await searchAndPlay(selectedQuery);
};

// ⚙️ 공통: 검색 및 재생 실행
const searchAndPlay = async (query) => {
  const spinner = ora(`'${query}' 찾는 중...`).start();
  
  try {
    const r = await yts(query);
    // 비디오만 필터링 (라이브 스트림 포함)
    const videos = r.videos.slice(0, 10);
    spinner.stop();

    if (videos.length === 0) {
      console.log(chalk.red('❌ 검색 결과가 없습니다.'));
      return mainMenu();
    }

    // 결과 목록 보여주기
    const choices = videos.map(v => ({
      name: `${chalk.bold(v.title)} - ${chalk.dim(v.author.name)} (${v.timestamp})`,
      value: v.videoId
    }));
    choices.push(new inquirer.Separator());
    choices.push({ name: '🔙 메뉴로 돌아가기', value: 'back' });

    const { videoId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'videoId',
        message: '재생할 항목을 선택하세요:',
        choices: choices,
        loop: false,
        pageSize: 12
      }
    ]);

    if (videoId === 'back') return mainMenu();

    // 재생 시작
    const selected = videos.find(v => v.videoId === videoId);
    await playWithMpv(videoId, selected);

  } catch (e) {
    spinner.fail('검색 중 오류 발생');
    console.error(e);
    await mainMenu();
  }
};

// 🔊 MPV 재생기
const playWithMpv = async (videoId, meta) => {
  console.clear();
  console.log(chalk.bgMagenta.white.bold(` 🔊 Now Playing `));
  console.log(chalk.yellow(`Title : ${meta.title}`));
  console.log(chalk.yellow(`Artist: ${meta.author.name}`));
  console.log(chalk.cyan(`Time  : ${meta.timestamp}`));
  console.log(chalk.dim('\n[조작법] Space: 일시정지 | ←/→: 탐색 | 9/0: 볼륨 | q: 끄기\n'));

  return new Promise((resolve) => {
    const player = spawn('mpv', [
      '--no-video',
      `https://www.youtube.com/watch?v=${videoId}`
    ], { stdio: 'inherit' });

    player.on('close', () => {
      console.log(chalk.gray('\n재생이 종료되었습니다.'));
      resolve();
    });
  }).then(() => mainMenu()); // 재생 끝나면 다시 메인 메뉴로
};