// Import the Express library
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
var debug = require('debug')('blogt-api:server');
const postsDir = path.join(__dirname, 'posts');
const corsProperties = 
  {
    origin: 'http://localhost:5173', // Your Vue app's development server
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  }

// Create an instance of an Express application
const app = express();
app.use(cors(corsProperties));
// Define a route for GET requests to "/"
app.get('/', (req, res) => {
  res.send('OK'); // Respond with "OK"
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

  try {
    console.log('Reading file:', filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Send the file content as response  
    res.set('Content-Type', 'text/markdown');
    res.send(fileContent);



  } catch (err) {
    console.error('Error reading post file:', err);
    res.status(404).send('Post not found');
  }
});


// Define the port the app will listen on
const PORT = 3001;

// Start the server and listen on the specified port
app.listen(PORT, () => {
  debug(`Server is running on ${PORT}`);
});
