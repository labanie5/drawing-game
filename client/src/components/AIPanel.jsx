import { useQuickDraw } from '../hooks/useQuickDraw.js';

export default function AIPanel({ canvasRef, currentWord, isActive, onAIWin }) {
  const { aiGuesses, modelReady, modelError } = useQuickDraw({
    canvasRef,
    currentWord,
    isActive,
    onAIWin,
  });

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <span className="ai-icon">🤖</span>
        <span className="ai-title">AI is watching...</span>
        <span className={`ai-status ${modelReady ? 'ready' : 'loading'}`}>
          {modelError ? '⚠️ offline' : modelReady ? '● live' : '⏳ loading'}
        </span>
      </div>

      <div className="ai-guesses">
        {aiGuesses.length === 0 ? (
          <div className="ai-empty">
            {!modelReady && !modelError
              ? 'Loading AI model...'
              : !isActive
              ? 'Waiting for round to start...'
              : 'Start drawing — AI will guess!'}
          </div>
        ) : (
          aiGuesses.map((g, i) => (
            <div key={g.label} className={`ai-guess-row ${i === 0 ? 'top-guess' : ''}`}>
              <span className="ai-guess-label">{g.label}</span>
              <div className="confidence-bar-bg">
                <div
                  className="confidence-bar-fill"
                  style={{ width: `${(g.confidence * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="confidence-pct">{(g.confidence * 100).toFixed(0)}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
