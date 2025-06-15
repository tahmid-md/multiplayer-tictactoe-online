import express               from 'express';
import { createServer }      from 'http';
import { WebSocketServer }   from 'ws';
import {
  createGame,
  applyMove,
  createUltimateGame,
  applyUltimateMove
} from './game.js';

const app  = express();
const http = createServer(app);
const wss  = new WebSocketServer({ server: http });

/* ---------- static assets ---------- */
app.use(express.static('public'));

/* ---------- lobby store ---------- */
const lobbies = new Map();   // key → { game, mode, clients[] }

/* ---------- helper: broadcast state ---------- */
function sendState(lobby) {
  const payload = {
    type   : 'state',
    game   : lobby.game,
    players: lobby.clients.length       // NEW
  };
  const msg = JSON.stringify(payload);
  lobby.clients.forEach(ws =>
    ws.readyState === 1 && ws.send(msg));
}

/* ---------- WebSocket handling ---------- */
wss.on('connection', ws => {
  ws.lobbyKey  = null;
  ws.playerIdx = null;

  ws.on('message', raw => {
    const m = JSON.parse(raw);

    /* ----- JOIN ----- */
    if (m.type === 'join') {
      /* lobby key: mode + board size (classic) or just mode (ultimate) */
      const size = m.mode === 'ultimate' ? 3 : m.boardSize;
      const key  = `${m.mode}-${size}`;
      ws.lobbyKey = key;

      /* create lobby or reuse existing */
      const lobby = lobbies.get(key) ?? {
        game   : m.mode === 'ultimate' ? createUltimateGame()
                                       : createGame(size),
        mode   : m.mode,
        clients: []
      };

      /* capacity check */
      if (lobby.clients.length >= lobby.game.symbols.length) {
        ws.send(JSON.stringify({ type:'error', reason:'Lobby full' }));
        return;
      }

      /* add client */
      ws.playerIdx = lobby.clients.length;
      lobby.clients.push(ws);
      lobbies.set(key, lobby);

      /* personal init */
      ws.send(JSON.stringify({
        type        : 'init',
        playerIndex : ws.playerIdx,
        game        : lobby.game,
        players     : lobby.clients.length          // NEW
      }));

      /* notify everyone */
      sendState(lobby);
      return;
    }

    /* every other message needs a lobby */
    const lobby = lobbies.get(ws.lobbyKey);
    if (!lobby) return;

    /* ----- MOVE ----- */
    if (m.type === 'move') {
      /* require two players */
      if (lobby.clients.length < 2) return;

      /* turn / game-over guards */
      if (lobby.game.over || lobby.game.turn !== ws.playerIdx) return;

      lobby.game = lobby.mode === 'ultimate'
        ? applyUltimateMove(lobby.game, m.local, m.cell)
        : applyMove       (lobby.game, m.index);

      sendState(lobby);
      return;
    }

    /* ----- RESET ----- */
    if (m.type === 'reset') {
      lobby.game = lobby.mode === 'ultimate'
        ? createUltimateGame()
        : createGame(lobby.game.size);

      sendState(lobby);
      return;
    }
  });

  /* ----- DISCONNECT ----- */
  ws.on('close', () => {
    const lobby = lobbies.get(ws.lobbyKey);
    if (!lobby) return;

    lobby.clients = lobby.clients.filter(c => c !== ws);
    if (!lobby.clients.length) lobbies.delete(ws.lobbyKey);
    else                       sendState(lobby);
  });
});

/* ---------- start ---------- */
const PORT = process.env.PORT || 8080;
http.listen(PORT, () =>
  console.log(`Live at http://localhost:${PORT}`));
