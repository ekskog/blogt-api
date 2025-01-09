var debug = require('debug')('blogt-api:index-route');
var express = require('express');
var router = express.Router();

router.get('/', async (req, res) => {
    res.send('This is not it');
});