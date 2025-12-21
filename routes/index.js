const express = require('express');
const router = express.Router();

const { fetchBuckets } = require('../utils/media');
const fs = require('fs').promises;
const path = require('path');

/* GET home page. */
router.get('/', async (req, res, next) => {
  try {
    // Optional: fetch buckets for future use; ignore errors and render overview
    await fetchBuckets().catch(() => {});
    // Serve a simple HTML representation of the API overview markdown
    try {
      const mdPath = path.join(__dirname, '..', 'docs', 'api-overview.md');
      const md = await fs.readFile(mdPath, 'utf8');
      // Minimal markdown -> HTML conversion: escape and preserve code blocks and headings
      const html = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^\- \*\*(.*)\*\*: (.*)$/gm, '<p><strong>$1:</strong> $2</p>')
        .replace(/```[\s\S]*?```/g, (m) => '<pre>' + m.replace(/```/g, '') + '</pre>')
        .replace(/^- \*\*(.*)\*\*: `(.*)`/gm, '<li><strong>$1</strong>: <code>$2</code></li>')
      const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API Overview</title><style>body{font-family:system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial; padding:20px; } pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}</style></head><body><h1>Blogt API – Current Endpoints Overview</h1>${html}</body></html>`;
      res.type('html').send(page);
    } catch (readErr) {
      // If the docs are not available, fall back to a short message
      res.type('html').send('<html><body><h1>Blogt API</h1><p>API overview not available.</p></body></html>');
    }
  } catch (err) {
    next(err);
  }
});

// Return raw markdown of the API overview so clients can render a simplified view
router.get('/help.md', async (req, res) => {
  try {
    const mdPath = path.join(__dirname, '..', 'docs', 'api-overview.md');
    const md = await fs.readFile(mdPath, 'utf8');
    res.type('text/plain').send(md);
  } catch (err) {
    res.status(404).send('Not found');
  }
});

module.exports = router;
