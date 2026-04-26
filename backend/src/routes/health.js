const express = require('express');
const router  = express.Router();

router.get('/', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'vertex-app-backend',
    project:   process.env.GCP_PROJECT_ID,
    location:  process.env.GCP_LOCATION || 'us-central1',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
