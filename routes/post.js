const debug = require("debug")("blogt-api:posts-route");

const express = require("express");
const router = express.Router();

const path = require("path");
const fs = require("fs").promises;
const postsDir = path.join(__dirname, "..", "posts");
debug("Posts directory:", postsDir);

const {
  findLatestPost,
  getPostsArray,
  formatDate,
  formatDates,
  updateTagsIndex,
  getNext,
  getPrev,
  parseBlogEntry,
} = require("../utils/utils");

// GET LATEST 10 POSTS
router.get("/", async (req, res) => {
  const { latestPostPath, latestPostDate } = await findLatestPost();
  if (!latestPostPath || !latestPostDate) {
    return res.status(404).json({ error: "No posts found" });
  }
  var dateString = await formatDate(latestPostDate);
  debug(`[MAIN] Latest post date: ${latestPostDate}`);
  let postsArray = await getPostsArray(dateString);
  res.send(postsArray);
});

// Create a new post using
router.post("/:date", async (req, res) => {
  try {
    const { title, tags = [], content = "" } = req.body;
    const { date } = req.params;
    
    debug("Editing post for: ", date)

    const [day, month, year] = [
      date.slice(0, 2),
      date.slice(2, 4),
      date.slice(4, 8),
    ];

    const dirPath = path.join(postsDir, year, month);
    debug("Save at: ", dirPath)
    console.time("Creating new post");
    await fs.mkdir(dirPath, { recursive: true });

    const dateLine = `Date: ${date}`;
    const tagsLine = `Tags: ${tags.join(", ")}`;
    const titleLine = `Title: ${title}`;
    const newEntry = [dateLine, tagsLine, titleLine, content].join("\n");

    const filePath = path.join(dirPath, `${day}.md`);
    await fs.writeFile(filePath, newEntry, "utf-8");
    console.timeEnd("Creating new post");
    console.time("Updating tags index");
    updateTagsIndex();
    console.timeEnd("Updating tags index");

    res
      .status(201)
      .json({ message: "Post created", path: `${year}/${month}/${day}.md` });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Get structured details for a single post using YYYY-MM-DD
router.get("/details/:date", async (req, res) => {
  const { date } = req.params;
  debug("Details request for date:", date);

  const [day, month, year] = [
    date.slice(0, 2),
    date.slice(2, 4),
    date.slice(4, 8),
  ];
  const filePath = path.join(postsDir, year, month, `${day}.md`);
  debug("File path:", filePath);

  try {
    console.time("Reading post file for details");
    const raw = await fs.readFile(filePath, "utf-8");
    console.timeEnd("Reading post file for details");
    console.time("Parsing post file for details");
    const parsed = await parseBlogEntry(raw);
    console.timeEnd("Parsing post file for details");

    const [prevDDMMYYYY, nextDDMMYYYY] = await Promise.all([
      getPrev(date),
      getNext(date),
    ]);

    debug("Previous date:", prevDDMMYYYY);
    debug("Next date:", nextDDMMYYYY);  

    const imageUrl = `https://objects.hbvu.su/blotpix/${year}/${month}/${day}.jpeg`;
    const blogEntry = {
      date: parsed.date,
      title: parsed.title,
      tags: parsed.tags,
      content: parsed.content,
      htmlContent: null,
      prevDDMMYYYY,
      nextDDMMYYYY,
      imageUrl,
    };

    res.json(blogEntry);
  } catch (error) {
    console.error("Error reading post file:", error);
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "Post not found" });
    }
    res.status(500).json({ error: "Failed to load post" });
  }
});

// Update an existing post using YYYY-MM-DD
router.put("/:date", async (req, res) => {
  let { date } = req.params;
  debug("Update request for date:", date);

  const { title, tags = [], content = "" } = req.body;
  debug("Update data:", { date, title, tags, content });

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  // Accept tags either as an array or a comma-separated string
  let normalizedTags = tags;
  if (!Array.isArray(normalizedTags) && typeof normalizedTags === "string") {
    normalizedTags = normalizedTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(normalizedTags) || normalizedTags.length === 0) {
    return res
      .status(400)
      .json({ error: "tags must be a non-empty array or CSV string" });
  }
  const [, day, month, year] = date.match(/(\d{2})(\d{2})(\d{4})/);
  const filePath = path.join(postsDir, year, month, `${day}.md`);
  debug("File path:", filePath);

  try {
    // Ensure the file exists before overwriting
    await fs.access(filePath);

    const dateLine = `Date: ${date}`;
    const tagsLine = `Tags: ${normalizedTags.join(", ")}`;
    const titleLine = `Title: ${title}`;
    const body = [dateLine, tagsLine, titleLine, content].join("\n");

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
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "Post not found" });
    }
    res.status(500).json({ error: "Failed to update post" });
  }
});



router.get("/from/:startDate", async (req, res) => {
  const { startDate } = req.params;
  const { latestPostDate, latestPostPath } = await formatDates(startDate);

  var dateString = await formatDate(latestPostDate);
  debug(`[MAIN] Latest post date: ${latestPostDate}`);

  if (!latestPostPath) {
    return res.status(404).json({ error: "No posts found" });
  } else {
    let postsArray = await getPostsArray(dateString);
    res.send(postsArray);
  }
});

router.get("/:dateString", async (req, res) => {
  const { dateString } = req.params;

  // Ensure dateString is in the format DDMMYYYY
  if (!/^\d{8}$/.test(dateString)) {
    return res.status(400).send("Invalid date format. Use DDMMYYYY.");
  }

  const day = dateString.slice(0, 2);
  const month = dateString.slice(2, 4);
  const year = dateString.slice(4, 8);

  // Use moment to ensure we are manipulating only the date (start of the day)
  let filePath = path.join(postsDir, year, month, `${day}.md`);
  debug("File path:", filePath);

  const postsArray = [];

  try {
    console.log("Reading file:", filePath);
    const data = await fs.readFile(filePath, "utf-8");
    postsArray.push(data);
    // Send the file content as response
    res.send(postsArray);
  } catch (err) {
    console.error("Error reading post file:", err);
    res.status(404).send("Post not found");
  }
});

module.exports = router;
