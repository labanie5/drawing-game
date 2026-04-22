import { useState } from 'react';
import { connectSocket, useSocketEvent } from '../hooks/useSocket.js';

function getOrCreatePersistentId() {
  let id = localStorage.getItem('drawrace_pid');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('drawrace_pid', id); }
  return id;
}

function saveSession(code, name) {
  localStorage.setItem('drawrace_session', JSON.stringify({ code, name }));
}

export default function Home({ onJoin }) {
  const [view, setView] = useState('main');
  const [name, setName] = useState('');
  const [rounds, setRounds] = useState(3);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const socket = connectSocket();
  const persistentId = getOrCreatePersistentId();

  useSocketEvent('room-created', ({ code, players, rounds }) => {
    setLoading(false);
    saveSession(code, name.trim());
    onJoin({ socket, code, players, rounds, myId: socket.id, persistentId, isHost: true });
  });

  useSocketEvent('room-joined', ({ code, players, rounds }) => {
    setLoading(false);
    saveSession(code, name.trim());
    onJoin({ socket, code, players, rounds, myId: socket.id, persistentId, isHost: false });
  });

  useSocketEvent('error', ({ message }) => {
    setLoading(false);
    setError(message);
  });

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    setError('');
    setLoading(true);
    socket.emit('create-room', { name: name.trim(), rounds, persistentId });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!code.trim()) { setError('Enter a room code'); return; }
    setError('');
    setLoading(true);
    socket.emit('join-room', { code: code.trim().toUpperCase(), name: name.trim(), persistentId });
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-logo">🎨</div>
        <h1 className="home-title">DrawRace</h1>
        <p className="home-subtitle">Draw it before the AI figures it out!</p>
      </div>

      {view === 'main' && (
        <div className="home-buttons">
          <button className="btn btn-primary btn-lg" onClick={() => setView('create')}>Create Room</button>
          <button className="btn btn-secondary btn-lg" onClick={() => setView('join')}>Join Room</button>
        </div>
      )}

      {view === 'create' && (
        <form className="home-form" onSubmit={handleCreate}>
          <h2>Create a Room</h2>
          <label>Your Name</label>
          <input className="input" placeholder="e.g. Alex" value={name} onChange={e => setName(e.target.value)} maxLength={20} autoFocus />
          <label>Rounds: <strong>{rounds}</strong></label>
          <input type="range" min={3} max={5} value={rounds} onChange={e => setRounds(Number(e.target.value))} className="slider" />
          <div className="slider-labels"><span>3</span><span>4</span><span>5</span></div>
          {error && <p className="error-msg">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setView('main'); setError(''); }}>Back</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Room'}</button>
          </div>
        </form>
      )}

      {view === 'join' && (
        <form className="home-form" onSubmit={handleJoin}>
          <h2>Join a Room</h2>
          <label>Your Name</label>
          <input className="input" placeholder="e.g. Jordan" value={name} onChange={e => setName(e.target.value)} maxLength={20} autoFocus />
          <label>Room Code</label>
          <input className="input code-input" placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} />
          {error && <p className="error-msg">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setView('main'); setError(''); }}>Back</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Joining...' : 'Join Room'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
