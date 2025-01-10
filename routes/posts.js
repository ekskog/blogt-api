const debug = require('debug')('blogt-api:posts-route');

const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs').promises;
const postsDir = path.join(__dirname, '..', 'posts');
debug('Posts directory:', postsDir);

const {
  findLatestPost,
  getFivePosts,
  formatDate, formatDates
} = require('../utils/utils');


/* GET home page. */
router.get('/', async (req, res) => {
  const { latestPostPath, latestPostDate } = await findLatestPost();
  var dateString = await formatDate(latestPostDate);
  debug(`[MAIN] Latest post date: ${latestPostDate}`)

  if (!latestPostPath) {
    return res.status(404).json({ error: 'No posts found' });
  } else
  {
    let postsArray = await getFivePosts(dateString);
    res.send(postsArray);
  }
});

router.get('/from/:startDate', async (req, res) => {
  const { startDate } = req.params;
  const { latestPostDate, latestPostPath } = await formatDates(startDate);

  var dateString = await formatDate(latestPostDate);
  debug(`[MAIN] Latest post date: ${latestPostDate}`)

  if (!latestPostPath) {
    return res.status(404).json({ error: 'No posts found' });
  } else
  {
    let postsArray = await getFivePosts(dateString);
    res.send(postsArray);  }
});

router.get('/:dateString', async (req, res) => {
  const { dateString } = req.params;

  // Ensure dateString is in the format YYYYMMDD
  if (!/^\d{8}$/.test(dateString)) {
    return res.status(400).send('Invalid date format. Use YYYYMMDD.');
  }

  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);

  // Use moment to ensure we are manipulating only the date (start of the day)
  let filePath = path.join(postsDir, year, month, `${day}.md`);
  debug('File path:', filePath);

  const postsArray = [];

  try {
    console.log('Reading file:', filePath);
    const data = await fs.readFile(filePath, 'utf-8');
    postsArray.push(data);
    // Send the file content as response  
    res.send(postsArray);
  } catch (err) {
    console.error('Error reading post file:', err);
    res.status(404).send('Post not found');
  }
});

module.exports = router;
