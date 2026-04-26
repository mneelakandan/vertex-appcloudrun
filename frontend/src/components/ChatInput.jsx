// src/components/ChatInput.jsx
import React, { useRef, useEffect } from 'react';

export default function ChatInput({ value, onChange, onSend, loading, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!loading) ref.current?.focus();
  }, [loading]);

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <div className="chat-input-wrap">
      <textarea
        ref={ref}
        className="chat-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask Gemini anything… (Enter to send)"
        rows={1}
        disabled={loading || disabled}
      />
      <button
        className={`send-btn ${loading ? 'send-btn--spin' : ''}`}
        onClick={onSend}
        disabled={loading || !value.trim()}
        aria-label="Send"
      >
        {loading ? '◌' : '→'}
      </button>
    </div>
  );
}
