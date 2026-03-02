// ============================
// Main Draw Loop（メイン描画）
// ============================
// 背景のグリッド線を描画
function drawGrid() {
  context.strokeStyle = 'rgba(0, 174, 255, 0.6)'; // 薄い青色
  context.lineWidth = 0.03;

  // 縦線を描くループ
  for (let x = 0; x <= COLS; x++) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, ROWS);
    context.stroke();
  }

  // 横線を描くループ
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(COLS, y);
    context.stroke();
  }

  // 盤面全体の外枠を強調して描画
  context.strokeStyle = 'rgba(0, 174, 255, 0.8)';
  context.lineWidth = 0.1;
  context.strokeRect(0, 0, COLS, ROWS);
}

// 行列データ（ミノや盤面）を描画する共通関数
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) { // 空でなければ描画
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1); // 中身

        context.strokeStyle = 'rgba(0,0,0,0.6)';
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1); // 枠線
      }
    });
  });
}

// メインの描画関数（フレームごとに呼ばれる）
function draw() {
  // 背景クリア
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  // 画面揺れ
  if (screenShakeDuration > 0) {
    context.translate((Math.random() - 0.5) * screenShakeIntensity, (Math.random() - 0.5) * screenShakeIntensity);
  }

  drawGrid();

  // エフェクト描画
  flashySquares.forEach((sq, index) => {
    context.globalAlpha = Math.max(0, sq.opacity);
    context.fillStyle = sq.color || "#FFFFFF";
    if (sq.isParticle) {
      context.fillRect(sq.x, sq.y, 0.15, 0.15);
      sq.x += sq.vx; sq.y += sq.vy; sq.vy += sq.gravity;
      sq.opacity -= 0.02;
    } else {
      context.fillRect(sq.x, sq.y, 1, 1);
      sq.x += sq.vx; sq.opacity -= 0.05;
    }
    if (sq.opacity <= 0) flashySquares.splice(index, 1);
  });
  context.globalAlpha = 1.0;

  drawGhost(getGhostPosition());
  drawMatrix(arena, { x: 0, y: 0 });

  // プレイヤーの描画（回転アニメーション付き）
  context.save();
  const centerX = player.pos.x + (player.matrix[0].length / 2);
  const centerY = player.pos.y + (player.matrix.length / 2);
  context.translate(centerX, centerY);

  // rotateAnim が定義されていない場合のエラーを防ぐために || 0 を入れる
  context.rotate(player.rotateAnim || 0);
  context.translate(-centerX, -centerY);

  drawMatrix(player.matrix, player.pos);
  context.restore();

  context.restore();

  // アニメーション更新
  if (player.rotateAnim) {
    player.rotateAnim *= 0.2;
    if (Math.abs(player.rotateAnim) < 0.01) player.rotateAnim = 0;
  }

}
// ============================
// UI Effects（メッセージ演出）
// ============================
// "TETRIS!" などのメッセージを画面にフワッと表示する関数
function showMessage(text) {
  const container = document.querySelector('.main-panel'); // 親要素を取得
  const msg = document.createElement('div'); // 新しいdivを作る
  msg.className = 'message-effect'; // CSSのアニメーション用クラスを付与
  msg.innerText = text; // テキストを設定

  // 親要素に追加（これで画面に表示される）
  container.appendChild(msg);

  // 800ms（0.8秒）後に要素を削除してメモリを掃除
  setTimeout(() => {
    msg.remove();
  }, 800);
}
// =======================
// Score（スコア更新）
// =======================
function updateScore() {
  // 画面上のスコア数値を更新
  document.getElementById('score').innerText = player.score;
  // レベル表示を更新
  document.getElementById('level').innerText = player.level;
}

// ========================
// Draw Logic (Next/Hold用)
// ========================
// 指定されたCanvasコンテキスト(ctx)の枠内にミノを描画する汎用関数
function drawPieceInBox(ctx, matrix) {
  // 背景を黒でクリア
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 4, 4);

  if (!matrix) return; // ミノが無ければ終了

  const scale = 0.8; // 枠に収まるよう少し小さく(0.8倍)する
  const offset = getScaledCenterOffset(matrix, scale); // 中央寄せの位置計算

  // ミノのブロックを描画
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value]; // 色を設定
        // 塗りつぶし四角を描画
        ctx.fillRect(
          offset.x + x * scale,
          offset.y + y * scale,
          scale,
          scale
        );
        // ブロックの枠線を描画（視認性向上）
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.lineWidth = 0.05;
        ctx.strokeRect(
          offset.x + x * scale,
          offset.y + y * scale,
          scale,
          scale
        );
      }
    });
  });
}

// Next表示エリア（3つ分）を描画する関数
function drawNext() {
  nextCtxs.forEach((ctx, i) => {
    drawPieceInBox(ctx, nextQueue[i]);
  });
}

// Hold表示エリアを描画する関数
function drawHold() {
  drawPieceInBox(holdCtx, holdPiece);
}

// ============================
// drawGhost(ゴースト描画関数)
// ============================
// ゴーストを描画する関数
function drawGhost(ghost) {
  ghost.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        const base = colors[value];
        // 半透明（不透明度 hex 55）で塗りつぶし
        context.fillStyle = base + "55";
        context.fillRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);

        // 枠線を少し濃いめ（hex 88）で描画
        context.strokeStyle = base + "88";
        context.lineWidth = 0.05;
        context.strokeRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
      }
    });
  });
}
// ========================================
// Score Update Helper(スコア・レベル更新)
// ========================================
function updateScore() {
  document.getElementById('score').innerText = player.score;
  const levelElement = document.getElementById('level');
  if (levelElement) {
    levelElement.innerText = player.level;
  }
}
// =======================
// Game Over Handling
// =======================
async function gameOver() {
  if (isGameOver) return; // 二重実行防止
  isGameOver = true;

  // 1. 下から順番に灰色に染めていく演出
  for (let y = arena.length - 1; y >= 0; y--) {
    let hasBlocks = false;
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] !== 0) {
        arena[y][x] = 8; // 灰色
        hasBlocks = true;
      }
    }

    if (hasBlocks) {
      playTone(100 + (arena.length - y) * 10, 0.05, 0.05);
      draw();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // ここで「間」を作る
  await new Promise(resolve => setTimeout(resolve, 500));

  // 2. 演出完了後、本来の終了処理へ
  cancelAnimationFrame(requestID);

  // 画面切り替え
  gameArea.style.display = 'none';
  gameOverScreen.style.display = 'flex';

  // 最終スコアなどの表示
  const scoreDisplay = document.getElementById('final-score');
  const levelDisplay = document.getElementById('final-level');
  levelDisplay.textContent = player.level;

  let targetScore = player.score;
  let startTime = null;
  const duration = 1000;

  function animateScore(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    scoreDisplay.textContent = Math.floor(easedProgress * targetScore).toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(animateScore);
    }
  }
  requestAnimationFrame(animateScore);
}

// リトライボタンの処理
function retryGame() {
  isGameOver = false;
  gameOverScreen.style.display = 'none';
  gameArea.style.display = 'flex';

  // 盤面とステータスをリセット
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.level = 1;
  player.lines = 0;
  player.combo = -1;
  player.isBackToBack = false;


  updateScore();

  initNextQueue();
  drawNext();
  holdPiece = null;
  drawHold();
  playerReset(); // 新しいミノで再開
  update(); // ループ再始動
}

// タイトルに戻るボタンの処理
function returnToTitle() {
  cancelAnimationFrame(requestID); // ループ停止

  // 画面切り替え
  gameOverScreen.style.display = 'none';
  gameArea.style.display = 'none';
  startScreen.style.display = 'flex';

  // 内部データのリセット
  arena.forEach(row => row.fill(0));
  player.score = 0;
  holdPiece = null;
  drawHold();
}
