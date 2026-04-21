export default function Scoreboard({ scores }) {
  if (!scores || scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard">
      <h4 className="scoreboard-title">Scores</h4>
      {sorted.map((p, i) => (
        <div key={p.name} className="score-row">
          <span className="score-rank">#{i + 1}</span>
          <span className="score-name">{p.name}</span>
          <span className="score-pts">{p.score}</span>
        </div>
      ))}
    </div>
  );
}
