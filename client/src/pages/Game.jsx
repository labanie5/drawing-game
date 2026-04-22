import { useState, useRef, useEffect } from 'react';
import { useSocketEvent } from '../hooks/useSocket.js';
import Canvas from '../components/Canvas.jsx';
import ViewCanvas from '../components/ViewCanvas.jsx';
import AIPanel from '../components/AIPanel.jsx';
import Chat from '../components/Chat.jsx';
import Timer from '../components/Timer.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import RoundResult from '../components/RoundResult.jsx';

export default function Game({ gameState, setGameState, onLeave }) {
  const { socket, myId, rounds: totalRounds, roundData: initRoundData } = gameState;

  const [roundData, setRoundData] = useState(initRoundData);
  const [seconds, setSeconds] = useState(80);
  const [messages, setMessages] = useState([]);
  const [scores, setScores] = useState(gameState.reconnectScores || []);
  const [roundResult, setRoundResult] = useState(null); // { word, winnerName, aiWon, scores }
  const [gameOver, setGameOver] = useState(null);       // { finalScores }
  const [roundEnded, setRoundEnded] = useState(false);

  const viewCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);

  const isDrawer = roundData?.drawerId === myId;
  const activeCanvasRef = isDrawer ? drawCanvasRef : viewCanvasRef;

  // ── Socket events ─────────────────────────────────────────────
  useSocketEvent('round-start', (data) => {
    setRoundData(data);
    setRoundResult(null);
    setRoundEnded(false);
    setMessages([]);
    setSeconds(80);
  });

  useSocketEvent('timer-tick', ({ seconds }) => setSeconds(seconds));

  useSocketEvent('stroke', (stroke) => {
    if (!isDrawer) replayStroke(viewCanvasRef.current, stroke);
  });

  useSocketEvent('canvas-clear', () => {
    clearCanvas(viewCanvasRef.current);
  });

  useSocketEvent('canvas-sync', ({ strokes }) => {
    const canvas = isDrawer ? drawCanvasRef.current : viewCanvasRef.current;
    if (!canvas) return;
    clearCanvas(canvas);
    strokes.forEach(s => replayStroke(canvas, s));
  });

  useSocketEvent('guess-result', ({ name, guess, correct, isAI }) => {
    const icon = correct ? '✅' : '❌';
    const tag = isAI ? '[AI]' : '';
    setMessages(prev => [...prev, { text: `${tag} ${name}: ${guess} ${icon}`, correct, isAI }]);
  });

  useSocketEvent('round-end', (data) => {
    setRoundResult(data);
    setScores(data.scores);
    setRoundEnded(true);
  });

  useSocketEvent('game-end', ({ finalScores }) => {
    setGameOver({ finalScores });
  });

  useSocketEvent('player-update', ({ players }) => {
    setScores(players.map(p => ({ name: p.name, score: p.score })));
  });

  // ── Canvas helpers ────────────────────────────────────────────
  function clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function replayStroke(canvas, stroke) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
  }

  // ── AI win handler ────────────────────────────────────────────
  function handleAIWin(label) {
    socket.emit('submit-guess', { guess: label, isAI: true });
  }

  // ── Submit guess ──────────────────────────────────────────────
  function handleGuess(text) {
    socket.emit('submit-guess', { guess: text });
  }

  // ── Restart ───────────────────────────────────────────────────
  function handleRestart() {
    socket.emit('restart-game');
    setGameOver(null);
    setRoundResult(null);
    setRoundEnded(false);
    setMessages([]);
    setScores([]);
  }

  // ── Game over screen ──────────────────────────────────────────
  if (gameOver) {
    return (
      <div className="gameover-page">
        <h1>🏆 Game Over!</h1>
        <div className="final-scores">
          {gameOver.finalScores.map((p, i) => (
            <div key={p.name} className={`final-score-row rank-${i + 1}`}>
              <span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span className="player-name">{p.name}</span>
              <span className="score">{p.score} pts</span>
            </div>
          ))}
        </div>
        <div className="gameover-actions">
          <button className="btn btn-primary" onClick={handleRestart}>Play Again</button>
          <button className="btn btn-ghost" onClick={onLeave}>Leave</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      {/* Top bar */}
      <div className="game-topbar">
        <span className="round-indicator">
          Round {roundData?.round} / {totalRounds}
        </span>
        <span className="drawer-info">
          {isDrawer
            ? <span>Draw: <strong className="secret-word">{roundData?.word}</strong></span>
            : <span>✏️ <strong>{roundData?.drawerName}</strong> is drawing</span>
          }
        </span>
        <Timer seconds={seconds} />
      </div>

      <div className="game-body">
        {/* Canvas area */}
        <div className="canvas-area">
          {isDrawer ? (
            <Canvas
              canvasRef={drawCanvasRef}
              socket={socket}
              disabled={roundEnded}
            />
          ) : (
            <ViewCanvas canvasRef={viewCanvasRef} />
          )}
        </div>

        {/* Side panel */}
        <div className="side-panel">
          <AIPanel
            canvasRef={activeCanvasRef}
            currentWord={isDrawer ? roundData?.word : null}
            isActive={!!roundData && !roundEnded}
            onAIWin={isDrawer ? handleAIWin : null}
          />
          <Scoreboard scores={scores} myId={myId} />
          <Chat
            messages={messages}
            onGuess={handleGuess}
            disabled={isDrawer || roundEnded}
            placeholder={isDrawer ? 'You are drawing!' : 'Type your guess...'}
          />
        </div>
      </div>

      {/* Round result overlay */}
      {roundResult && (
        <RoundResult result={roundResult} />
      )}
    </div>
  );
}
