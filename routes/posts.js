var debug = require('debug')('blogt-api:posts-route');

var express = require('express');
var router = express.Router();

var path = require('path');
const fs = require('fs').promises;
const postsDir = path.join(__dirname, '..', 'posts');
debug('Posts directory:', postsDir);

const {
  findLatestPost,
  getNext,
  getPrev,
  formatDate
} = require('../utils/utils');

/* GET home page. */
router.get('/', async (req, res) => {
  try {
    const { latestPostPath, latestPostDate } = await findLatestPost();
    var dateString = await formatDate(latestPostDate);
    debug(`[MAIN] Latest post date: ${latestPostDate}`)

    if (!latestPostPath) {
      return res.status(404).json({ error: 'No posts found' });
    }

    const postsArray = [];
    const postsPerPage = 5; // Number of posts per page

    // Loop to get the posts for the requested page
    for (let i = 0; i < postsPerPage; i++) {
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      let filePath = path.join(postsDir, year, month, `${day}.md`);
      debug('File path:', filePath);
      

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        postsArray.push(data);
        dateString = await getPrev(dateString)
        if (!dateString) {
          break;
        } else {
          debug("Posts to display" + postsArray.length)
        }
      } catch (err) {
        console.error(`No post found for ${year}-${month}-${day}`);
        dateString = await getPrev(dateString)
        // Continue to next date if file does not exist
      }
    }
    res.send(postsArray);

  }
  catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }

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
