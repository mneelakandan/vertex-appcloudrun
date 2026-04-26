// src/services/api.js
// Talks to the backend Cloud Run service

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

/**
 * Fetch the list of supported models from the backend.
 */
export async function fetchModels() {
  const res = await fetch(`${BASE_URL}/api/chat/models`);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data = await res.json();
  return data.models;
}

/**
 * Send a chat message to the backend → Vertex AI.
 * @param {string} message
 * @param {string} model
 * @param {Array}  history  [{role, content}]
 */
export async function sendMessage(message, model, history = []) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, model, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  return res.json(); // { text, model, usageMetadata }
}

/**
 * Health check.
 */
export async function healthCheck() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}
