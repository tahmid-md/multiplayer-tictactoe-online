/* -------- game.js – pure Tic-Tac-Toe logic -------- */
export const getSymbols = n => ['X', 'O', '△', '□'].slice(0, n);

export function createGame(size = 4, players = 2) {
  return {
    board  : Array(size * size).fill(null),
    size,
    win    : (size === 3 ? 3 :size === 4 ? 4 : 5),                // four-in-a-row for 4×4 & five-in-a-row 5×5
    turn   : 0,
    symbols: getSymbols(players),
    over   : false,
    winner : null,
    winningLine: []
  };
}

/* ----------  ULTIMATE  ---------- */

export function createUltimateGame(players = 2) {
  return {
    mode   : 'ultimate',
    symbols: getSymbols(players),
    turn   : 0,
    macro  : Array(9).fill(null),          // 'X','O', 'F' (full) or null
    locals : Array(9).fill(null).map(() => Array(9).fill(null)),
    activeLocal : null,                    // 0-8  or null (free move)
    over   : false,
    winner : null,
    macroWinLine: []
  };
}

/* helper: detect 3-in-row in a flat 3×3 board */
function winner3(board, sym){
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],              // rows
    [0,3,6],[1,4,7],[2,5,8],              // cols
    [0,4,8],[2,4,6]                       // dias
  ];
  return wins.find(line => line.every(i=>board[i]===sym)) || null;
}

export function applyUltimateMove(g, local, cell){
  if (g.over) return g;
  if (g.activeLocal!==null && g.activeLocal!==local) return g;      // wrong board
  if (g.locals[local][cell]!==null) return g;                       // occupied

  const sym = g.symbols[g.turn];
  const next = structuredClone(g);
  next.locals[local][cell] = sym;

  /* ---- local board resolved? ---- */
  const line = winner3(next.locals[local], sym);
  if (line){
    next.macro[local] = sym;
    next.locals[local].forEach((_,i)=> next.locals[local][i] ??= sym); // fill for visual
  } else if (next.locals[local].every(Boolean)){
    next.macro[local] = 'F';                                         // full/locked
  }

  /* ---- macro win? ---- */
  const macroWin = winner3(next.macro, sym);
  if (macroWin){
    next.over   = true;
    next.winner = sym;
    next.macroWinLine = macroWin;
  } else if (next.macro.every(v=>v)){
    next.over = true;                                                // draw
  }

  /* ---- determine next active board ---- */
  next.activeLocal = next.macro[cell] ? null : cell;

  /* ---- advance turn ---- */
  next.turn = (next.turn + 1) % next.symbols.length;
  return next;
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
