const express       = require('express');
const { sendChat, SUPPORTED_MODELS } = require('../services/vertex');

const router = express.Router();

// GET /api/chat/models
router.get('/models', (_req, res) => {
  res.json({ models: SUPPORTED_MODELS });
});

// POST /api/chat
router.post('/', async (req, res, next) => {
  try {
    const { message, model, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: '`message` is required and must be a non-empty string' });
    }

    const result = await sendChat(message.trim(), model, history ?? []);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
