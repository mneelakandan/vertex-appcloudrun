// src/components/Message.jsx
import React, { useState, useEffect, useRef } from 'react';

function TypewriterText({ text, animate }) {
  const [shown, setShown] = useState(animate ? '' : text);
  const i = useRef(0);

  useEffect(() => {
    if (!animate) { setShown(text); return; }
    i.current = 0;
    setShown('');
    const iv = setInterval(() => {
      i.current += 3;
      setShown(text.slice(0, i.current));
      if (i.current >= text.length) clearInterval(iv);
    }, 10);
    return () => clearInterval(iv);
  }, [text, animate]);

  return (
    <>
      {shown}
      {animate && shown.length < text.length && <span className="cursor">▌</span>}
    </>
  );
}

export default function Message({ msg, isLast }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`msg msg--${msg.role}`}>
      <div className="msg-avatar">{isUser ? 'YOU' : 'AI'}</div>
      <div className="msg-body">
        <div className="msg-bubble">
          {isUser
            ? msg.text
            : <TypewriterText text={msg.text} animate={msg.fresh && isLast} />
          }
        </div>
        {msg.tokens && (
          <div className="msg-meta">
            {msg.model} · {msg.tokens.promptTokenCount}↑ {msg.tokens.candidatesTokenCount}↓ tok
          </div>
        )}
      </div>
    </div>
  );
}
