// Import the Express library
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
var debug = require('debug')('blogt-api:server');

const {
  findLatestPost,
  getNext,
  getPrev,
  formatDate
} = require('./utils/utils');

const postsDir = path.join(__dirname, 'posts');
const corsProperties =
{
  origin: '*', // Your Vue app's development server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}

// Create an instance of an Express application
const app = express();
app.use(cors(corsProperties));

// Define a route for GET requests to "/"
app.get('/', async (req, res) => {
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
      let filePath = path.join(__dirname, '.', 'posts', year, month, `${day}.md`);

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

app.get('/:dateString', async (req, res) => {
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


// Define the port the app will listen on
const PORT = 3001;

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
