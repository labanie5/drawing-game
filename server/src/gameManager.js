const { getRandomWord } = require('./words');

const ROUND_DURATION = 80; // seconds

// rooms: Map<code, RoomState>
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom({ hostId, hostName, rounds }) {
  const code = generateCode();
  const room = {
    code,
    players: [{ id: hostId, name: hostName, score: 0, isHost: true }],
    status: 'lobby',
    rounds: { total: Math.min(5, Math.max(3, rounds || 3)), current: 0 },
    drawerIndex: 0,
    currentWord: null,
    strokes: [],
    timer: null,
    usedWords: [],
    roundWinner: null,
    aiWon: false,
  };
  rooms.set(code, room);
  return room;
}

function joinRoom({ code, playerId, playerName }) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.find(p => p.id === playerId)) return { room }; // reconnect
  if (room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
    return { error: 'Name already taken in this room' };
  }
  room.players.push({ id: playerId, name: playerName, score: 0, isHost: false });
  return { room };
}

function removePlayer(code, playerId) {
  const room = rooms.get(code);
  if (!room) return null;
  room.players = room.players.filter(p => p.id !== playerId);
  // Transfer host if needed
  if (room.players.length > 0 && !room.players.find(p => p.isHost)) {
    room.players[0].isHost = true;
  }
  if (room.players.length === 0) {
    clearRoomTimer(room);
    rooms.delete(code);
    return null;
  }
  return room;
}

function startGame(code, io) {
  const room = rooms.get(code);
  if (!room || room.status !== 'lobby') return { error: 'Cannot start game' };
  if (room.players.length < 2) return { error: 'Need at least 2 players' };

  room.status = 'playing';
  room.rounds.current = 0;
  room.drawerIndex = 0;
  room.usedWords = [];

  startRound(code, io);
  return { ok: true };
}

function startRound(code, io) {
  const room = rooms.get(code);
  if (!room) return;

  room.rounds.current += 1;
  room.strokes = [];
  room.roundWinner = null;
  room.aiWon = false;
  room.currentWord = getRandomWord(room.usedWords);
  room.usedWords.push(room.currentWord);

  const drawer = room.players[room.drawerIndex % room.players.length];

  // Send round-start to everyone; word only to drawer
  room.players.forEach(player => {
    const payload = {
      round: room.rounds.current,
      totalRounds: room.rounds.total,
      drawerName: drawer.name,
      drawerId: drawer.id,
    };
    if (player.id === drawer.id) {
      payload.word = room.currentWord;
    }
    io.to(player.id).emit('round-start', payload);
  });

  // Start countdown
  let seconds = ROUND_DURATION;
  io.to(code).emit('timer-tick', { seconds });

  room.timer = setInterval(() => {
    seconds -= 1;
    io.to(code).emit('timer-tick', { seconds });
    if (seconds <= 0) {
      endRound(code, io, null, false);
    }
  }, 1000);
}

function handleGuess(code, playerId, guess, isAI, io) {
  const room = rooms.get(code);
  if (!room || room.status !== 'playing') return;

  const drawer = room.players[room.drawerIndex % room.players.length];
  if (playerId === drawer.id && !isAI) return; // drawer can't guess

  const player = isAI
    ? { id: 'ai', name: 'The AI' }
    : room.players.find(p => p.id === playerId);
  if (!player) return;

  const correct = guess.trim().toLowerCase() === room.currentWord.toLowerCase();

  io.to(code).emit('guess-result', {
    name: player.name,
    guess: correct ? room.currentWord : guess,
    correct,
    isAI,
  });

  if (correct) {
    endRound(code, io, player, isAI);
  }
}

function endRound(code, io, winner, aiWon) {
  const room = rooms.get(code);
  if (!room) return;

  clearRoomTimer(room);
  room.status = 'round-end';

  const drawer = room.players[room.drawerIndex % room.players.length];

  // Score
  if (winner && !aiWon) {
    winner.score += 3;
    drawer.score += 2;
  } else if (winner && aiWon) {
    // AI won — no points
  }

  const scores = room.players.map(p => ({ name: p.name, score: p.score }));

  io.to(code).emit('round-end', {
    word: room.currentWord,
    winnerName: winner ? winner.name : null,
    aiWon,
    scores,
  });

  // Advance drawer index
  room.drawerIndex = (room.drawerIndex + 1) % room.players.length;

  // Check if game over
  if (room.rounds.current >= room.rounds.total) {
    setTimeout(() => endGame(code, io), 4000);
  } else {
    setTimeout(() => {
      room.status = 'playing';
      startRound(code, io);
    }, 4000);
  }
}

function endGame(code, io) {
  const room = rooms.get(code);
  if (!room) return;

  room.status = 'game-end';
  clearRoomTimer(room);

  const finalScores = [...room.players]
    .sort((a, b) => b.score - a.score)
    .map(p => ({ name: p.name, score: p.score, isHost: p.isHost }));

  io.to(code).emit('game-end', { finalScores });
}

function clearRoomTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function addStroke(code, stroke) {
  const room = rooms.get(code);
  if (room) room.strokes.push(stroke);
}

function clearStrokes(code) {
  const room = rooms.get(code);
  if (room) room.strokes = [];
}

function undoStrokes(code) {
  const room = rooms.get(code);
  if (!room) return [];
  // Remove last stroke batch (grouped by same timestamp batch marker)
  const last = room.strokes[room.strokes.length - 1];
  if (!last) return [];
  const batchId = last.batchId;
  room.strokes = room.strokes.filter(s => s.batchId !== batchId);
  return room.strokes;
}

function restartGame(code, io) {
  const room = rooms.get(code);
  if (!room || room.status !== 'game-end') return { error: 'Game not over yet' };
  room.status = 'lobby';
  room.rounds.current = 0;
  room.players.forEach(p => (p.score = 0));
  room.strokes = [];
  room.usedWords = [];
  room.drawerIndex = 0;
  return { ok: true };
}

module.exports = {
  createRoom,
  joinRoom,
  removePlayer,
  startGame,
  handleGuess,
  getRoom,
  addStroke,
  clearStrokes,
  undoStrokes,
  restartGame,
};
