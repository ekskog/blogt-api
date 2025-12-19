var express = require("express");
var router = express.Router();

const path = require("path");
const fs = require("fs").promises;
var debug = require("debug")("blogt-api:tags-route");

let filePath = path.join(__dirname, "..", "posts", "tags_index.json");
debug(`[routes] tags index path: ${filePath}`);

/* GET users listing. */
router.get("/:tagName", async (req, res) => {
  var { tagName } = req.params;
  tagName = decodeURIComponent(tagName); // Decode the tag name to handle multi-word and special characters

  const normalizedTag = tagName.toLowerCase();
  try {
    const tagsIndexRaw = await fs.readFile(filePath, "utf-8");
    const tagIndex = JSON.parse(tagsIndexRaw);
    let postFiles = tagIndex[normalizedTag] || [];
    debug(`[routes] found ${postFiles.length} occurrences of ${tagName}`);

    res.send(postFiles);
  } catch (error) {
    console.error("Error reading tags index:", error);
    res.status(500).send("Failed to fetch tag data");
  }
});

module.exports = router;
