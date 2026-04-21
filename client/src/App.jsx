import { useState } from 'react';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';

// page: 'home' | 'lobby' | 'game'
export default function App() {
  const [page, setPage] = useState('home');
  const [gameState, setGameState] = useState(null);

  function goToLobby(state) {
    setGameState(state);
    setPage('lobby');
  }

  function goToGame(state) {
    setGameState(prev => ({ ...prev, ...state }));
    setPage('game');
  }

  function goHome() {
    setGameState(null);
    setPage('home');
  }

  if (page === 'lobby') {
    return <Lobby gameState={gameState} setGameState={setGameState} onStart={goToGame} onLeave={goHome} />;
  }
  if (page === 'game') {
    return <Game gameState={gameState} setGameState={setGameState} onLeave={goHome} />;
  }
  return <Home onJoin={goToLobby} />;
}
