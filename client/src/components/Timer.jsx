export default function Timer({ seconds }) {
  const urgent = seconds <= 10;
  const pct = Math.max(0, (seconds / 80) * 100);

  return (
    <div className={`timer ${urgent ? 'urgent' : ''}`}>
      <div className="timer-bar-bg">
        <div
          className="timer-bar-fill"
          style={{ width: `${pct}%`, background: urgent ? '#ef4444' : '#3b82f6' }}
        />
      </div>
      <span className="timer-seconds">{seconds}s</span>
    </div>
  );
}
