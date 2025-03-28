var express = require("express");
var router = express.Router();

const path = require("path");
var debug = require("debug")("blot-too:tags-route");

let filePath = path.join(__dirname, "..", "posts");
const tagIndex = require(`${filePath}/tags_index.json`); // Path to JSON tag index file
console.log(filePath);
debug(Object.keys(tagIndex).length);

/* GET users listing. */
router.get("/:tagName", async (req, res) => {
  var { tagName } = req.params;
  tagName = decodeURIComponent(tagName); // Decode the tag name to handle multi-word and special characters

  const normalizedTag = tagName.toLowerCase();

  let postFiles = tagIndex[normalizedTag] || [];
  debug(`${tagName} >> ${postFiles.length}`);

  res.send(postFiles);
});

module.exports = router;
