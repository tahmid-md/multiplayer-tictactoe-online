
// ------------- dynamic URL -------------
const WS_URL = `${location.origin.replace(/^http/, 'ws')}`;

// ------------- DOM refs -------------
const boardEl    = document.getElementById('board');
const statusEl   = document.getElementById('status');
const sizeSelect = document.getElementById('sizeSelect');
const btnStart   = document.getElementById('btnStart');
const btnReset   = document.getElementById('btnReset');

// ------------- helpers -------------
const setStatus = t => (statusEl.textContent = t);
function setBoardSize(n) {
  boardEl.style.setProperty('--size', n);
  boardEl.innerHTML = '';
  for (let i = 0; i < n * n; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.i = i;
    boardEl.appendChild(d);
  }
}
function render(g, me) {
  [...boardEl.children].forEach((c, i) => {
    c.textContent = g.board[i] ?? '';
    c.classList.toggle('win',  g.winningLine?.includes(i));
    c.classList.toggle('draw', g.over && !g.winner);
  });
  if (g.over) {
    setStatus(g.winner ? `🏆 Player ${g.winner} wins!` : '🤝 Draw!');
    btnReset.disabled = false;
  } else {
    setStatus(me === g.turn ? '✅ Your turn' : '⏳ Waiting …');
    btnReset.disabled = true;
  }
}

// ------------- WebSocket glue -------------
let ws, me, game;
function connect(size) {
  ws = new WebSocket(WS_URL);
  ws.addEventListener('open', () =>
    ws.send(JSON.stringify({ type: 'join', boardSize: size })));

  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.type === 'init') {
      me   = m.playerIndex;
      game = m.game;
      setBoardSize(game.size);
      render(game, me);
    }
    if (m.type === 'state') {
      game = m.game;
      render(game, me);
    }
    if (m.type === 'error') alert(m.reason);
  });

  ws.addEventListener('close', () => {
    setStatus('🔌 Disconnected');
    btnReset.disabled = true;
  });
}

// ------------- UI events -------------
btnStart.onclick = () => {
  const sz = +sizeSelect.value;
  if (ws?.readyState === WebSocket.OPEN) ws.close();
  connect(sz);
};
btnReset.onclick = () => ws?.send(JSON.stringify({ type: 'reset' }));
boardEl.onclick = e => {
  const cell = e.target.closest('.cell');
  if (!cell || !ws) return;
  ws.send(JSON.stringify({ type: 'move', index: +cell.dataset.i }));
};
