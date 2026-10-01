const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Fly.io wake-up & liveness check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const server = http.createServer(app);

// Socket.io setup with unrestricted CORS for Web, APK, and Localhost
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// State Management
const activeRooms = new Map(); // roomCode -> Room Object
const tavernPools = new Map(); // tavernId -> Tavern Object
const matchmakingQueue = [];  // Array of queued players
const onlineUsers = new Map(); // socketId -> User Meta

// Helper to generate room code
function generateCode(prefix = 'ROOM') {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// REST endpoints for Server Browser
app.get('/api/rooms', (req, res) => {
  const mode = req.query.mode;
  const list = [];
  
  for (const [code, room] of activeRooms.entries()) {
    if (!mode || room.mode === mode) {
      list.push({
        code: room.code,
        name: room.name,
        isPrivate: room.isPrivate,
        hostName: room.hostName,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        mode: room.mode,
        hasPassword: !!room.password,
        ping: room.lastPing ? Math.max(12, Math.round(Date.now() - room.lastPing)) : 25
      });
    }
  }
  res.json(list);
});

// Stale room cleanup every 15 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of activeRooms.entries()) {
    if (now - room.lastPing > 45000 && room.players.length === 0) {
      activeRooms.delete(code);
    }
  }
  for (const [id, tavern] of tavernPools.entries()) {
    if (tavern.players.length === 0) {
      tavernPools.delete(id);
    }
  }
}, 15000);

// Socket Connection Handler
io.on('connection', (socket) => {
  let currentUser = {
    socketId: socket.id,
    id: `user_${Math.random().toString(36).substring(2, 9)}`,
    name: 'Hero',
    tag: 'Hero#1234',
    rating: 1000,
    hero: 'char_zaza',
    roomCode: null,
    lastActive: Date.now()
  };

  onlineUsers.set(socket.id, currentUser);

  // Heartbeat pulse every 25s
  socket.on('heartbeat', (data) => {
    currentUser.lastActive = Date.now();
    if (data && data.name) {
      currentUser.name = data.name;
      currentUser.tag = data.tag || `${data.name}#${Math.floor(1000 + Math.random() * 9000)}`;
      if (data.rating) currentUser.rating = data.rating;
    }
    socket.emit('heartbeat_ack', { status: 'online', timestamp: Date.now() });
  });

  // 1. TAVERN AUTO-POOL (Up to 8 players per instance)
  socket.on('join_tavern', (userData) => {
    currentUser.name = userData.name || currentUser.name;
    currentUser.hero = userData.hero || currentUser.hero;

    // Find available tavern (< 8 players)
    let targetTavern = null;
    for (const [id, tavern] of tavernPools.entries()) {
      if (tavern.players.length < 8) {
        targetTavern = tavern;
        break;
      }
    }

    if (!targetTavern) {
      const tavernId = `TAVERN-${Math.floor(100 + Math.random() * 900)}`;
      targetTavern = {
        id: tavernId,
        players: []
      };
      tavernPools.set(tavernId, targetTavern);
    }

    const playerMeta = {
      id: currentUser.id,
      socketId: socket.id,
      name: currentUser.name,
      hero: currentUser.hero,
      x: 300 + (Math.random() - 0.5) * 100,
      y: 300 + (Math.random() - 0.5) * 100
    };

    targetTavern.players.push(playerMeta);
    currentUser.roomCode = targetTavern.id;
    socket.join(targetTavern.id);

    socket.emit('tavern_joined', {
      tavernId: targetTavern.id,
      players: targetTavern.players,
      yourId: currentUser.id
    });

    socket.to(targetTavern.id).emit('tavern_player_joined', playerMeta);
  });

  socket.on('tavern_move', (data) => {
    if (currentUser.roomCode && currentUser.roomCode.startsWith('TAVERN-')) {
      socket.to(currentUser.roomCode).emit('tavern_player_moved', {
        id: currentUser.id,
        x: data.x,
        y: data.y,
        flipX: data.flipX
      });
    }
  });

  socket.on('tavern_chat', (data) => {
    if (currentUser.roomCode && currentUser.roomCode.startsWith('TAVERN-')) {
      io.to(currentUser.roomCode).emit('tavern_chat_bubble', {
        id: currentUser.id,
        message: data.message,
        type: data.type || 'text'
      });
    }
  });

  // 2. SERVER BROWSER & LOBBY MANAGEMENT
  socket.on('create_room', (config) => {
    const code = generateCode(config.mode === 'pvp' ? 'PVP' : 'DG');
    const newRoom = {
      code,
      name: config.name || `Комната #${code}`,
      isPrivate: !!config.isPrivate,
      password: config.password || '',
      hostName: config.hostName || currentUser.name,
      hostId: currentUser.id,
      maxPlayers: config.maxPlayers || 2,
      mode: config.mode || 'dungeon',
      players: [{
        id: currentUser.id,
        socketId: socket.id,
        name: currentUser.name,
        hero: config.hero || currentUser.hero,
        isHost: true,
        isReady: true
      }],
      lastPing: Date.now(),
      floorSeed: Math.floor(Math.random() * 1000000)
    };

    activeRooms.set(code, newRoom);
    currentUser.roomCode = code;
    socket.join(code);

    socket.emit('room_created', { success: true, room: newRoom });
  });

  socket.on('join_room', (data) => {
    const room = activeRooms.get(data.code);
    if (!room) {
      return socket.emit('room_error', { message: 'Комната не найдена или закрыта' });
    }

    if (room.isPrivate && room.password && room.password !== data.password) {
      return socket.emit('room_error', { message: 'Неверный пароль комнаты' });
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit('room_error', { message: 'Комната уже заполнена (8/8)' });
    }

    const playerMeta = {
      id: currentUser.id,
      socketId: socket.id,
      name: data.playerName || currentUser.name,
      hero: data.hero || currentUser.hero,
      isHost: false,
      isReady: false
    };

    room.players.push(playerMeta);
    room.lastPing = Date.now();
    currentUser.roomCode = room.code;
    socket.join(room.code);

    socket.emit('room_joined', {
      success: true,
      room,
      yourId: currentUser.id,
      isHost: false
    });

    socket.to(room.code).emit('player_joined_room', playerMeta);
  });

  // 3. RANKED MATCHMAKING (1v1 & 2v2)
  socket.on('start_matchmaking', (data) => {
    const mode = data.mode || '1v1'; // '1v1' or '2v2'
    const targetCount = mode === '2v2' ? 4 : 2;

    const queueEntry = {
      socketId: socket.id,
      user: currentUser,
      mode,
      joinedAt: Date.now()
    };

    matchmakingQueue.push(queueEntry);
    socket.emit('matchmaking_status', { status: 'searching', count: matchmakingQueue.length, target: targetCount });

    // Check for match
    const eligible = matchmakingQueue.filter(e => e.mode === mode);
    if (eligible.length >= targetCount) {
      const matchPlayers = eligible.splice(0, targetCount);
      // Remove matched from global queue
      matchPlayers.forEach(p => {
        const idx = matchmakingQueue.findIndex(q => q.socketId === p.socketId);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);
      });

      const matchCode = generateCode('MATCH');
      const matchRoom = {
        code: matchCode,
        name: `Арена ${mode.toUpperCase()}`,
        isPrivate: true,
        hostId: matchPlayers[0].user.id,
        maxPlayers: targetCount,
        mode: 'pvp_ranked',
        players: matchPlayers.map((p, idx) => ({
          id: p.user.id,
          socketId: p.socketId,
          name: p.user.name,
          rating: p.user.rating,
          team: targetCount === 4 ? (idx < 2 ? 'blue' : 'red') : (idx === 0 ? 'blue' : 'red'),
          isReady: false,
          hero: 'char_zaza'
        })),
        lastPing: Date.now()
      };

      activeRooms.set(matchCode, matchRoom);

      matchPlayers.forEach(p => {
        const s = io.sockets.sockets.get(p.socketId);
        if (s) {
          s.join(matchCode);
          onlineUsers.get(p.socketId).roomCode = matchCode;
          s.emit('match_found', { matchRoom });
        }
      });
    }
  });

  socket.on('cancel_matchmaking', () => {
    const idx = matchmakingQueue.findIndex(q => q.socketId === socket.id);
    if (idx !== -1) {
      matchmakingQueue.splice(idx, 1);
    }
    socket.emit('matchmaking_canceled');
  });

  // 4. PRE-MATCH HERO SELECT TIMER & LOCK-IN
  socket.on('hero_selected', (data) => {
    if (!currentUser.roomCode) return;
    const room = activeRooms.get(currentUser.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === currentUser.id);
    if (player) {
      player.hero = data.hero;
      player.isReady = !!data.confirmed;
      io.to(room.code).emit('hero_select_update', { players: room.players });

      // Check if all confirmed
      if (room.players.every(p => p.isReady)) {
        io.to(room.code).emit('all_heroes_locked', {
          room,
          floorSeed: room.floorSeed || Math.floor(Math.random() * 1000000)
        });
      }
    }
  });

  // 5. HOST AUTHORITY DUNGEON & COMBAT SYNC
  socket.on('dungeon_sync_host_mobs', (data) => {
    if (currentUser.roomCode) {
      socket.to(currentUser.roomCode).emit('dungeon_mobs_updated', data);
    }
  });

  socket.on('dungeon_player_action', (data) => {
    if (currentUser.roomCode) {
      socket.to(currentUser.roomCode).emit('dungeon_peer_action', {
        senderId: currentUser.id,
        ...data
      });
    }
  });

  socket.on('dungeon_group_pull', (data) => {
    if (currentUser.roomCode) {
      io.to(currentUser.roomCode).emit('dungeon_group_pulled', data);
    }
  });

  socket.on('dungeon_revive_ally', (data) => {
    if (currentUser.roomCode) {
      io.to(currentUser.roomCode).emit('dungeon_ally_revived', data);
    }
  });

  socket.on('dungeon_perk_confirmed', (data) => {
    if (!currentUser.roomCode) return;
    const room = activeRooms.get(currentUser.roomCode);
    if (!room) return;

    const p = room.players.find(pl => pl.id === currentUser.id);
    if (p) p.perkReady = true;

    if (room.players.every(pl => pl.perkReady)) {
      io.to(room.code).emit('dungeon_perks_all_confirmed');
    }
  });

  // 6. PVP ARENA COMBAT SYNC
  socket.on('pvp_ability_cast', (data) => {
    if (currentUser.roomCode) {
      socket.to(currentUser.roomCode).emit('pvp_peer_ability', {
        senderId: currentUser.id,
        ...data
      });
    }
  });

  socket.on('pvp_hit_applied', (data) => {
    if (currentUser.roomCode) {
      io.to(currentUser.roomCode).emit('pvp_health_updated', data);
    }
  });

  socket.on('pvp_match_ended', (data) => {
    if (!currentUser.roomCode) return;
    io.to(currentUser.roomCode).emit('pvp_match_results', data);
  });

  // 7. DISCONNECT & FAIL-SAFE CLEANUP
  socket.on('disconnect', () => {
    // Remove from matchmaking queue
    const qIdx = matchmakingQueue.findIndex(q => q.socketId === socket.id);
    if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);

    if (currentUser.roomCode) {
      const room = activeRooms.get(currentUser.roomCode);
      if (room) {
        room.players = room.players.filter(p => p.socketId !== socket.id);
        
        if (room.players.length === 0) {
          activeRooms.delete(currentUser.roomCode);
        } else {
          // Notify room members
          io.to(room.code).emit('player_disconnected_fail_safe', {
            disconnectedId: currentUser.id,
            disconnectedName: currentUser.name,
            isHostDisconnected: currentUser.id === room.hostId,
            remainingCount: room.players.length
          });

          // Reassign host if host left
          if (currentUser.id === room.hostId && room.players[0]) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
            io.to(room.code).emit('host_reassigned', { newHostId: room.hostId });
          }
        }
      }

      // Check tavern pools
      const tavern = tavernPools.get(currentUser.roomCode);
      if (tavern) {
        tavern.players = tavern.players.filter(p => p.socketId !== socket.id);
        socket.to(tavern.id).emit('tavern_player_left', { id: currentUser.id });
        if (tavern.players.length === 0) {
          tavernPools.delete(tavern.id);
        }
      }
    }

    onlineUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Retro Revival] Game Server running on port ${PORT}`);
});
