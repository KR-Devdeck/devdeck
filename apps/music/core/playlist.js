import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import os from 'os';
import { spawn } from 'child_process';
import ora from 'ora';
import { getConfig } from '../../core/config.js';

// 데이터 저장 경로
const DATA_DIR = path.join(os.homedir(), '.devdeck');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlists.json');
const T = (key, vars = {}) => {
  const lang = getConfig().language || 'ko';
  const m = {
    title: { ko: '\n  📂 플레이리스트 관리 (Playlist Manager)', en: '\n  📂 Playlist Manager', ja: '\n  📂 プレイリスト管理', 'zh-CN': '\n  📂 播放列表管理' },
    choose: { ko: '작업을 선택하세요:', en: 'Select action:', ja: '操作を選択:', 'zh-CN': '请选择操作:' },
    back_main: { ko: '🔙 메인으로', en: '🔙 Back to main', ja: '🔙 メインへ', 'zh-CN': '🔙 返回主菜单' },
    no_saved: { ko: '\n  📭 저장된 플레이리스트가 없습니다.', en: '\n  📭 No saved playlists.', ja: '\n  📭 保存済みプレイリストがありません。', 'zh-CN': '\n  📭 没有已保存的播放列表。' },
    search_need_query: { ko: '검색어를 입력해주세요.', en: 'Please enter a query.', ja: '検索語を入力してください。', 'zh-CN': '请输入搜索词。' },
    search_fail: { ko: '\n  🚫 검색 실패.', en: '\n  🚫 Search failed.', ja: '\n  🚫 検索失敗。', 'zh-CN': '\n  🚫 搜索失败。' },
    no_playlist_found: { ko: '\n  ❌ 검색된 재생목록이 없습니다.', en: '\n  ❌ No playlists found.', ja: '\n  ❌ プレイリストが見つかりません。', 'zh-CN': '\n  ❌ 未找到播放列表。' },
    no_tracks: { ko: '\n  ❌ 곡을 찾을 수 없습니다.', en: '\n  ❌ No tracks found.', ja: '\n  ❌ 曲が見つかりません。', 'zh-CN': '\n  ❌ 未找到歌曲。' },
    load_fail: { ko: '\n  🚫 목록 로드 실패: {v}', en: '\n  🚫 Failed to load playlist: {v}', ja: '\n  🚫 プレイリスト読込失敗: {v}', 'zh-CN': '\n  🚫 加载播放列表失败: {v}' },
    invalid_url: { ko: '유효한 주소가 아닙니다.', en: 'Invalid URL.', ja: '無効なURLです。', 'zh-CN': '无效地址。' },
    need_name: { ko: '이름을 입력해주세요.', en: 'Please enter a name.', ja: '名前を入力してください。', 'zh-CN': '请输入名称。' },
    fetch_fail: { ko: '\n  🚫 실패: {v}', en: '\n  🚫 Failed: {v}', ja: '\n  🚫 失敗: {v}', 'zh-CN': '\n  🚫 失败: {v}' },
    no_song_to_save: { ko: '\n  ❌ 저장할 노래가 없습니다.', en: '\n  ❌ No songs to save.', ja: '\n  ❌ 保存する曲がありません。', 'zh-CN': '\n  ❌ 没有可保存歌曲。' },
    no_list_to_delete: { ko: '\n  📭 삭제할 목록이 없습니다.', en: '\n  📭 No playlists to delete.', ja: '\n  📭 削除するリストがありません。', 'zh-CN': '\n  📭 没有可删除列表。' },
    error: { ko: '\n  🚫 오류: {v}', en: '\n  🚫 Error: {v}', ja: '\n  🚫 エラー: {v}', 'zh-CN': '\n  🚫 错误: {v}' },
    queue_mode: { ko: '대기열 처리 방식:', en: 'Queue handling mode:', ja: 'キュー処理モード:', 'zh-CN': '队列处理方式:' },
    queue_now: { ko: '  현재 대기열: {v}곡 대기 중', en: '  Current queue: {v} tracks', ja: '  現在のキュー: {v}曲', 'zh-CN': '  当前队列: {v} 首' },
    menu_import: { ko: '📥 가져오기 (Import)', en: '📥 Import', ja: '📥 インポート', 'zh-CN': '📥 导入' },
    menu_save: { ko: '💾 내보내기/저장 (Save)', en: '💾 Save', ja: '💾 保存', 'zh-CN': '💾 保存' },
    menu_delete: { ko: '🗑️ 삭제 (Delete)', en: '🗑️ Delete', ja: '🗑️ 削除', 'zh-CN': '🗑️ 删除' },
    import_title: { ko: '\n  📥 플레이리스트 가져오기 (Import)', en: '\n  📥 Import Playlist', ja: '\n  📥 プレイリストをインポート', 'zh-CN': '\n  📥 导入播放列表' },
    import_choose: { ko: '방법을 선택하세요:', en: 'Select import method:', ja: '方法を選択:', 'zh-CN': '请选择导入方式:' },
    import_local: { ko: '📂 내 저장소에서 선택 (Local File)', en: '📂 From local saved playlists', ja: '📂 ローカル保存から選択', 'zh-CN': '📂 从本地保存中选择' },
    import_search: { ko: '🔍 유튜브 검색으로 가져오기 (Search Playlist)', en: '🔍 Search YouTube playlists', ja: '🔍 YouTube 検索で取得', 'zh-CN': '🔍 通过 YouTube 搜索导入' },
    import_url: { ko: '🔗 유튜브 링크 입력 (Paste URL)', en: '🔗 Paste YouTube URL', ja: '🔗 YouTube URL を入力', 'zh-CN': '🔗 粘贴 YouTube 链接' },
    import_back: { ko: '🔙 뒤로 가기', en: '🔙 Back', ja: '🔙 戻る', 'zh-CN': '🔙 返回' },
    select_list: { ko: '불러올 목록 선택:', en: 'Select playlist to load:', ja: '読み込むリストを選択:', 'zh-CN': '选择要加载的列表:' },
    cancel: { ko: '🔙 취소', en: '🔙 Cancel', ja: '🔙 キャンセル', 'zh-CN': '🔙 取消' },
    search_prompt: { ko: '검색어 (예: lofi, pop, jazz):', en: 'Search query (e.g. lofi, pop, jazz):', ja: '検索語 (例: lofi, pop, jazz):', 'zh-CN': '搜索词（例如 lofi, pop, jazz）:' },
    searching_playlist: { ko: '유튜브 재생목록 검색 중...', en: 'Searching YouTube playlists...', ja: 'YouTube プレイリストを検索中...', 'zh-CN': '正在搜索 YouTube 播放列表...' },
    prev_page: { ko: '⏪  이전 페이지 (Prev)', en: '⏪  Previous page', ja: '⏪  前のページ', 'zh-CN': '⏪  上一页' },
    next_page: { ko: '⏩  다음 페이지 (Next)', en: '⏩  Next page', ja: '⏩  次のページ', 'zh-CN': '⏩  下一页' },
    cancel_search: { ko: '🔙 검색 취소', en: '🔙 Cancel search', ja: '🔙 検索をキャンセル', 'zh-CN': '🔙 取消搜索' },
    select_import_page: { ko: '가져올 목록 선택 ({p}/{t}):', en: 'Select playlist to import ({p}/{t}):', ja: '取り込むリストを選択 ({p}/{t}):', 'zh-CN': '选择要导入的列表 ({p}/{t}):' },
    fetching_tracks: { ko: "'{v}' 목록 가져오는 중...", en: "Loading playlist '{v}'...", ja: "'{v}' の内容を取得中...", 'zh-CN': "正在获取 '{v}' 列表..." },
    saved_named: { ko: "\n  ✅ '{n}'에 {c}곡 저장 완료!", en: "\n  ✅ Saved {c} tracks to '{n}'!", ja: "\n  ✅ '{n}' に {c}曲を保存しました!", 'zh-CN': "\n  ✅ 已将 {c} 首保存到 '{n}'!" },
    play_now_confirm: { ko: '지금 바로 재생할까요?', en: 'Play now?', ja: '今すぐ再生しますか?', 'zh-CN': '现在立即播放吗?' },
    paste_url_prompt: { ko: "유튜브 URL을 입력하세요 (취소하려면 'back' 입력):", en: "Enter YouTube URL (type 'back' to cancel):", ja: "YouTube URL を入力 ('back' でキャンセル):", 'zh-CN': "输入 YouTube URL（输入 'back' 取消）:" },
    save_playlist_name: { ko: '저장할 플레이리스트 이름:', en: 'Playlist name to save:', ja: '保存するプレイリスト名:', 'zh-CN': '要保存的播放列表名称:' },
    analyzing_link: { ko: '링크 분석 중...', en: 'Analyzing link...', ja: 'リンク解析中...', 'zh-CN': '正在分析链接...' },
    no_info_from_url: { ko: '\n  ❌ 정보를 가져올 수 없습니다.', en: '\n  ❌ Could not fetch playlist info.', ja: '\n  ❌ 情報を取得できません。', 'zh-CN': '\n  ❌ 无法获取信息。' },
    saved_count: { ko: '\n  ✅ {c}곡 저장 완료.', en: '\n  ✅ Saved {c} tracks.', ja: '\n  ✅ {c}曲を保存しました。', 'zh-CN': '\n  ✅ 已保存 {c} 首。' },
    add_queue_confirm: { ko: '지금 대기열에 추가할까요?', en: 'Add to queue now?', ja: '今キューに追加しますか?', 'zh-CN': '现在加入队列吗?' },
    save_name_input: { ko: '저장할 이름 입력:', en: 'Enter name to save:', ja: '保存名を入力:', 'zh-CN': '输入保存名称:' },
    overwrite_confirm: { ko: "⚠️ '{n}' 목록이 이미 존재합니다. 덮어쓸까요?", en: "⚠️ Playlist '{n}' already exists. Overwrite?", ja: "⚠️ '{n}' は既に存在します。上書きしますか?", 'zh-CN': "⚠️ 列表 '{n}' 已存在，是否覆盖?" },
    save_done: { ko: '\n  ✅ 저장 완료!', en: '\n  ✅ Saved successfully!', ja: '\n  ✅ 保存完了!', 'zh-CN': '\n  ✅ 保存成功!' },
    select_delete: { ko: '삭제할 목록 선택:', en: 'Select playlist to delete:', ja: '削除するリストを選択:', 'zh-CN': '选择要删除的列表:' },
    delete_done: { ko: '\n  🗑️ 삭제 완료.', en: '\n  🗑️ Deleted.', ja: '\n  🗑️ 削除しました。', 'zh-CN': '\n  🗑️ 已删除。' },
    queue_replace: { ko: '🗑️  기존 목록 비우고 덮어쓰기 (Replace)', en: '🗑️  Replace queue', ja: '🗑️  既存キューを置換', 'zh-CN': '🗑️  清空并替换队列' },
    queue_append: { ko: '➕  뒤에 추가하기 (Append)', en: '➕  Append to queue', ja: '➕  キュー末尾に追加', 'zh-CN': '➕  追加到队列末尾' },
    queue_cancel: { ko: '🔙  취소', en: '🔙  Cancel', ja: '🔙  キャンセル', 'zh-CN': '🔙  取消' },
    queue_cleared: { ko: '  🧹 대기열 비움.', en: '  🧹 Queue cleared.', ja: '  🧹 キューをクリアしました。', 'zh-CN': '  🧹 队列已清空。' },
    queue_added: { ko: '\n  ✅ {c}곡이 추가되었습니다.', en: '\n  ✅ Added {c} tracks.', ja: '\n  ✅ {c}曲を追加しました。', 'zh-CN': '\n  ✅ 已添加 {c} 首。' },
    invalid_url_error: { ko: 'URL이 올바르지 않습니다.', en: 'Invalid URL.', ja: 'URL が正しくありません。', 'zh-CN': 'URL 无效。' }
  };
  const raw = (m[key]?.[lang] ?? m[key]?.ko ?? key);
  return Object.entries(vars).reduce((a,[k,v])=>a.replaceAll(`{${k}}`, String(v)), raw);
};

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
    console.log(chalk.cyan.bold(T('title')));
    console.log(chalk.gray('  ──────────────────────────────────────'));
    
    if (player.queue.length > 0) {
      console.log(T('queue_now', { v: chalk.yellow(player.queue.length) }));
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: T('choose'),
      loop: false,
      choices: [
        { name: T('menu_import'), value: 'import_menu' },
        { name: T('menu_save'), value: 'save' },
        { name: T('menu_delete'), value: 'delete' },
        new inquirer.Separator(),
        { name: T('back_main'), value: 'back' }
      ]
    }]);

    if (action === 'back') break;

    try {
      if (action === 'import_menu') {
        while (true) {
          console.clear();
          console.log(chalk.cyan.bold(T('import_title')));
          console.log(chalk.gray('  ───────────────────────────────'));

          const { importType } = await inquirer.prompt([{
            type: 'list',
            name: 'importType',
            message: T('import_choose'),
            loop: false,
            choices: [
              { name: T('import_local'), value: 'local' },
              { name: T('import_search'), value: 'search' },
              { name: T('import_url'), value: 'url' },
              new inquirer.Separator(),
              { name: T('import_back'), value: 'back' }
            ]
          }]);

          if (importType === 'back') break;

          // 1-1. Local
          if (importType === 'local') {
            if (listNames.length === 0) {
              console.log(chalk.yellow(T('no_saved')));
              await pause(1000);
              continue;
            }
            const { selectedList } = await inquirer.prompt([{
              type: 'list',
              name: 'selectedList',
              message: T('select_list'),
              loop: false,
              choices: [...listNames, new inquirer.Separator(), { name: T('cancel'), value: 'cancel' }]
            }]);
            if (selectedList === 'cancel') continue;
            await addToQueue(player, playlists[selectedList]);
          } 

          // 1-2. Search (페이지네이션 & UI 개선 적용)
          else if (importType === 'search') {
            const { query } = await inquirer.prompt([{
              type: 'input',
              name: 'query',
              message: T('search_prompt'),
              validate: (input) => input.trim() ? true : T('search_need_query')
            }]);

            const spinner = ora(chalk.cyan(T('searching_playlist'))).start();
            let allItems = [];
            try {
              // 50개를 미리 가져와서 로컬에서 페이징 처리
              allItems = await runYtSearchForPlaylists(query, 50);
              spinner.stop();
            } catch (e) {
              spinner.stop();
              console.log(chalk.red(T('search_fail')));
              await pause(1000);
              continue;
            }

            if (allItems.length === 0) {
              console.log(chalk.red(T('no_playlist_found')));
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
                choices.push({ name: chalk.cyan(T('prev_page')), value: 'PREV_PAGE' });
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
                choices.push({ name: chalk.cyan(T('next_page')), value: 'NEXT_PAGE' });
              }

              // [취소]는 항상 맨 아래에
              choices.push(new inquirer.Separator());
              choices.push({ name: T('cancel_search'), value: 'cancel' });

              const { selectedPlaylist } = await inquirer.prompt([{
                type: 'list',
                name: 'selectedPlaylist',
                message: T('select_import_page', { p: currentPage + 1, t: totalPages }),
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
              const fetchSpinner = ora(chalk.cyan(T('fetching_tracks', { v: selectedPlaylist.title }))).start();
              try {
                const importedSongs = await fetchPlaylistFromUrl(selectedPlaylist.url);
                fetchSpinner.stop();

                if (importedSongs.length === 0) {
                  console.log(chalk.red(T('no_tracks')));
                } else {
                  const currentPlaylists = getPlaylists();
                  let saveName = selectedPlaylist.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 20).trim();
                  if (currentPlaylists[saveName]) saveName += `_${Math.floor(Math.random()*100)}`;
                  
                  currentPlaylists[saveName] = importedSongs;
                  savePlaylists(currentPlaylists);
                  
                  console.log(chalk.green(T('saved_named', { n: saveName, c: importedSongs.length })));
                  
                  const { playNow } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'playNow',
                    message: T('play_now_confirm'),
                    default: true
                  }]);

                  if (playNow) await addToQueue(player, importedSongs);
                }
              } catch (e) {
                fetchSpinner.stop();
                console.log(chalk.red(T('load_fail', { v: e.message })));
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
              message: T('paste_url_prompt'),
              validate: (input) => {
                if (input.trim() === 'back') return true;
                return input.includes('http') ? true : T('invalid_url');
              }
            }]);

            if (url.trim() === 'back') continue;

            const { name } = await inquirer.prompt([{
              type: 'input',
              name: 'name',
              message: T('save_playlist_name'),
              validate: (input) => input.trim() ? true : T('need_name')
            }]);

            const spinner = ora(chalk.cyan(T('analyzing_link'))).start();
            try {
              const importedSongs = await fetchPlaylistFromUrl(url);
              spinner.stop();

              if (importedSongs.length === 0) {
                console.log(chalk.red(T('no_info_from_url')));
              } else {
                const currentPlaylists = getPlaylists();
                currentPlaylists[name] = importedSongs;
                savePlaylists(currentPlaylists);
                
                console.log(chalk.green(T('saved_count', { c: importedSongs.length })));
                
                const { playNow } = await inquirer.prompt([{
                  type: 'confirm',
                  name: 'playNow',
                  message: T('add_queue_confirm'),
                  default: true
                }]);

                if (playNow) await addToQueue(player, importedSongs);
              }
            } catch (e) {
              spinner.stop();
              console.log(chalk.red(T('fetch_fail', { v: e.message })));
            }
            await pause(1500);
          }
        }
      }

      // Save, Delete 등 나머지 메뉴는 동일
      else if (action === 'save') {
        if (player.queue.length === 0) {
          console.log(chalk.red(T('no_song_to_save')));
          await pause(1000);
          continue;
        }
        
        const { name } = await inquirer.prompt([{
          type: 'input',
          name: 'name',
          message: T('save_name_input'),
          validate: (input) => input.trim() ? true : T('need_name')
        }]);

        if (playlists[name]) {
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: T('overwrite_confirm', { n: name }),
            default: false
          }]);
          if (!overwrite) continue;
        }

        playlists[name] = player.queue;
        savePlaylists(playlists);
        console.log(chalk.green(T('save_done')));
        await pause(1000);
      } 

      else if (action === 'delete') {
        if (listNames.length === 0) {
          console.log(chalk.yellow(T('no_list_to_delete')));
          await pause(1000);
          continue;
        }
        const { listToDelete } = await inquirer.prompt([{
          type: 'list',
          name: 'listToDelete',
          message: T('select_delete'),
          loop: false,
          choices: [...listNames, new inquirer.Separator(), { name: T('cancel'), value: 'cancel' }]
        }]);
        if (listToDelete === 'cancel') continue;

        delete playlists[listToDelete];
        savePlaylists(playlists);
        console.log(chalk.green(T('delete_done')));
        await pause(1000);
      }
    } catch (e) {
      console.log(chalk.red(T('error', { v: e.message })));
      await pause(1500);
    }
  }
};

const addToQueue = async (player, songs) => {
  if (player.queue.length > 0) {
    const { loadMode } = await inquirer.prompt([{
      type: 'list',
      name: 'loadMode',
      message: T('queue_mode'),
      loop: false,
      choices: [
        { name: T('queue_replace'), value: 'replace' },
        { name: T('queue_append'), value: 'append' },
        new inquirer.Separator(),
        { name: T('queue_cancel'), value: 'cancel' }
      ]
    }]);

    if (loadMode === 'cancel') return;
    if (loadMode === 'replace') {
      player.queue = [];
      console.log(chalk.yellow(T('queue_cleared')));
    }
  }
  songs.forEach(song => player.add(song));
  console.log(chalk.green(T('queue_added', { c: songs.length })));
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
      if (code !== 0) return reject(new Error(T('invalid_url_error')));
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
