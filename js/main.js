// ========================================
// Global Variables（ゲーム全体で使う変数）
// ========================================
let requestID;       // requestAnimationFrameのID（アニメーション停止用）
let holdPiece = null; // ホールドしているミノのデータ（最初は空）
let holdUsed = false; // 「そのターンでホールドを既に使ったか」のフラグ
let nextQueue = [];   // 次に出現するミノのリスト
let isGameOver = false; // ゲームオーバー状態かどうかのフラグ
let screenShakeIntensity = 0; // 画面揺れの強度
let screenShakeDuration = 0;  // 画面揺れの残り時間
let flashySquares = []; // ライン消去時などに光るマスのリスト

// =================================
// UI Elements（画面上の要素の取得）
// =================================
const startScreen = document.getElementById('start-screen');     // スタート画面
const gameArea = document.getElementById('game-area');           // ゲームプレイ画面
const gameOverScreen = document.getElementById('gameover-screen'); // ゲームオーバー画面
const finalScoreElem = document.getElementById('final-score');   // 最終スコア表示用

// ボタンクリック時のイベントリスナーを設定
document.getElementById('retry-btn').onclick = retryGame;       // リトライボタン
document.getElementById('title-btn').onclick = returnToTitle;   // タイトルへ戻るボタン

// =====================================
// Player Object（プレイヤーの状態管理）
// =====================================
const player = {
  pos: { x: 0, y: 0 },    // 現在の座標
  matrix: null,          // 操作中のミノの形状データ
  score: 0,              // 現在のスコア
  level: 1,              // 現在のレベル
  lines: 0,              // 消したラインの合計数
  combo: -1,             // 連続消去数（コンボ）
  isBackToBack: false,
  rotation: 0,           // 現在の回転方向 (0:上, 1:右, 2:下, 3:左)
  lastAction: 'move',    // T-Spin判定用（最後に何をしたか：moveかrotateか）
  lockDelayCounter: 0,     // 接地してからの経過時間カウント
  lockDelayLimit: 500,     // 接地猶予時間の上限（500ms）
  isTouchingGround: false, // 接地フラグ
  rotateAnim: 0,            // 回転アニメーションの残り角度（ラジアン）
  visualAngle: 0, // 以前のコードがこれを参照している場合のエラー防止
  targetAngle: 0,  // 同上
};

// ================================
// Next Queue（次に来るミノの管理）
// ================================
// ゲーム開始時にNext配列を準備する関数
function initNextQueue() {
  nextQueue = [];
  bag = []; // ガチャの袋を空にする

  // 3つ分先読みしてキューに追加
  for (let i = 0; i < 3; i++) {
    const type = pullNextPiece(); // 袋から1つ取り出す
    nextQueue.push(createPiece(type)); // 形状データにしてリストへ
  }
}

// ==================================
// Hold Functionality（ホールド機能）
// ==================================
function playerHold() {
  if (holdUsed) return; // このターンですでにホールドを使用していたら無効

  if (!holdPiece) {
    // ホールドが空の場合：現在のミノをホールドに入れて、新しいミノを出す
    holdPiece = player.matrix;
    playerReset();
  } else {
    // ホールドがある場合：現在のミノとホールドを交換
    const temp = player.matrix;
    player.matrix = holdPiece;
    holdPiece = temp;

    // 交換したミノの位置をリセット（一番上の真ん中へ）
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
  }

  holdUsed = true; // ホールド済みフラグを立てる
  drawHold(); // ホールド画面を再描画
}

// ===============================
// Collision Detection（衝突判定）
// ===============================
// プレイヤーのミノが盤面の壁やブロックと重なっていないかチェック
function collide(arena, player) {
  const m = player.matrix; // ミノの形
  const o = player.pos;    // ミノの位置

  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      // 1. ミノのブロックがある部分（0以外）かつ
      // 2. 盤面のその位置に既にブロックがある、または盤面外である場合
      if (m[y][x] !== 0 &&
        (arena[y + o.y] &&
          arena[y + o.y][x + o.x]) !== 0) {
        return true; // 衝突している
      }
    }
  }
  return false; // 衝突していない
}

// =======================
// Merge（盤面への固定）
// =======================
// プレイヤーのミノを盤面データ（arena）に書き写す関数
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        // 現在位置に合わせて盤面の座標を計算
        const py = y + player.pos.y;
        const px = x + player.pos.x;
        arena[py][px] = value; // 盤面に色番号を記録

        // 設置エフェクト用のリストに追加（光らせる）
        flashySquares.push({ x: px, y: py, opacity: 1.0 });
      }
    });
  });
}

// ===========================
// Ghost Piece（落下予測位置）
// ===========================
// ゴースト（影）の位置を計算する関数
function getGhostPosition() {
  const ghost = {
    pos: { x: player.pos.x, y: player.pos.y }, // プレイヤーと同じ位置からスタート
    matrix: player.matrix
  };

  // 衝突するまでY座標を増やし続ける（下へ移動）
  while (!collide(arena, ghost)) ghost.pos.y++;
  ghost.pos.y--; // 衝突した位置の一つ上に戻す

  return ghost;
}

// =======================
// Rotation（回転処理）
// =======================
// 回転を試みる関数（SRS：スーパーローテーションシステム対応）
function rotatePlayer(dir) {
  const startRotation = player.rotation; // 回転前の向きを保存
  // 新しい向きを計算（0～3の範囲で循環させる）
  player.rotation = (player.rotation + dir + 4) % 4;

  // まず配列自体を回転させる
  rotate(player.matrix, dir);

  // SRSデータのキーを作成（例: "0-1" は向き0から1への回転）
  const kickKey = `${startRotation}-${player.rotation}`;
  const kicks = wallKickData[kickKey] || [[0, 0]]; // データがなければ補正なし

  // 定義された5つの補正パターンを順番にテストする
  for (let i = 0; i < kicks.length; i++) {
    const [offsetX, offsetY] = kicks[i];
    player.pos.x += offsetX;
    player.pos.y -= offsetY; // SRSデータはY軸が上向き正のため、Canvas用に反転(-offsetY)

    if (!collide(arena, player)) {
      // 衝突しなければ回転成功
      player.lastAction = 'rotate'; // 最後のアクションを「回転」として記録（T-Spin判定用）
      //player.targetAngle += dir * (Math.PI / 2);
      return true;
    }

    // 衝突したら位置を元に戻して次のパターンへ
    player.pos.x -= offsetX;
    player.pos.y += offsetY;
  }

  // すべてのパターンで衝突する場合、回転失敗なので元に戻す
  rotate(player.matrix, -dir); // 逆回転
  player.rotation = startRotation; // 向きを戻す
  return false;
}

// =======================
// Hard Drop（瞬時に落下）
// =======================
function hardDrop() {
  // 衝突するまで下に移動し続ける
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--; // 衝突位置の一つ上に戻す

  // T-Spinかどうかを判定（ハードドロップ前の最後のアクションが回転だった場合のみ）
  const isTSpinAction = (player.lastAction === 'rotate' && isTSpin(player, arena));

  merge(arena, player);       // 盤面に固定
  arenaSweep(isTSpinAction);  // ライン消去判定
  playerReset();              // 次のミノへ

  // 画面を即座に更新（ラグ防止）
  draw();
}

// ===========================
// T-Spin Logic（Tスピン判定）
// ===========================
function isTSpin(player, arena) {
  // 1. まずTミノかどうかチェック（色番号4）
  // player.matrix[1][1]は3x3の中心
  if (player.matrix[1] === undefined || player.matrix[1][1] !== 4) return false;

  const x = player.pos.x;
  const y = player.pos.y;

  // 2. Tミノの四隅の座標を定義（相対位置ではなく絶対座標）
  const corners = [
    [x, y],         // 左上
    [x + 2, y],     // 右上
    [x, y + 2],     // 左下
    [x + 2, y + 2], // 右下
  ];

  let count = 0;

  // 四隅をループしてチェック
  for (const [cx, cy] of corners) {
    // 枠外（壁や床）または 既にブロックがある場所ならカウント
    if (
      cy < 0 || cy >= ROWS ||
      cx < 0 || cx >= COLS ||
      arena[cy][cx] !== 0
    ) {
      count++;
    }
  }

  // 四隅のうち3箇所以上が埋まっていればT-Spin成立
  return count >= 3;
}

// =========================================
// Player Reset（新しいミノの出現処理）
// =========================================
function playerReset() {
  // Next待ち行列の先頭を取り出してプレイヤーにセット
  player.matrix = nextQueue.shift();

  // 補充：新しいミノを一つ抽選してNext行列の末尾に追加
  const nextType = pullNextPiece();
  nextQueue.push(createPiece(nextType));

  drawNext(); // Next表示を更新

  // 新しいミノの向きを初期化（上向き）
  player.rotation = 0;

  // 出現位置を計算（最上段の中央）
  player.pos.y = 0;
  player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);

  holdUsed = false; // ホールド使用フラグをリセット

  // 出現した瞬間に衝突していたらゲームオーバー
  if (collide(arena, player)) gameOver();
}

let bag = []; // 「7-Bag」用のリスト

// 7種類のミノを袋に補充してシャッフルする関数
function refillBag() {
  const pieces = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  bag = pieces.slice(); // 配列をコピー

  // フィッシャー・イェーツのシャッフル（ランダムに混ぜる）
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

// 袋から次のミノを1つ取り出す関数
function pullNextPiece() {
  if (bag.length === 0) refillBag(); // 空なら補充
  return bag.pop(); // 一つ取り出す
}

// ================================
// Game Loop（時間の進行管理）
// ================================
let dropCounter = 0;   // 自然落下までの時間計測用
let dropInterval = 1000; // 自然落下の間隔（ミリ秒）。最初は1秒
let lastTime = 0;      // 前回のフレーム時間

// メインループ関数
function update(time = 0) {
  if (isGameOver) return;
  const delta = time - lastTime;
  lastTime = time;

  // 画面揺れの更新
  if (screenShakeDuration > 0) {
    screenShakeDuration -= delta;
    screenShakeIntensity *= 0.9; // 揺れを徐々に弱くする
  } else {
    screenShakeIntensity = 0;
  }

  dropCounter += delta;
  player.pos.y++;
  const touching = collide(arena, player);
  player.pos.y--;

  if (touching) {
    player.lockDelayCounter += delta;
    if (player.lockDelayCounter >= player.lockDelayLimit) {
      lockPlayer();
    }
  } else {
    player.lockDelayCounter = 0;
    if (dropCounter > dropInterval) {
      player.pos.y++;
      if (collide(arena, player)) {
        player.pos.y--;
        lockPlayer();
      } else {
        // 勝手に落ちた場合は「移動」扱いにする（回転フラグを消す）
        player.lastAction = 'move';
        dropCounter = 0;
      }
    }
  }
  draw();
  requestID = requestAnimationFrame(update);
}
// ミノを固定する処理
function lockPlayer() {
  const isTSpinAction = (player.lastAction === 'rotate' && isTSpin(player, arena));

  if (isTSpinAction) {
    playTSpinSound();
  }

  merge(arena, player);

  // 設置した瞬間に音を鳴らす
  playDropSound();

  arenaSweep(isTSpinAction);
  playerReset();

  player.lockDelayCounter = 0;
  dropCounter = 0;
}
// ================================
// Arena Sweep（ライン消去処理）
// ================================
function arenaSweep(isTSpinAction) {
  let lines = 0;
  let rowsToRemove = [];

  // 1. 揃っている行をチェック
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) continue outer;
    }
    rowsToRemove.push(y);
  }

  // ライン消去も T-Spin もない場合は、コンボをリセットして終了
  if (rowsToRemove.length === 0 && !isTSpinAction) {
    player.combo = -1;
    return;
  }

  const lineCount = rowsToRemove.length;
  const isTetris = lineCount === 4;

  // 公式BtB対象：T-Spin消去（1列以上）または テトリス（4列）
  const isDifficultAction = (isTSpinAction && lineCount > 0) || isTetris;

  // 2. 消去演出と盤面クリア（音と視覚効果）
  if (lineCount > 0) {
    if (isTSpinAction) {
      setTimeout(() => playClearSound(lineCount), 100);
    } else {
      playClearSound(lineCount);
    }
  }

  rowsToRemove.forEach(y => {
    for (let x = 0; x < COLS; x++) {
      const blockColor = colors[arena[y][x]] || "#FFFFFF";
      flashySquares.push({
        x: x, y: y, vx: 0, vy: 0, opacity: 1.5, color: "#FFFFFF", isParticle: false
      });

      if (isTetris) {
        screenShakeIntensity = 0.5;
        screenShakeDuration = 300;
        for (let i = 0; i < 4; i++) {
          flashySquares.push({
            x: x + 0.5, y: y + 0.5,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.8) * 1.5,
            gravity: 0.08, opacity: 1.0, color: blockColor, isParticle: true
          });
        }
      }
      arena[y][x] = 0;
    }
    lines++;
  });

  // 3. 盤面を詰める処理（アニメーション待ち）
  if (lines > 0) {
    setTimeout(() => {
      rowsToRemove.sort((a, b) => a - b).forEach(y => {
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
      });
      draw();
    }, 150);
  }

  // 4. スコア計算とメッセージ組み立て
  let message = "";
  let bonus = 0;
  let isBtoBTriggered = false;

  // --- スコアとメッセージの基本設定 ---
  if (isTSpinAction) {
    if (lines === 0)      { message = "T-SPIN";        bonus = 100; }
    else if (lines === 1) { message = "T-SPIN SINGLE"; bonus = 800; }
    else if (lines === 2) { message = "T-SPIN DOUBLE"; bonus = 1200; }
    else if (lines === 3) { message = "T-SPIN TRIPLE"; bonus = 1600; }

    if (lines > 0 && typeof playTSpinSound === 'function') {
      playTSpinSound();
    }
  } else {
    if (lines === 1)      { message = "SINGLE";  bonus = 100; }
    else if (lines === 2) { message = "DOUBLE";  bonus = 300; }
    else if (lines === 3) { message = "TRIPLE";  bonus = 500; }
    else if (lines === 4) { message = "TETRIS!";  bonus = 800; }
  }

  // --- Back-to-Back 判定 ---
  if (lines > 0) {
    if (isDifficultAction) { // T-Spin消去またはテトリスの場合
      if (player.isBackToBack) {
        bonus = Math.floor(bonus * 1.5); // スコア1.5倍
        message = "B-to-B " + message;
        isBtoBTriggered = true;
      }
      player.isBackToBack = true; 
    } else {
      player.isBackToBack = false; // 普通の消去（Single/Double/Triple）でリセット
    }
  }

  // --- コンボ（REN）計算 ---
  if (lines > 0) {
    // ラインが1列でも消えたらコンボ加算
    player.combo++; 
    if (player.combo > 0) {
      player.score += player.combo * 50 * player.level;
      message += `\n${player.combo} REN!`;
    }
  } else if (!isTSpinAction) {
    // ライン消去もなく、かつT-Spin（0列）でもない場合のみリセット
    // これにより、ライン無しのT-Spinではコンボが維持されます
    player.combo = -1;
  }

  // メッセージ表示と特殊演出
  if (message !== "") {
    const displayColor = isBtoBTriggered ? "#FFD700" : "#FFFFFF"; // BtBなら金色
    showMessage(message, displayColor);

    if (isBtoBTriggered) {
      if (typeof playBackToBackSound === 'function') playBackToBackSound();
      if (typeof flashScreenBorder === 'function') flashScreenBorder();
    }
  }

  // 最終スコア加算とレベルアップ
  player.score += bonus * player.level;
  player.lines += lines;

  if (player.lines >= player.level * 10) {
    player.level++;
    playLevelUpSound();
    dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
    showMessage("LEVEL UP!", "#00FF00"); // レベルアップは緑色
  }

  updateScore();
}

// =======================
// Start Game
// =======================
function startGame() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  isGameOver = false;
  startScreen.style.display = 'none';
  gameArea.style.display = 'flex';

  // 盤面クリア
  arena.forEach(row => row.fill(0));

  // スコアとコンボ（ren）をリセット
  player.score = 0;
  player.combo = -1;
  updateScore();

  // ホールドリセット
  holdPiece = null;
  drawHold();

  //BtB判定をリセット
  player.isBackToBack = false;

  // Nextキュー初期化
  initNextQueue();
  drawNext();

  // プレイヤー初期化とループ開始
  playerReset();
  update();
  player.level = 1;
  player.lines = 0;
  updateScore();
}