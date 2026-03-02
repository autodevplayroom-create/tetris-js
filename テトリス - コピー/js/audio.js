// ==================================
// Web Audio APIの準備
// ==================================
// オーディオコンテキストの作成
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 基本の音を作る関数
function playTone(freq, volume, duration) {
  // 動作確認用のログ（音を鳴らさずに確認したい場合はこれを見る）
  console.log(`[AUDIO] 鳴動: ${freq}Hz`);

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

// 移動音の定義
function playMoveSound() {
  playTone(400, 0.05, 0.05);
}

// 消去音の定義
function playClearSound() {
  playTone(600, 0.1, 0.2);
  setTimeout(() => playTone(800, 0.1, 0.2), 50);
}

// 設置音の定義
function playDropSound() {
  playTone(150, 0.1, 0.1);
}
//壁に当たった時の音
function playWallHitSound() {
  const now = audioCtx.currentTime;
  const duration = 0.05; // 非常に短く

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle'; // 角の取れた、少しこもった衝撃音
  osc.frequency.setValueAtTime(150, now); // 低めの周波数

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(now + duration);

  console.log("[AUDIO] 壁衝突音");
}
// ハードドロップの音：低音からさらに低くスライドさせて重さを出す
function playHardDropSound() {
  const duration = 0.2; // 少し長めにして余韻を出す
  const now = audioCtx.currentTime;

  // 1. メインの重低音（サイン波で「ズン」）
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(120, now); // 低い音から開始
  osc1.frequency.exponentialRampToValueAtTime(30, now + duration); // さらに低くスライド
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.linearRampToValueAtTime(0, now + duration);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);

  // 2. 打撃音の厚み（三角波で「ゴン」）
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(80, now);
  gain2.gain.setValueAtTime(0.2, now);
  gain2.gain.linearRampToValueAtTime(0, now + duration);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  // 3. アタック感（ノイズで「バシッ」）
  // 数値でランダムな波形を作って打撃音に混ぜる
  const bufferSize = audioCtx.sampleRate * 0.05; // 0.05秒分
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  noise.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  osc1.start();
  osc2.start();
  noise.start();

  osc1.stop(now + duration);
  osc2.stop(now + duration);
  noise.stop(now + 0.05);

  console.log("[AUDIO] 重厚ハードドロップ音");
}

// ライン消去の音：高い音を2つ重ねて「キラキラ感」を出す
function playClearSound(lineCount = 1) {
  // 消した列数に応じて基本の周波数を上げる (1列:660Hz 〜 4列:1320Hz)
  const baseFreq = 440 + (lineCount * 220);

  // 1音目
  playTone(baseFreq, 0.1, 0.3);

  // 2音目を少し遅らせて重ねる（和音のような厚みが出る）
  setTimeout(() => {
    playTone(baseFreq * 1.5, 0.08, 0.4);
  }, 50);

  // 4列消しの時はさらにもう1音追加して豪華に！
  if (lineCount === 4) {
    setTimeout(() => {
      playTone(baseFreq * 2, 0.06, 0.5);
    }, 100);
  }

  console.log(`[AUDIO] ライン消去: ${lineCount}列`);
}
//Tスピンの音
function playTSpinSound() {
  const now = audioCtx.currentTime;
  const duration = 0.4;

  // 1. メインのせり上がる音（SFチックな音）
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth'; // 歯切れの良い音色
  // 低い音から高い音へ一気にスライド（440Hz -> 880Hz）
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + duration);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // 2. キラキラした装飾音
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1760, now); // かなり高い音
  gain2.gain.setValueAtTime(0.05, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  osc.start();
  osc2.start();
  osc.stop(now + duration);
  osc2.stop(now + duration);

  console.log("[AUDIO] T-Spin成功音");
}
//レベルアップの音
function playLevelUpSound() {
  const now = audioCtx.currentTime;

  // 1音目：低めの基準音（集中力を高める）
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(440, now); // A4 (ラ)
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);

  // 2音目：完全5度上の音（力強さと広がり）
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5 (ミ) - わずかに遅らせる
  gain2.gain.setValueAtTime(0.08, now + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  // 隠し味：高音のピリッとした残響
  const osc3 = audioCtx.createOscillator();
  const gain3 = audioCtx.createGain();
  osc3.type = 'triangle'; // 少しだけエッジを立たせる
  osc3.frequency.setValueAtTime(1320, now); // かなり高い音
  gain3.gain.setValueAtTime(0.03, now);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc3.connect(gain3);
  gain3.connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now + 0.05);
  osc3.start(now);

  osc1.stop(now + 0.3);
  osc2.stop(now + 0.4);
  osc3.stop(now + 0.1);

  console.log("[AUDIO] レベルアップ：緊張感のあるスタイリッシュ音");

}

// Back-to-Back (BtB) 成立時の特別な効果音
function playBackToBackSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // 華やかなメジャーセブンス和音 (Cmaj7)
  // 複数の周波数を同時に鳴らして豪華さを出します
  const freqs = [523.25, 659.25, 783.99, 987.77];

  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // 少し柔らかい「triangle」波形を使用
    osc.type = 'triangle';

    // 0.03秒ずつずらしてアルペジオ（分散和音）っぽく鳴らす
    const startTime = now + (i * 0.03);

    osc.frequency.setValueAtTime(f, startTime);
    // 音の終わりに少しだけピッチを上げることで「キラキラ感」を演出
    osc.frequency.exponentialRampToValueAtTime(f * 1.02, startTime + 0.4);

    gain.gain.setValueAtTime(0.06, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
}