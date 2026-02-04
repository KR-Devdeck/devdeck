import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import os from 'os';
import { spawn } from 'child_process';
import ora from 'ora';

// 데이터 저장 경로
const DATA_DIR = path.join(os.homedir(), '.devdeck');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlists.json');

// 초기화
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PLAYLIST_FILE)) fs.writeFileSync(PLAYLIST_FILE, JSON.stringify({}), 'utf8');

const getPlaylists = () => JSON.parse(fs.readFileSync(PLAYLIST_FILE, 'utf8'));
const savePlaylists = (data) => fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(data, null, 2), 'utf8');

export const managePlaylists = async (player) => {
  while (true) {
    const playlists = getPlaylists();
    const listNames = Object.keys(playlists);

    console.clear();
    console.log(chalk.cyan.bold('\n  📂 플레이리스트 관리 (Playlist Manager)'));
    console.log(chalk.gray('  ──────────────────────────────────────'));
    
    if (player.queue.length > 0) {
      console.log(`  현재 대기열: ${chalk.yellow(player.queue.length)}곡 대기 중`);
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: '작업을 선택하세요:',
      choices: [
        { name: '📥 가져오기 (Import)', value: 'import_menu' },
        { name: '💾 내보내기/저장 (Save)', value: 'save' },
        { name: '🗑️ 삭제 (Delete)', value: 'delete' },
        new inquirer.Separator(),
        { name: '🔙 메인으로', value: 'back' }
      ]
    }]);

    if (action === 'back') break;

    try {
      if (action === 'import_menu') {
        while (true) {
          console.clear();
          console.log(chalk.cyan.bold('\n  📥 플레이리스트 가져오기 (Import)'));
          console.log(chalk.gray('  ───────────────────────────────'));

          const { importType } = await inquirer.prompt([{
            type: 'list',
            name: 'importType',
            message: '방법을 선택하세요:',
            choices: [
              { name: '📂 내 저장소에서 선택 (Local File)', value: 'local' },
              { name: '🔍 유튜브 검색으로 가져오기 (Search Playlist)', value: 'search' },
              { name: '🔗 유튜브 링크 입력 (Paste URL)', value: 'url' },
              new inquirer.Separator(),
              { name: '🔙 뒤로 가기', value: 'back' }
            ]
          }]);

          if (importType === 'back') break;

          // 1-1. Local
          if (importType === 'local') {
            if (listNames.length === 0) {
              console.log(chalk.yellow('\n  📭 저장된 플레이리스트가 없습니다.'));
              await pause(1000);
              continue;
            }
            const { selectedList } = await inquirer.prompt([{
              type: 'list',
              name: 'selectedList',
              message: '불러올 목록 선택:',
              choices: [...listNames, new inquirer.Separator(), { name: '🔙 취소', value: 'cancel' }]
            }]);
            if (selectedList === 'cancel') continue;
            await addToQueue(player, playlists[selectedList]);
          } 

          // 1-2. Search (페이지네이션 & UI 개선 적용)
          else if (importType === 'search') {
            const { query } = await inquirer.prompt([{
              type: 'input',
              name: 'query',
              message: '검색어 (예: lofi, pop, jazz):',
              validate: (input) => input.trim() ? true : '검색어를 입력해주세요.'
            }]);

            const spinner = ora(chalk.cyan('유튜브 재생목록 검색 중...')).start();
            let allItems = [];
            try {
              // 50개를 미리 가져와서 로컬에서 페이징 처리
              allItems = await runYtSearchForPlaylists(query, 50);
              spinner.stop();
            } catch (e) {
              spinner.stop();
              console.log(chalk.red('\n  🚫 검색 실패.'));
              await pause(1000);
              continue;
            }

            if (allItems.length === 0) {
              console.log(chalk.red('\n  ❌ 검색된 재생목록이 없습니다.'));
              await pause(1000);
              continue;
            }

            // 📄 페이지네이션 로직 시작
            let currentPage = 0;
            const pageSize = 7;

            while (true) {
              const startIdx = currentPage * pageSize;
              const currentItems = allItems.slice(startIdx, startIdx + pageSize);
              const totalPages = Math.ceil(allItems.length / pageSize);

              // 메뉴 구성
              const choices = [];

              // [이전 페이지]
              if (currentPage > 0) {
                choices.push({ name: chalk.cyan('⏪  이전 페이지 (Prev)'), value: 'PREV_PAGE' });
                choices.push(new inquirer.Separator());
              }

              // 목록 아이템 매핑
              currentItems.forEach(p => {
                // 데이터 정제 (없으면 빈 문자열)
                const countStr = (p.count && p.count !== 'NA' && p.count !== '?') ? chalk.yellow(`(${p.count}곡)`) : '';
                const authorStr = (p.author && p.author !== 'Unknown' && p.author !== 'NA') ? chalk.gray(`- ${p.author}`) : '';
                
                // 깔끔하게 조합
                choices.push({
                  name: `${chalk.bold(p.title)} ${countStr} ${authorStr}`,
                  value: p
                });
              });

              // [다음 페이지]
              if (currentPage < totalPages - 1) {
                choices.push(new inquirer.Separator());
                choices.push({ name: chalk.cyan('⏩  다음 페이지 (Next)'), value: 'NEXT_PAGE' });
              }

              // [취소]는 항상 맨 아래에
              choices.push(new inquirer.Separator());
              choices.push({ name: '🔙 검색 취소', value: 'cancel' });

              const { selectedPlaylist } = await inquirer.prompt([{
                type: 'list',
                name: 'selectedPlaylist',
                message: `가져올 목록 선택 (${currentPage + 1}/${totalPages}):`,
                choices: choices,
                pageSize: 12,
                loop: false
              }]);

              // 페이지 이동 처리
              if (selectedPlaylist === 'NEXT_PAGE') {
                currentPage++;
                continue;
              }
              if (selectedPlaylist === 'PREV_PAGE') {
                currentPage--;
                continue;
              }
              if (selectedPlaylist === 'cancel') break; // 검색 루프 탈출

              // ✅ 선택 완료 -> 저장 로직 실행
              const fetchSpinner = ora(chalk.cyan(`'${selectedPlaylist.title}' 목록 가져오는 중...`)).start();
              try {
                const importedSongs = await fetchPlaylistFromUrl(selectedPlaylist.url);
                fetchSpinner.stop();

                if (importedSongs.length === 0) {
                  console.log(chalk.red('\n  ❌ 곡을 찾을 수 없습니다.'));
                } else {
                  const currentPlaylists = getPlaylists();
                  let saveName = selectedPlaylist.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 20).trim();
                  if (currentPlaylists[saveName]) saveName += `_${Math.floor(Math.random()*100)}`;
                  
                  currentPlaylists[saveName] = importedSongs;
                  savePlaylists(currentPlaylists);
                  
                  console.log(chalk.green(`\n  ✅ '${saveName}'에 ${importedSongs.length}곡 저장 완료!`));
                  
                  const { playNow } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'playNow',
                    message: '지금 바로 재생할까요?',
                    default: true
                  }]);

                  if (playNow) await addToQueue(player, importedSongs);
                }
              } catch (e) {
                fetchSpinner.stop();
                console.log(chalk.red(`\n  🚫 목록 로드 실패: ${e.message}`));
              }
              await pause(1500);
              break; // 작업 완료 후 검색 루프 탈출
            }
          }
          
          // 1-3. URL
          else if (importType === 'url') {
            const { url } = await inquirer.prompt([{
              type: 'input',
              name: 'url',
              message: `유튜브 URL을 입력하세요 ${chalk.gray("(취소하려면 'back' 입력)")}:`,
              validate: (input) => {
                if (input.trim() === 'back') return true;
                return input.includes('http') ? true : '유효한 주소가 아닙니다.';
              }
            }]);

            if (url.trim() === 'back') continue;

            const { name } = await inquirer.prompt([{
              type: 'input',
              name: 'name',
              message: '저장할 플레이리스트 이름:',
              validate: (input) => input.trim() ? true : '이름을 입력해주세요.'
            }]);

            const spinner = ora(chalk.cyan('링크 분석 중...')).start();
            try {
              const importedSongs = await fetchPlaylistFromUrl(url);
              spinner.stop();

              if (importedSongs.length === 0) {
                console.log(chalk.red('\n  ❌ 정보를 가져올 수 없습니다.'));
              } else {
                const currentPlaylists = getPlaylists();
                currentPlaylists[name] = importedSongs;
                savePlaylists(currentPlaylists);
                
                console.log(chalk.green(`\n  ✅ ${importedSongs.length}곡 저장 완료.`));
                
                const { playNow } = await inquirer.prompt([{
                  type: 'confirm',
                  name: 'playNow',
                  message: '지금 대기열에 추가할까요?',
                  default: true
                }]);

                if (playNow) await addToQueue(player, importedSongs);
              }
            } catch (e) {
              spinner.stop();
              console.log(chalk.red(`\n  🚫 실패: ${e.message}`));
            }
            await pause(1500);
          }
        }
      }

      // Save, Delete 등 나머지 메뉴는 동일
      else if (action === 'save') {
        if (player.queue.length === 0) {
          console.log(chalk.red('\n  ❌ 저장할 노래가 없습니다.'));
          await pause(1000);
          continue;
        }
        
        const { name } = await inquirer.prompt([{
          type: 'input',
          name: 'name',
          message: '저장할 이름 입력:',
          validate: (input) => input.trim() ? true : '이름을 입력해주세요.'
        }]);

        if (playlists[name]) {
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `⚠️ '${name}' 목록이 이미 존재합니다. 덮어쓸까요?`,
            default: false
          }]);
          if (!overwrite) continue;
        }

        playlists[name] = player.queue;
        savePlaylists(playlists);
        console.log(chalk.green(`\n  ✅ 저장 완료!`));
        await pause(1000);
      } 

      else if (action === 'delete') {
        if (listNames.length === 0) {
          console.log(chalk.yellow('\n  📭 삭제할 목록이 없습니다.'));
          await pause(1000);
          continue;
        }
        const { listToDelete } = await inquirer.prompt([{
          type: 'list',
          name: 'listToDelete',
          message: '삭제할 목록 선택:',
          choices: [...listNames, new inquirer.Separator(), { name: '🔙 취소', value: 'cancel' }]
        }]);
        if (listToDelete === 'cancel') continue;

        delete playlists[listToDelete];
        savePlaylists(playlists);
        console.log(chalk.green(`\n  🗑️ 삭제 완료.`));
        await pause(1000);
      }
    } catch (e) {
      console.log(chalk.red(`\n  🚫 오류: ${e.message}`));
      await pause(1500);
    }
  }
};

const addToQueue = async (player, songs) => {
  if (player.queue.length > 0) {
    const { loadMode } = await inquirer.prompt([{
      type: 'list',
      name: 'loadMode',
      message: '대기열 처리 방식:',
      choices: [
        { name: '🗑️  기존 목록 비우고 덮어쓰기 (Replace)', value: 'replace' },
        { name: '➕  뒤에 추가하기 (Append)', value: 'append' },
        new inquirer.Separator(),
        { name: '🔙  취소', value: 'cancel' }
      ]
    }]);

    if (loadMode === 'cancel') return;
    if (loadMode === 'replace') {
      player.queue = [];
      console.log(chalk.yellow('  🧹 대기열 비움.'));
    }
  }
  songs.forEach(song => player.add(song));
  console.log(chalk.green(`\n  ✅ ${songs.length}곡이 추가되었습니다.`));
  await pause(1000);
};

// 🔍 유튜브 검색 -> 재생목록 추출 (50개)
const runYtSearchForPlaylists = (query, limit) => {
  return new Promise((resolve, reject) => {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAw%253D%253D`;

    const args = [
      searchUrl,
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--playlist-end', String(limit)
    ];

    const child = spawn('yt-dlp', args);
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    
    child.on('close', () => {
      const output = Buffer.concat(chunks).toString('utf8');
      const results = output.trim().split('\n')
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(i => i && i.url && i.title)
        .map(i => ({
          title: i.title,
          url: i.url,
          // 💡 [중요] 데이터가 없으면 확실하게 null 처리
          count: (i.playlist_count && i.playlist_count !== 'NA') ? i.playlist_count : null,
          author: (i.uploader || i.channel) || null
        }));
      resolve(results);
    });
    child.on('error', (err) => reject(err));
  });
};

const fetchPlaylistFromUrl = (url) => {
  return new Promise((resolve, reject) => {
    const args = ['--dump-json', '--flat-playlist', '--no-warnings', url];
    const child = spawn('yt-dlp', args);
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error('URL이 올바르지 않습니다.'));
      const output = Buffer.concat(chunks).toString('utf8');
      const results = output.trim().split('\n')
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(i => i && i.id && i.title)
        .map(i => ({
          title: i.title,
          videoId: i.id,
          duration: i.duration || 0,
          author: { name: i.uploader || 'Playlist' }
        }));
      resolve(results);
    });
    child.on('error', (err) => reject(err));
  });
};

const pause = (ms) => new Promise(r => setTimeout(r, ms));