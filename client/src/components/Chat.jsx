import { useState, useEffect, useRef } from 'react';

export default function Chat({ messages, onGuess, disabled, placeholder }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    onGuess(text);
    setInput('');
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg ${m.correct ? 'correct' : ''} ${m.isAI ? 'ai-msg' : ''}`}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="input chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder || 'Type your guess...'}
          disabled={disabled}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={disabled}>
          Go
        </button>
      </form>
    </div>
  );
}
