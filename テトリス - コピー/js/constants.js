// ==================================
// Canvas（描画エリアのセットアップ）
// ==================================
// HTMLの <canvas id="tetris"> 要素を取得（メインのゲーム画面）
const canvas = document.getElementById('tetris');
// 2D描画用のコンテキスト（筆のようなもの）を取得
const context = canvas.getContext('2d');
// 描画倍率を設定（1単位を30ピクセルとして描画。これで1ブロックが30pxになる）
context.scale(30, 30);

// HTMLの <canvas id="hold"> 要素を取得（ホールド画面）
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
// ホールド画面は少し小さめに表示するため倍率を20倍に設定
holdCtx.scale(20, 20);

// HTMLのクラス名 .next を持つ要素（3つのキャンバス）をすべて取得して配列化
const nextCanvases = Array.from(document.querySelectorAll('.next'));
// それぞれのNextキャンバスのコンテキストを取得し、倍率を設定して配列に格納
const nextCtxs = nextCanvases.map(c => {
  const ctx = c.getContext('2d');
  ctx.scale(20, 20); // Nextも小さめに表示
  return ctx;
});
// ===========================
// Arena（ゲーム盤面の初期化）
// ===========================
const ROWS = 20; // 縦のマス数
const COLS = 10; // 横のマス数

// 盤面データを作成（縦20 x 横10 の二次元配列。中身はすべて0）
const arena = createMatrix(COLS, ROWS);

// 指定した幅(w)と高さ(h)で、0埋めの二次元配列を作る関数
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0)); // 横一列分の配列(0埋め)を追加
  }
  return matrix;
}
// ==================================
// Draw Helpers（描画位置の計算補助）
// ==================================
// NextやHoldの小さい枠内で、ミノを中央揃えするための座標オフセットを計算する関数
function getScaledCenterOffset(matrix, scale) {
  // ミノが存在する範囲（バウンディングボックス）を取得
  const { minX, maxX, minY, maxY } = getPieceBounds(matrix);

  // 実際の描画幅と高さを計算
  const w = (maxX - minX + 1) * scale;
  const h = (maxY - minY + 1) * scale;

  // 4x4マスの枠の中央に配置するための左上のズレ(offset)を計算
  const offsetX = (4 - w) / 2 - minX * scale;
  const offsetY = (4 - h) / 2 - minY * scale;

  return { x: offsetX, y: offsetY };
}
// ===============================
// Create Pieces（ミノの形状定義）
// ===============================
// 文字を受け取って、対応する形状配列を返す関数
function createPiece(type) {
  switch (type) {
    case 'T': return [[0, 4, 0], [4, 4, 4], [0, 0, 0]]; // 色番号4
    case 'O': return [[6, 6], [6, 6]];                  // 色番号6
    case 'L': return [[0, 0, 5], [5, 5, 5], [0, 0, 0]]; // 色番号5
    case 'J': return [[7, 0, 0], [7, 7, 7], [0, 0, 0]]; // 色番号7
    case 'I': return [[0, 0, 0, 0], [2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0]]; // 色番号2
    case 'S': return [[0, 3, 3], [3, 3, 0], [0, 0, 0]]; // 色番号3
    case 'Z': return [[1, 1, 0], [0, 1, 1], [0, 0, 0]]; // 色番号1
  }
}
// =======================
// Colors（ミノの色定義）
// =======================
// インデックス番号に対応した色コード（0は空なのでnull）
const colors = [
  null,
  "#FF0D72", // 1: T字など (形状定義とインデックスを合わせる必要あり)
  "#0DC2FF", // 2: I字
  "#0DFF72", // 3: S字
  "#F538FF", // 4: Z字
  "#FF8E0D", // 5: L字
  "#FFE138", // 6: O字
  "#3877FF", // 7: J字
  '#808080', //ゲームオーバー時のテトリミノ
];
// ===============================
// WallKickData（壁蹴りのデータ）
// ===============================
const wallKickData = {
  "0-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // 上(0)から右(1)への回転時
  "1-0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     // 右(1)から上(0)への回転時
  "1-2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     // ...以下、各向きの組み合わせ
  "2-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3-2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3-0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};
