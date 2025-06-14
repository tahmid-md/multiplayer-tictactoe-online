import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createGame, applyMove } from './game.js';

const app  = express();
const http = createServer(app);
const wss  = new WebSocketServer({ server: http });

/* ---------- serve static files ---------- */
app.use(express.static('public'));     // index.html, css, js

/* ---------- in-memory lobbies ---------- */
const lobbies = new Map();             // key: "size4", value: { game, clients }

function broadcast(clients, msg) {
  const data = JSON.stringify(msg);
  clients.forEach(ws => ws.readyState === 1 && ws.send(data));
}

wss.on('connection', ws => {
  ws.lobbyKey  = null;
  ws.playerIdx = null;

  ws.on('message', raw => {
    const m = JSON.parse(raw);

    /* ---- join ---- */
    if (m.type === 'join') {
      const key   = 'size' + m.boardSize;
      ws.lobbyKey = key;

      const lobby = lobbies.get(key) ?? {
        game   : createGame(m.boardSize),
        clients: []
      };
      if (lobby.clients.length >= lobby.game.symbols.length) {
        ws.send(JSON.stringify({ type: 'error', reason: 'Lobby full' }));
        return;
      }
      ws.playerIdx = lobby.clients.length;
      lobby.clients.push(ws);
      lobbies.set(key, lobby);

      ws.send(JSON.stringify({ type: 'init',
                               playerIndex: ws.playerIdx,
                               game: lobby.game }));
      broadcast(lobby.clients, { type: 'state', game: lobby.game });
      return;
    }

    const lobby = lobbies.get(ws.lobbyKey);
    if (!lobby) return;

    /* ---- move ---- */
    if (m.type === 'move') {
      if (lobby.game.over || lobby.game.turn !== ws.playerIdx) return;
      lobby.game = applyMove(lobby.game, m.index);
      broadcast(lobby.clients, { type: 'state', game: lobby.game });
    }

    /* ---- reset ---- */
    if (m.type === 'reset') {
      lobby.game = createGame(lobby.game.size);
      broadcast(lobby.clients, { type: 'state', game: lobby.game });
    }
  });

  ws.on('close', () => {
    const lobby = lobbies.get(ws.lobbyKey);
    if (!lobby) return;
    lobby.clients = lobby.clients.filter(c => c !== ws);
    if (!lobby.clients.length) lobbies.delete(ws.lobbyKey);
  });
});

/* ---------- start server ---------- */
const PORT = process.env.PORT || 8080;
http.listen(PORT, () =>
  console.log(`✅  Live at http://localhost:${PORT}`));
