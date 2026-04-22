const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const gm = require('./gameManager');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Track which room each socket is in
const socketRoom = new Map(); // socketId -> roomCode

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Create Room ──────────────────────────────────────────────
  socket.on('create-room', ({ name, rounds, persistentId }) => {
    const room = gm.createRoom({ hostId: socket.id, hostName: name, rounds, persistentId });
    socket.join(room.code);
    socketRoom.set(socket.id, room.code);
    socket.emit('room-created', {
      code: room.code,
      players: room.players,
      rounds: room.rounds.total,
    });
    console.log(`[room] ${name} created ${room.code}`);
  });

  // ── Join Room ────────────────────────────────────────────────
  socket.on('join-room', ({ code, name, persistentId }) => {
    const result = gm.joinRoom({ code: code.toUpperCase(), playerId: socket.id, playerName: name, persistentId });
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    const room = result.room;
    socket.join(room.code);
    socketRoom.set(socket.id, room.code);

    if (result.reconnected) {
      // Send full game state to reconnecting player
      const state = gm.getGameState(room.code, socket.id);
      socket.emit('room-joined', {
        code: room.code,
        players: room.players,
        rounds: room.rounds.total,
        reconnected: true,
        gameStatus: state.status,
        roundInfo: state.roundInfo,
        scores: state.scores,
      });
      socket.to(room.code).emit('player-update', { players: room.players });
      console.log(`[room] ${name} reconnected to ${room.code}`);
    } else {
      socket.emit('room-joined', { code: room.code, players: room.players, rounds: room.rounds.total });
      socket.to(room.code).emit('player-update', { players: room.players });
      console.log(`[room] ${name} joined ${room.code}`);
    }

    if (room.strokes.length > 0) {
      socket.emit('canvas-sync', { strokes: room.strokes });
    }
  });

  // ── Start Game ───────────────────────────────────────────────
  socket.on('start-game', () => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const result = gm.startGame(code, io);
    if (result.error) socket.emit('error', { message: result.error });
  });

  // ── Drawing Events ───────────────────────────────────────────
  socket.on('draw-stroke', (stroke) => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    gm.addStroke(code, stroke);
    socket.to(code).emit('stroke', stroke);
  });

  socket.on('draw-clear', () => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    gm.clearStrokes(code);
    socket.to(code).emit('canvas-clear');
  });

  socket.on('draw-undo', () => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const strokes = gm.undoStrokes(code);
    io.to(code).emit('canvas-sync', { strokes });
  });

  // ── Guess ────────────────────────────────────────────────────
  socket.on('submit-guess', ({ guess, isAI }) => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    gm.handleGuess(code, socket.id, guess, !!isAI, io);
  });

  // ── Restart ──────────────────────────────────────────────────
  socket.on('restart-game', () => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const result = gm.restartGame(code, io);
    if (result.error) socket.emit('error', { message: result.error });
    else {
      const room = gm.getRoom(code);
      io.to(code).emit('player-update', { players: room.players });
      io.to(code).emit('game-restarted');
    }
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socketRoom.get(socket.id);
    socketRoom.delete(socket.id);
    if (!code) return;
    const room = gm.removePlayer(code, socket.id);
    if (room) {
      io.to(code).emit('player-update', { players: room.players });
    }
    console.log(`[disconnect] ${socket.id} left ${code}`);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
