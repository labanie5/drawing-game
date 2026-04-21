export default function RoundResult({ result }) {
  const { word, winnerName, aiWon, scores } = result;

  return (
    <div className="round-result-overlay">
      <div className="round-result-card">
        {aiWon ? (
          <>
            <div className="result-icon">🤖</div>
            <h2 className="result-title ai-win">The AI Won!</h2>
            <p>The AI guessed <strong>{word}</strong> first.</p>
          </>
        ) : winnerName ? (
          <>
            <div className="result-icon">🎉</div>
            <h2 className="result-title human-win">{winnerName} got it!</h2>
            <p>The word was <strong>{word}</strong>. Beat the AI!</p>
          </>
        ) : (
          <>
            <div className="result-icon">⏰</div>
            <h2 className="result-title">Time's Up!</h2>
            <p>The word was <strong>{word}</strong>. Nobody guessed in time.</p>
          </>
        )}

        <div className="result-scores">
          {scores?.map(s => (
            <div key={s.name} className="result-score-row">
              <span>{s.name}</span>
              <span>{s.score} pts</span>
            </div>
          ))}
        </div>

        <p className="next-round-hint">Next round starting soon...</p>
      </div>
    </div>
  );
}
