// ============================
// Geometry Helpers（形状計算）
// ============================
// ミノが存在する領域（最小/最大X,Y）を計算する関数
function getPieceBounds(matrix) {
  let minX = 10, maxX = -10;
  let minY = 10, maxY = -10;

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) { // ブロックがある場所なら
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    });
  });

  return { minX, maxX, minY, maxY };
}
// ================================
// Rotate Logic（行列の回転計算）
// ================================
function rotate(matrix, dir) {
  // 1. 転置（行と列を入れ替える）
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  // 2. 反転（右回転なら各行を逆順に、左回転なら行の並びを逆順に）
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}