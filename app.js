const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const cors = require('cors');
const corsProperties =
{
  origin: '*', // Your FrontEnd app's development server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}

var indexRouter = require('./routes/index');
var postsRouter = require('./routes/post');
var tagsRouter = require('./routes/tags');
var rssRouter = require('./routes/rss');
var mediaRouter = require('./routes/media');
var archiveRouter = require('./routes/archive');

var app = express();
app.use(cors(corsProperties));

console.log('Environment config:', {
  PORT:              process.env.PORT,
  NODE_ENV:          process.env.NODE_ENV,
  MINIO_ENDPOINT:    process.env.MINIO_ENDPOINT,
  MINIO_PORT:        process.env.MINIO_PORT,
  MINIO_USE_SSL:     process.env.MINIO_USE_SSL,
  MINIO_BUCKET:      process.env.MINIO_BUCKET,
  MINIO_PUBLIC_BASE: process.env.MINIO_PUBLIC_BASE,
  MINIO_ACCESS_KEY:  process.env.MINIO_ACCESS_KEY  ? '***' : undefined,
  MINIO_SECRET_KEY:  process.env.MINIO_SECRET_KEY  ? '***' : undefined,
});

// View engine setup (use Pug for simple templated pages)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Logging
// Use logger but skip health checks
app.use(logger('dev', {
  skip: (req, res) => req.path === '/health'
}));app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/post', postsRouter);
app.use('/tags', tagsRouter);
app.use('/rss.xml', rssRouter);
app.use('/media', mediaRouter);
app.use('/posts', archiveRouter);

// Add a health endpoint for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = app;
