// src/hooks/useChat.js
import { useState, useCallback } from 'react';
import { sendMessage } from '../services/api';

const uid = () => Math.random().toString(36).slice(2, 9);

export function useChat(model) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { id: uid(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    // Build history for the API (everything except the just-added user msg)
    const history = messages.map(m => ({ role: m.role, content: m.text }));

    try {
      const data = await sendMessage(text, model, history);
      setMessages(prev => [
        ...prev,
        {
          id:     uid(),
          role:   'assistant',
          text:   data.text,
          model:  data.model,
          tokens: data.usageMetadata,
          fresh:  true,
        },
      ]);
    } catch (err) {
      setError(err.message);
      // Remove the optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }, [messages, loading, model]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, send, clear };
}
