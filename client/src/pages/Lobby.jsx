import { useState, useEffect } from 'react';
import { useSocketEvent } from '../hooks/useSocket.js';

export default function Lobby({ gameState, setGameState, onStart, onLeave }) {
  const { socket, code, players: initPlayers, rounds, myId, isHost } = gameState;
  const [players, setPlayers] = useState(initPlayers);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useSocketEvent('player-update', ({ players }) => setPlayers(players));

  useSocketEvent('round-start', (data) => {
    onStart({ roundData: data });
  });

  useSocketEvent('error', ({ message }) => setError(message));

  useSocketEvent('game-restarted', () => {
    // Already in lobby — just update players
  });

  function handleStart() {
    socket.emit('start-game');
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied('code');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyLink() {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied('link');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleLeave() {
    socket.disconnect();
    onLeave();
  }

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h1>🎨 DrawRace</h1>
        <button className="btn btn-ghost btn-sm" onClick={handleLeave}>Leave</button>
      </div>

      <div className="lobby-code-card">
        <p className="code-label">Room Code</p>
        <div className="code-display">{code}</div>
        <div className="lobby-share-buttons">
          <button className="btn btn-ghost btn-sm" onClick={handleCopyCode}>
            {copied === 'code' ? 'Copied!' : 'Copy Code'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
            {copied === 'link' ? 'Link Copied!' : 'Copy Invite Link'}
          </button>
        </div>
        <p className="code-hint">Share the invite link so friends can join instantly</p>
      </div>

      <div className="lobby-info">
        <span>Rounds: <strong>{rounds}</strong></span>
        <span>Players: <strong>{players.length}</strong></span>
      </div>

      <div className="player-list">
        <h3>Players</h3>
        {players.map(p => (
          <div key={p.id} className={`player-item ${p.id === myId ? 'me' : ''}`}>
            <span className="player-avatar">{p.name[0].toUpperCase()}</span>
            <span className="player-name">
              {p.name} {p.id === myId && '(you)'} {p.isHost && '👑'}
            </span>
          </div>
        ))}
      </div>

      {error && <p className="error-msg">{error}</p>}

      {isHost ? (
        <button
          className="btn btn-primary btn-lg"
          onClick={handleStart}
          disabled={players.length < 2}
        >
          {players.length < 2 ? 'Waiting for players...' : 'Start Game'}
        </button>
      ) : (
        <p className="waiting-msg">Waiting for host to start the game...</p>
      )}
    </div>
  );
}
