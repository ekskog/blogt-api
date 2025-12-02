const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const {
  findLatestPost,
  getPostsArray,
  formatDate
} = require('../utils/utils');

// Simple function to escape XML
function xmlEscape(str) {
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Example blog meta
defaultTitle = 'My Blog RSS Feed';
defaultDesc = 'Recent updates to My Blog';
defaultSiteUrl = 'http://localhost:3000'; // Change if deployed

router.get('/', async (req, res) => {
  try {
    // Find the latest post date, format as DDMMYYYY
    const { latestPostDate, latestPostPath } = await findLatestPost();
    if (!latestPostPath || !latestPostDate) {
      // Respond with a valid but empty feed
      const rss = `<?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0">
          <channel>
            <title>${defaultTitle}</title>
            <description>${defaultDesc}</description>
            <link>${defaultSiteUrl}/</link>
            <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
          </channel>
        </rss>`;
      res.header('Content-Type', 'application/rss+xml');
      res.status(200).send(rss);
      return;
    }
    const latestDateString = await formatDate(latestPostDate);

    // Get up to 10 latest posts (raw Markdown)
    const posts = await getPostsArray(latestDateString);

    // For demonstration, let each post's content be its <title> and <description> (can upgrade to parse actual title)
    // In real apps, you'd parse the Markdown to get post titles, excerpts, etc.
    const items = posts.map((body, idx) => {
      const pubDate = new Date(Date.now() - idx * 86400000).toUTCString();
      return `<item>
        <title>Blog Entry #${idx + 1}</title>
        <description>${xmlEscape(body.slice(0, 400))}</description>
        <link>${defaultSiteUrl}/posts/${idx + 1}</link>
        <guid>${defaultSiteUrl}/posts/${idx + 1}</guid>
        <pubDate>${pubDate}</pubDate>
      </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>${defaultTitle}</title>
          <description>${defaultDesc}</description>
          <link>${defaultSiteUrl}/</link>
          <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
          ${items}
        </channel>
      </rss>`;
    res.header('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch(err) {
    console.error('RSS generation error:', err);
    res.status(500).send('Failed to generate RSS feed');
  }
});

module.exports = router;
