/* ---------- dynamic URL ---------- */
const WS_URL = `${location.origin.replace(/^http/, 'ws')}`;

/* ---------- DOM refs ---------- */
const boardEl     = document.getElementById('board');
const statusEl    = document.getElementById('status');
const sizeSelect  = document.getElementById('sizeSelect');
const modeSelect  = document.getElementById('modeSelect');
const btnStart    = document.getElementById('btnStart');
const btnReset    = document.getElementById('btnReset');

/* ###########################################
 *  Sync Board-size dropdown with Mode choice
 * ########################################### */
const fullSizeOptionsHTML = sizeSelect.innerHTML;

function syncSizeLock() {
  const isUltimate = modeSelect.value === 'ultimate';

  if (isUltimate) {
    sizeSelect.innerHTML = '<option value="3">3 × 3</option>';
    sizeSelect.value     = '3';
    sizeSelect.disabled  = true;          // grey-out
  } else {
    if (sizeSelect.innerHTML !== fullSizeOptionsHTML) {
      sizeSelect.innerHTML = fullSizeOptionsHTML;
    }
    sizeSelect.disabled = false;
  }
}

/* ---- initial defaults + first call ---- */
sizeSelect.value = '3';
modeSelect.value = 'classic';
syncSizeLock();
modeSelect.addEventListener('change', syncSizeLock);

/* ---------- helpers ---------- */
const setStatus = txt => (statusEl.textContent = txt);

/* ---- classic board builder ---- */
function buildClassic(n) {
  boardEl.className = 'board';
  boardEl.style.setProperty('--size', n);
  boardEl.innerHTML = '';
  for (let i = 0; i < n * n; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.dataset.index = i;
    boardEl.appendChild(d);
  }
}

/* ---- ultimate board builder ---- */
function buildUltimate() {
  boardEl.className = 'macro ultimate';
  boardEl.innerHTML = '';
  for (let l = 0; l < 9; l++) {
    const local = document.createElement('div');
    local.className = 'local-board';
    local.dataset.local = l;
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.cell = c;
      local.appendChild(cell);
    }
    boardEl.appendChild(local);
  }
}

/* ---------- renderers ---------- */
function renderClassic(g, me) {
  if (boardEl.dataset.currentSize != g.size) {
    buildClassic(g.size);
    boardEl.dataset.currentSize = g.size;
  }
  [...boardEl.children].forEach((c, i) => {
    c.textContent = g.board[i] ?? '';
    c.classList.toggle('win',  g.winningLine?.includes(i));
    c.classList.toggle('draw', g.over && !g.winner);
  });
  statusEl.textContent = g.over
    ? (g.winner ? `🏆 Player ${g.winner} wins!` : '🤝 Draw!')
    : (me === g.turn ? '✅ Your turn' : '⏳ Waiting …');
  btnReset.disabled = !g.over;
}

function renderUltimate(g, me) {
  if (!boardEl.classList.contains('ultimate')) buildUltimate();
  [...boardEl.querySelectorAll('.local-board')].forEach((lb, l) => {
    lb.classList.toggle('local-active',
      g.activeLocal === null ? true : g.activeLocal === l);
    lb.classList.toggle('winX', g.macro[l] === 'X');
    lb.classList.toggle('winO', g.macro[l] === 'O');
    lb.classList.toggle('lock', g.macro[l]);
    [...lb.children].forEach((cell, c) => {
      cell.textContent = g.locals[l][c] ?? '';
    });
  });
  statusEl.textContent = g.over
    ? (g.winner ? `🏆 Player ${g.winner} wins!` : '🤝 Draw!')
    : (me === g.turn ? '✅ Your turn' : '⏳ Waiting …');
  btnReset.disabled = !g.over;
}

/* ---------- WebSocket glue ---------- */
let ws, me, game;

function connect(size, mode) {
  ws = new WebSocket(WS_URL);
  ws.addEventListener('open', () =>
    ws.send(JSON.stringify({ type:'join', boardSize:size, mode })));

  ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);

  if (m.type === 'init') {
    me   = m.playerIndex;                 // <-- keep this ONLY here
    game = m.game;
    (game.mode === 'ultimate' ? renderUltimate : renderClassic)(game, me);
    return;
  }

  if (m.type === 'state') {
    game = m.game;
    (game.mode === 'ultimate' ? renderUltimate : renderClassic)(game, me);
    return;
  }

  if (m.type === 'error') alert(m.reason);
});


  ws.addEventListener('close', () => {
    setStatus('🔌 Disconnected');
    btnReset.disabled = true;
  });
}

/* ---------- UI events ---------- */
btnStart.onclick = () => {
  const mode = modeSelect.value;
  const size = mode === 'ultimate' ? 3 : +sizeSelect.value;

  if (mode === 'ultimate') buildUltimate();
  else                     buildClassic(size);

  if (ws?.readyState === WebSocket.OPEN) ws.close();
  connect(size, mode);
};

btnReset.onclick = () =>
  ws?.send(JSON.stringify({ type: 'reset' }));

boardEl.onclick = e => {
  const cell = e.target.closest('.cell');
  if (!cell || !ws || !game) return;

  if (game.mode === 'ultimate') {
    const local = +cell.parentElement.dataset.local;
    const idx   = +cell.dataset.cell;
    ws.send(JSON.stringify({ type:'move', local, cell: idx }));
  } else {
    ws.send(JSON.stringify({ type:'move', index:+cell.dataset.index }));
  }
};
