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
  formatDate,
  formatDates,
  updateTagsIndex,
  getNext,
  getPrev
} = require('../utils/utils');

// Helpers for date conversion
function isYMD(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isDDMMYYYY(date) {
  return /^\d{8}$/.test(date);
}

function ymdToParts(date) {
  const [year, month, day] = date.split('-');
  return { year, month, day };
}

function ddmmyyyyToParts(date) {
  const day = date.slice(0, 2);
  const month = date.slice(2, 4);
  const year = date.slice(4, 8);
  return { year, month, day };
}

function ymdToDDMMYYYY(date) {
  const { year, month, day } = ymdToParts(date);
  return `${day}${month}${year}`;
}

function ddmmyyyyToYMD(date) {
  const { year, month, day } = ddmmyyyyToParts(date);
  return `${year}-${month}-${day}`;
}

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

router.post('/', async (req, res) => {
  try {
    const { date, title, tags = [], content = "" } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    let year, month, day;

    if (isDDMMYYYY(date)) {
      ({ year, month, day } = ddmmyyyyToParts(date));
    } else if (isYMD(date)) {
      ({ year, month, day } = ymdToParts(date));
    } else {
      return res.status(400).json({ error: "date must be in DDMMYYYY or YYYY-MM-DD format" });
    }
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: "tags must be a non-empty array" });
    }

    const dirPath = path.join(postsDir, year, month);
    await fs.mkdir(dirPath, { recursive: true });

    const tagsLine = `Tags: ${tags.join(", ")}`;
    const titleLine = `Title: ${title}`;
    const body = [tagsLine, titleLine, content].join("\n");

    const filePath = path.join(dirPath, `${day}.md`);
    await fs.writeFile(filePath, body, "utf-8");

    await updateTagsIndex();

    res.status(201).json({ message: "Post created", path: `${year}/${month}/${day}.md` });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Get structured details for a single post using YYYY-MM-DD
router.get('/details/:date', async (req, res) => {
  const { date } = req.params;

  if (!isYMD(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }

  const { year, month, day } = ymdToParts(date);
  const filePath = path.join(postsDir, year, month, `${day}.md`);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const [rawTags = "", rawTitle = "", ...rest] = raw.split("\n");

    const tags = rawTags
      .replace(/^Tags:\s*/i, "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const title = rawTitle.replace(/^Title:\s*/i, "").trim();
    const content = rest.join("\n").trim();

    const ddmmyyyy = `${day}${month}${year}`;
    const [prevDDMMYYYY, nextDDMMYYYY] = await Promise.all([
      getPrev(ddmmyyyy),
      getNext(ddmmyyyy),
    ]);

    const prev = prevDDMMYYYY ? ddmmyyyyToYMD(prevDDMMYYYY) : null;
    const next = nextDDMMYYYY ? ddmmyyyyToYMD(nextDDMMYYYY) : null;

    const imageUrl = `https://objects.hbvu.su/blotpix/${year}/${month}/${day}.jpeg`;

    res.json({
      date,
      title,
      tags,
      content,
      htmlContent: null,
      prev,
      next,
      imageUrl,
    });
  } catch (error) {
    console.error("Error reading post file:", error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: "Post not found" });
    }
    res.status(500).json({ error: "Failed to load post" });
  }
});

// Update an existing post using YYYY-MM-DD
router.put('/:date', async (req, res) => {
  const { date } = req.params;

  if (!isYMD(date)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }

  const { title, tags = [], content = "" } = req.body;

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: "tags must be a non-empty array" });
  }

  const { year, month, day } = ymdToParts(date);
  const filePath = path.join(postsDir, year, month, `${day}.md`);

  try {
    // Ensure the file exists before overwriting
    await fs.access(filePath);

    const tagsLine = `Tags: ${tags.join(", ")}`;
    const titleLine = `Title: ${title}`;
    const body = [tagsLine, titleLine, content].join("\n");

    await fs.writeFile(filePath, body, "utf-8");
    await updateTagsIndex();

    // Reuse the details logic to return the updated post
    const ddmmyyyy = `${day}${month}${year}`;
    const [prevDDMMYYYY, nextDDMMYYYY] = await Promise.all([
      getPrev(ddmmyyyy),
      getNext(ddmmyyyy),
    ]);

    const prev = prevDDMMYYYY ? ddmmyyyyToYMD(prevDDMMYYYY) : null;
    const next = nextDDMMYYYY ? ddmmyyyyToYMD(nextDDMMYYYY) : null;
    const imageUrl = `https://objects.hbvu.su/blotpix/${year}/${month}/${day}.jpeg`;

    res.json({
      date,
      title,
      tags,
      content,
      htmlContent: null,
      prev,
      next,
      imageUrl,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: "Post not found" });
    }
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.get('/', async (req, res) => {
  const { latestPostPath, latestPostDate } = await findLatestPost();
  if (!latestPostPath || !latestPostDate) {
    return res.status(404).json({ error: 'No posts found' });
  }
  var dateString = await formatDate(latestPostDate);
  debug(`[MAIN] Latest post date: ${latestPostDate}`);
  let postsArray = await getPostsArray(dateString);
  res.send(postsArray);
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
    let postsArray = await getPostsArray(dateString);
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
