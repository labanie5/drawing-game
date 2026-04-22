import { useState, useEffect } from 'react';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';
import { connectSocket, getSocket, useSocketEvent } from './hooks/useSocket.js';

function getOrCreatePersistentId() {
  let id = localStorage.getItem('drawrace_pid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('drawrace_pid', id);
  }
  return id;
}

export default function App() {
  const [page, setPage] = useState('loading');
  const [gameState, setGameState] = useState(null);

  // Try to reconnect saved session on load
  useEffect(() => {
    const saved = localStorage.getItem('drawrace_session');
    if (!saved) { setPage('home'); return; }

    let session;
    try { session = JSON.parse(saved); } catch { setPage('home'); return; }

    const { code, name } = session;
    const persistentId = getOrCreatePersistentId();
    const socket = connectSocket();

    function handleJoined(data) {
      cleanup();
      if (!data.reconnected) { setPage('home'); return; }

      const myPlayer = data.players.find(p => p.persistentId === persistentId);
      const base = {
        socket,
        code: data.code,
        players: data.players,
        rounds: data.rounds,
        myId: socket.id,
        persistentId,
        isHost: myPlayer?.isHost ?? false,
      };

      if (data.gameStatus === 'playing' && data.roundInfo) {
        setGameState({ ...base, roundData: data.roundInfo, reconnectScores: data.scores });
        setPage('game');
      } else if (data.gameStatus === 'game-end') {
        setGameState(base);
        setPage('lobby');
      } else {
        setGameState(base);
        setPage('lobby');
      }
    }

    function handleError() {
      cleanup();
      localStorage.removeItem('drawrace_session');
      setPage('home');
    }

    function cleanup() {
      socket.off('room-joined', handleJoined);
      socket.off('error', handleError);
    }

    socket.on('room-joined', handleJoined);
    socket.on('error', handleError);
    socket.emit('join-room', { code, name, persistentId });

    // Timeout fallback — if server doesn't respond in 4s, go home
    const timeout = setTimeout(() => {
      cleanup();
      localStorage.removeItem('drawrace_session');
      setPage('home');
    }, 4000);

    return () => { clearTimeout(timeout); cleanup(); };
  }, []);

  function goToLobby(state) {
    setGameState(state);
    setPage('lobby');
  }

  function goToGame(state) {
    setGameState(prev => ({ ...prev, ...state }));
    setPage('game');
  }

  // Re-join room automatically when socket reconnects (e.g. switching apps on mobile)
  useEffect(() => {
    if (page === 'home' || page === 'loading') return;
    const socket = getSocket();

    function handleReconnect() {
      const saved = localStorage.getItem('drawrace_session');
      if (!saved) return;
      try {
        const { code, name } = JSON.parse(saved);
        const persistentId = getOrCreatePersistentId();
        socket.emit('join-room', { code, name, persistentId });
      } catch {}
    }

    socket.io.on('reconnect', handleReconnect);
    return () => socket.io.off('reconnect', handleReconnect);
  }, [page]);

  function goHome() {
    localStorage.removeItem('drawrace_session');
    setGameState(null);
    setPage('home');
  }

  if (page === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Reconnecting...</div>
      </div>
    );
  }
  if (page === 'lobby') return <Lobby gameState={gameState} setGameState={setGameState} onStart={goToGame} onLeave={goHome} />;
  if (page === 'game') return <Game gameState={gameState} setGameState={setGameState} onLeave={goHome} />;
  return <Home onJoin={goToLobby} />;
}
