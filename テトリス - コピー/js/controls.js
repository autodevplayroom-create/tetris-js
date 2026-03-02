// ================================
// Controls（キーボード入力処理）
// ================================
document.addEventListener('keydown', event => {
  // Escapeキー：タイトルに戻る
  if (event.key === 'Escape') {
    returnToTitle();
    return;
  }

  // Enterキー：スタート画面ならゲーム開始
  if (event.code === 'Enter' && startScreen.style.display !== 'none') {
    startGame();
    return;
  }

  // 左移動
  if (event.key === 'ArrowLeft' || event.key === 'a') {
    player.pos.x--;
    if (collide(arena, player)) { // ぶつかったら
      player.pos.x++; // 元に戻す
      playWallHitSound();
    } else {
      player.lockDelayCounter = 0; // 移動成功なら固定猶予リセット
      playMoveSound();
    }
    player.lastAction = 'move';
  }
  // 右移動
  else if (event.key === 'ArrowRight' || event.key === 'd') {
    player.pos.x++;
    if (collide(arena, player)) {
      player.pos.x--;
      playWallHitSound();
    } else {
      player.lockDelayCounter = 0;
      playMoveSound();
    }
    player.lastAction = 'move';
  }

  // ソフトドロップ（下移動）
  else if (event.key === 'ArrowDown' || event.key === 's') {
    player.pos.y++;
    if (collide(arena, player)) {
      player.pos.y--; // ぶつかったら戻す
    } else {
      player.lockDelayCounter = 0;
      dropCounter = 0; // 自動落下のタイマーもリセット（スムーズにするため）
      playMoveSound();
    }
    player.lastAction = 'move';
  }

  // ハードドロップ（上キー / W / Space）
  else if (event.key === 'ArrowUp' || event.key === 'w' || event.code === 'Space') {
    playHardDropSound();
    event.preventDefault(); // 画面スクロール防止
    hardDrop();
  }

  // 左回転（Qキー）
  else if (event.key === 'q') {
    if (rotatePlayer(-1)) {
      player.lockDelayCounter = 0;
      playTone(500, 0.03, 0.05);
      // データは左(-90度)に回ったので、見た目は右(+90度)から0に戻す
      player.rotateAnim = Math.PI / 2;
    }
  }
  // 右回転（Eキー）
  else if (event.key === 'e') {
    if (rotatePlayer(1)) {
      player.lockDelayCounter = 0;
      playTone(500, 0.03, 0.05);
      // データは右(+90度)に回ったので、見た目は左(-90度)から0に戻す
      player.rotateAnim = -Math.PI / 2;
    }
  }

  // ホールド（Cキー / Shiftキー）
  else if (event.key === 'c' || event.key === 'Shift') {
    playerHold();
  }
});
