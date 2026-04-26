import React, { useState, useEffect, useRef } from 'react';
import ModelPicker from './components/ModelPicker';
import Message    from './components/Message';
import ChatInput  from './components/ChatInput';
import { useChat } from './hooks/useChat';
import { fetchModels, healthCheck } from './services/api';
import './App.css';

const STARTERS = [
  'What can Vertex AI do?',
  'Write a haiku about Cloud Run',
  'Explain transformers simply',
  'Compare GCP regions for latency',
];

export default function App() {
  const [models,  setModels]  = useState(['gemini-1.5-flash']);
  const [model,   setModel]   = useState('gemini-1.5-flash');
  const [input,   setInput]   = useState('');
  const [online,  setOnline]  = useState(null); // null=checking, true, false
  const bottomRef             = useRef(null);

  const { messages, loading, error, send, clear } = useChat(model);

  // Load models + health on mount
  useEffect(() => {
    healthCheck()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));

    fetchModels()
      .then(setModels)
      .catch(() => {}); // keep default
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    send(input);
    setInput('');
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <span className="brand-gem">✦</span>
          <span className="brand-name">Gemini<em>Chat</em></span>
          <span className={`conn-dot conn-dot--${online === null ? 'wait' : online ? 'on' : 'off'}`}
                title={online === null ? 'Checking…' : online ? 'Backend connected' : 'Backend unreachable'} />
        </div>

        <div className="header-controls">
          <ModelPicker models={models} selected={model} onChange={setModel} />
          {messages.length > 0 && (
            <button className="btn-clear" onClick={clear}>Clear</button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <main className="chat-body">
        {messages.length === 0 ? (
          <div className="empty">
            <div className="empty-gem">✦</div>
            <h1>Ask Gemini anything</h1>
            <p className="empty-sub">
              React frontend → Express backend → Vertex AI · Each on its own Cloud Run service
            </p>
            <div className="starter-grid">
              {STARTERS.map(q => (
                <button key={q} className="starter-chip"
                  onClick={() => { setInput(q); }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <Message key={msg.id} msg={msg} isLast={i === messages.length - 1} />
            ))}

            {loading && (
              <div className="msg msg--assistant">
                <div className="msg-avatar">AI</div>
                <div className="msg-body">
                  <div className="msg-bubble">
                    <span className="dots"><span/><span/><span/></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="error-toast">⚠ {error}</div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* ── Input ── */}
      <footer className="chat-footer">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          loading={loading}
          disabled={online === false}
        />
        {online === false && (
          <p className="offline-warn">
            ⚠ Cannot reach backend. Set <code>REACT_APP_BACKEND_URL</code> correctly.
          </p>
        )}
      </footer>
    </div>
  );
}
