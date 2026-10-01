import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Health check endpoint for Fly.io & local wakeup
app.get('/health', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.status(200).send('OK');
});

interface DungeonRoom {
  code: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  hostName: string;
  players: { id: string; name: string; hero: string; isHost: boolean }[];
  maxPlayers: number;
  mode: 'pvp' | 'dungeon';
  createdAt: number;
}

// In-memory active game rooms
const activeRooms = new Map<string, DungeonRoom>();

// Seed active public rooms for instant co-op and PvP lobbies
activeRooms.set('DG-1092', {
  code: 'DG-1092',
  name: 'Логово Древнего Голема',
  isPrivate: false,
  hostName: 'ShadowBlade',
  players: [{ id: 'bot_host_1', name: 'ShadowBlade', hero: 'char_grim', isHost: true }],
  maxPlayers: 2,
  mode: 'dungeon',
  createdAt: Date.now() - 45000
});

activeRooms.set('DG-4820', {
  code: 'DG-4820',
  name: 'Крипта Теней (Кооп)',
  isPrivate: false,
  hostName: 'VikingKing',
  players: [{ id: 'bot_host_2', name: 'VikingKing', hero: 'char_bjorn', isHost: true }],
  maxPlayers: 2,
  mode: 'dungeon',
  createdAt: Date.now() - 120000
});

activeRooms.set('DG-7714', {
  code: 'DG-7714',
  name: 'Охота за Артефактами',
  isPrivate: false,
  hostName: 'ZazaChief',
  players: [{ id: 'bot_host_3', name: 'ZazaChief', hero: 'char_zaza', isHost: true }],
  maxPlayers: 2,
  mode: 'dungeon',
  createdAt: Date.now() - 18000
});

// REST API for room queries
app.get('/api/rooms', (req, res) => {
  const mode = req.query.mode as string | undefined;
  const list = Array.from(activeRooms.values())
    .filter(r => !mode || r.mode === mode)
    .map(r => ({
      code: r.code,
      name: r.name,
      isPrivate: r.isPrivate,
      hostName: r.hostName,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      mode: r.mode,
      hasPassword: !!r.password
    }));
  res.json(list);
});

app.post('/api/rooms', (req, res) => {
  const { name, isPrivate, password, hostName, hero, mode } = req.body;
  const code = 'DG-' + Math.floor(1000 + Math.random() * 9000);
  const newRoom: DungeonRoom = {
    code,
    name: name || `Комната #${code}`,
    isPrivate: !!isPrivate,
    password: password || undefined,
    hostName: hostName || 'Герой',
    players: [{ id: 'host_' + Date.now(), name: hostName || 'Герой', hero: hero || 'char_zaza', isHost: true }],
    maxPlayers: 2,
    mode: mode === 'pvp' ? 'pvp' : 'dungeon',
    createdAt: Date.now()
  };
  activeRooms.set(code, newRoom);
  res.json({ success: true, room: newRoom });
});

const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

interface ClientMeta {
  ws: WebSocket;
  roomCode?: string;
  playerId: string;
  playerName: string;
  hero: string;
}

const clients = new Map<WebSocket, ClientMeta>();

wss.on('connection', (ws: WebSocket) => {
  const meta: ClientMeta = {
    ws,
    playerId: 'p_' + Math.random().toString(36).substring(2, 9),
    playerName: 'Игрок',
    hero: 'char_zaza'
  };
  clients.set(ws, meta);

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, roomCode } = data;

      if (type === 'join_room') {
        meta.roomCode = roomCode;
        meta.playerName = data.playerName || meta.playerName;
        meta.hero = data.hero || meta.hero;

        let room = activeRooms.get(roomCode);
        if (!room) {
          room = {
            code: roomCode,
            name: data.roomName || `Подземелье ${roomCode}`,
            isPrivate: false,
            hostName: meta.playerName,
            players: [],
            maxPlayers: 2,
            mode: data.gameMode || 'dungeon',
            createdAt: Date.now()
          };
          activeRooms.set(roomCode, room);
        }

        if (!room.players.some(p => p.id === meta.playerId)) {
          room.players.push({
            id: meta.playerId,
            name: meta.playerName,
            hero: meta.hero,
            isHost: room.players.length === 0
          });
        }

        ws.send(JSON.stringify({
          type: 'room_joined',
          playerId: meta.playerId,
          roomCode,
          players: room.players
        }));

        broadcastToRoom(roomCode, ws, {
          type: 'player_joined',
          playerId: meta.playerId,
          playerName: meta.playerName,
          hero: meta.hero
        });
      } else if (meta.roomCode) {
        broadcastToRoom(meta.roomCode, ws, {
          ...data,
          playerId: meta.playerId,
          senderName: meta.playerName
        });
      }
    } catch {
      // Ignore invalid JSON
    }
  });

  ws.on('close', () => {
    if (meta.roomCode) {
      broadcastToRoom(meta.roomCode, ws, {
        type: 'player_left',
        playerId: meta.playerId,
        playerName: meta.playerName
      });
      const r = activeRooms.get(meta.roomCode);
      if (r) {
        r.players = r.players.filter(p => p.id !== meta.playerId);
        if (r.players.length === 0 && !meta.roomCode.startsWith('DG-1092') && !meta.roomCode.startsWith('DG-4820')) {
          activeRooms.delete(meta.roomCode);
        }
      }
    }
    clients.delete(ws);
  });
});

function broadcastToRoom(roomCode: string, senderWs: WebSocket, payload: unknown) {
  const msg = JSON.stringify(payload);
  for (const [ws, meta] of clients.entries()) {
    if (ws !== senderWs && meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../client'),
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, '../dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
