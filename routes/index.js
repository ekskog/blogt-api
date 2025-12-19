const express = require('express');
const router = express.Router();

const { fetchBuckets } = require('../utils/media');

/* GET home page. */
router.get('/', async (req, res, next) => {
  const buckets = await fetchBuckets();
  res.send('this is not it');
});

module.exports = router;
