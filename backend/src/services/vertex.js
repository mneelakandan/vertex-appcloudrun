const { VertexAI } = require('@google-cloud/vertexai');

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION   = process.env.GCP_LOCATION || 'us-central1';

if (!PROJECT_ID) {
  console.error('FATAL: GCP_PROJECT_ID env var is required');
  process.exit(1);
}

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

const SUPPORTED_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-001',
];

/**
 * Send a chat message to Vertex AI Gemini.
 * @param {string} message        - The user's message
 * @param {string} model          - Gemini model ID
 * @param {Array}  history        - [{role, content}]  prior turns
 * @returns {{ text, model, usageMetadata }}
 */
async function sendChat(message, model = 'gemini-1.5-flash', history = []) {
  if (!SUPPORTED_MODELS.includes(model)) {
    throw new Error(`Unsupported model: ${model}. Allowed: ${SUPPORTED_MODELS.join(', ')}`);
  }

  const generativeModel = vertexAI.getGenerativeModel({
    model,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
    },
    safetySettings: SAFETY_SETTINGS,
  });

  const chat = generativeModel.startChat({
    history: history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })),
  });

  const result   = await chat.sendMessage(message);
  const response = await result.response;
  const text     = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return { text, model, usageMetadata: response.usageMetadata ?? null };
}

module.exports = { sendChat, SUPPORTED_MODELS };
