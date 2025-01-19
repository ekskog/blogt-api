const debug = require('debug')('blogt-api:posts-route');

const express = require('express');
const router = express.Router();

const path = require('path');
const fs = require('fs').promises;
const postsDir = path.join(__dirname, '..', 'posts');
debug('Posts directory:', postsDir);

const {
  findLatestPost,
  getPostsArray,
  formatDate, formatDates
} = require('../utils/utils');

router.get('/archives', async (req, res) => {
  let filePath = path.join(postsDir, `archive.json`);
  debug('File path:', filePath);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);
    res.json(jsonData);
  } catch (err) {
    console.error('Error reading archives file:', err);
    res.status(500).send('Failed to fetch archives.');
  }
});

router.get('/buildarchives', async (req, res) => {
  try {
    // Recursively build the archive structure
    const buildArchives = async (dir) => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      const structure = {};

      for (const item of items) {
        const itemPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          // Recursively process subdirectories (years, months)
          structure[item.name] = await buildArchives(itemPath);
        } else if (item.isFile() && item.name.endsWith('.md')) {
          // Extract day from filename
          const day = path.basename(item.name, '.md');
          if (!structure.files) structure.files = [];
          structure.files.push(day);
        }
      }

      // If there are only files, return just an array of days
      return structure.files ? structure.files : structure;
    };

    // Build the archive starting from the posts directory
    const archives = await buildArchives(postsDir);

    // Convert the result to the desired structure
    const formatArchives = (rawStructure) => {
      const formatted = {};
      for (const year in rawStructure) {
        if (typeof rawStructure[year] === 'object') {
          formatted[year] = {};
          for (const month in rawStructure[year]) {
            if (Array.isArray(rawStructure[year][month])) {
              formatted[year][month] = rawStructure[year][month];
            }
          }
        }
      }
      return formatted;
    };

    const formattedArchives = formatArchives(archives);
    res.json(formattedArchives);
  } catch (err) {
    console.error('Error building archives:', err);
    res.status(500).send('Failed to fetch archives.');
  }
});

router.get('/', async (req, res) => {
  const { latestPostPath, latestPostDate } = await findLatestPost();
  var dateString = await formatDate(latestPostDate);
  debug(`[MAIN] Latest post date: ${latestPostDate}`)

  if (!latestPostPath) {
    return res.status(404).json({ error: 'No posts found' });
  } else
  {
    let postsArray = await getPostsArray(dateString);
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

  // Ensure dateString is in the format DDMMYYYY
  if (!/^\d{8}$/.test(dateString)) {
    return res.status(400).send('Invalid date format. Use DDMMYYYY.');
  }

  const day = dateString.slice(0, 2);
  const month = dateString.slice(2, 4);
  const year = dateString.slice(4, 8);

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
