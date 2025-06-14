/* -------- game.js – pure Tic-Tac-Toe logic -------- */
export const getSymbols = n => ['X', 'O', '△', '□'].slice(0, n);

export function createGame(size = 4, players = 2) {
  return {
    board  : Array(size * size).fill(null),
    size,
    win    : 4,                // four-in-a-row for both 4×4 & 5×5
    turn   : 0,
    symbols: getSymbols(players),
    over   : false,
    winner : null,
    winningLine: []
  };
}

export function isWinningMove(game, idx, sym) {
  const { board, size, win } = game;
  const r0 = Math.floor(idx / size);
  const c0 = idx % size;
  const dirs = [
    [ 0,  1],  // →
    [ 1,  0],  // ↓
    [ 1,  1],  // ↘︎
    [ 1, -1],  // ↙︎
  ];

  for (const [dr, dc] of dirs) {
    let count = 1;
    const line = [idx];

    for (const sgn of [1, -1]) {
      let r = r0 + sgn * dr,
          c = c0 + sgn * dc;
      while (r >= 0 && r < size && c >= 0 && c < size &&
             board[r * size + c] === sym) {
        count++; line.push(r * size + c);
        r += sgn * dr; c += sgn * dc;
      }
    }
    if (count >= win) return line;
  }
  return null;
}

export function applyMove(game, idx) {
  if (game.over || game.board[idx] !== null) return game;
  const sym  = game.symbols[game.turn];
  const next = structuredClone(game);
  next.board[idx] = sym;

  const winLine = isWinningMove(next, idx, sym);
  if (winLine) {
    next.over   = true;
    next.winner = sym;
    next.winningLine = winLine;
  } else if (next.board.every(Boolean)) {
    next.over = true;               // draw
  } else {
    next.turn = (next.turn + 1) % next.symbols.length;
  }
  return next;
}
