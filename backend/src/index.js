const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const chatRouter   = require('./routes/chat');
const healthRouter = require('./routes/health');

const app  = express();
const PORT = process.env.PORT || 8080;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '4mb' }));

// CORS — allow the frontend Cloud Run service (set via env)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');
app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/chat', chatRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  Backend running on port ${PORT}`);
  console.log(`   Project  : ${process.env.GCP_PROJECT_ID}`);
  console.log(`   Location : ${process.env.GCP_LOCATION || 'us-central1'}`);
  console.log(`   Origins  : ${ALLOWED_ORIGINS.join(', ')}`);
});
