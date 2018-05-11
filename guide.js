"use strict";

var guideInfo = require('./package');
console.info("%s %s", guideInfo.name, guideInfo.version);

/**
 * Configuration Variables
 */
global.cacheDirectory = "./data/cache";
let mongoDbUri = "mongodb://localhost/guide3";

/**
 * Setup global promise lib
 */
require('bluebird');

/**
 * Module dependencies.
 */
const express = require('express');
const router = express.Router()
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const passport = require('passport');
const expressValidator = require('express-validator');
const sass = require('node-sass-middleware');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const cors = require('cors');
const http = require('http');

/**
 * Configure the path where the web app is located 
 */
if (!process.env.BASE_PATH) {
  process.env.BASE_PATH = '/';
}

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
switch (process.env.NODE_ENV) {
  case 'production':
    console.info('Server configured for production');
    dotenv.load({ path: 'private/env.production' });
    break;

  case 'development':
    console.info('Server configured for development');
    dotenv.load({ path: 'private/env.dev' });
    break;

  default:
    console.info('Server configured for example');
    dotenv.load({ path: '.env.example' });
}

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const sessionsController = require('./controllers/sessions');
const sessionController = require('./controllers/session');
const studentsController = require('./controllers/students');
const studentController = require('./controllers/student');
const hintsController = require('./controllers/hints');
const groupsController = require('./controllers/groups');
const groupController = require('./controllers/group');
const alertsController = require('./controllers/alerts');
const usersController = require('./controllers/users');
const userController = require('./controllers/user');
const socketManager = require('./services/socketManager');
const StudentDataVisualization = require('./services/studentDataVisualization');
const authz = require('./services/authorization');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();
app.locals.version = guideInfo.version;

// Pretty print JSON
app.set('json spaces', 2);
/**
 * Connect to MongoDB.
 */
var dbc = mongoose.connect(mongoDbUri, {
  useMongoClient: true
});

mongoose.connection.on('open', function (ref) {
  console.info('Connected to MongoDB: %s', mongoDbUri);

  // Initialize authorization module
  authz.initialize(dbc, (err) => {
    if (err) {
      console.error('Unable to initialize AuthZ: ' + err)
      process.exit(1);
    }
    else {
      router.use(function (req, res, next) {
        req.acl = authz.acl;
        authz.getIsAllowed(req.user, (isAllowed, isAllowedErr) => {
          if (isAllowedErr) {
            console.error('Unable to get isAllowed function: ' + isAllowedErr);
            next(isAllowedErr);
            return;
          }
          res.locals.isAllowed = isAllowed;
          next();
        });
      });

      initializeRoutes();
    }
  });
});
mongoose.connection.on('error', () => {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
  process.exit(1);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
});

app.set('port', process.env.PORT || 3000);

/**
 * Jade Template configuration.
 */
// Variables accessible in templates
app.locals.basepath = process.env.BASE_PATH; 
app.locals.moment = require('moment');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

/**
 * Express configuration.
 */
var corsOptions = {
  credentials: true,
  origin: true
};
router.use(cors(corsOptions));
router.use(compression());
router.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public')
}));
router.use(logger('dev'));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(expressValidator());
router.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
    autoReconnect: true
  })
}));

router.use(passport.initialize());
router.use(passport.session());

router.use(flash());
router.use((req, res, next) => {
  if (req.path === '/api/upload' || req.path.indexOf('/api/') == 0) {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
router.use(lusca.xframe('SAMEORIGIN'));
router.use(lusca.xssProtection(true));
router.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
router.use((req, res, next) => {
  // After successful login, redirect back to /api or app path
  if (/(api)|(^\/$)/i.test(req.path)) {
    req.session.returnTo = process.env.BASE_PATH;
  }
  next();
});
router.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Error Handler.
 */
router.use(errorHandler());

/**
 * Start HTTP server.
 */
var server = http.Server(app);

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
  let address = server.address().address == "::" ? "[::]" : server.address().address;
  console.info("Express listening on: %s:%d%s", address, server.address().port, process.env.BASE_PATH);
});

/**
 * Start WebSocket listener.
 */
socketManager.initialize(server);

module.exports = app;

function initializeRoutes() {
  /**
   * Primary app routes.
   */
  router.get('/', homeController.index);
  router.get('/sessions', authz.middleware(), sessionsController.index);
  router.post('/sessions/modify', authz.middleware(1), sessionsController.modify);
  router.get('/session/:sessionId', authz.middleware(1), sessionController.index);
  router.get('/session/:sessionId/event/:eventIndex', authz.middleware(1), sessionController.event);
  router.get('/students', authz.middleware(1), studentsController.index);
  router.post('/students/modify', authz.middleware(1), studentsController.modify);
  router.get('/student/:studentId', authz.middleware(1), studentController.index);
  router.post('/student/reset', authz.middleware(), studentController.reset);
  router.get('/student/:studentId/hints', authz.middleware(1), hintsController.index);
  router.get('/api/student/:studentId', authz.middleware(1), StudentDataVisualization.getStudent);
  router.get('/groups', authz.middleware(1), groupsController.index);
  router.post('/groups/modify', authz.middleware(1), groupsController.modify);
  router.get('/group/:groupId', authz.middleware(1), groupController.index);
  router.delete('/group/:groupId', authz.middleware(1), groupController.delete);
  router.post('/group/modify', authz.middleware(1), groupController.modify);
  router.post('/group/clear-cache', authz.middleware(1), groupController.clearCache);  
  router.post('/group/duplicate', authz.middleware(1), groupController.duplicate);
  router.get('/alerts', authz.middleware(), alertsController.index);
  router.post('/alerts/clear', authz.middleware(1), alertsController.clear);
  router.get('/users', usersController.index);
  router.get('/login', userController.getLogin);
  router.post('/login', userController.postLogin);
  router.get('/logout', userController.logout);
  router.get('/forgot', userController.getForgot);
  router.post('/forgot', userController.postForgot);
  router.get('/reset/:token', userController.getReset);
  router.post('/reset/:token', userController.postReset);
  router.get('/signup', userController.getSignup);
  router.post('/signup', userController.postSignup);
  router.get('/account/:userId?', authz.usersMiddleware(), userController.getAccount);
  router.post('/account/profile/:userId?', authz.usersMiddleware(), userController.postUpdateProfile);
  router.post('/account/roles/:userId?', authz.middleware(2), userController.postUpdateRoles);
  router.post('/account/password/:userId?', authz.usersMiddleware(), userController.postUpdatePassword);
  router.post('/account/delete/:userId?', authz.usersMiddleware(), userController.postDeleteAccount);
  router.get('/account/unlink/:provider/:userId?', authz.usersMiddleware(), userController.getOauthUnlink);

  /**
   * OAuth authentication routes. (Sign in)
   */
  router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
  router.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect:  process.env.BASE_PATH + 'login' }), (req, res) => {
    res.redirect(req.session.returnTo || process.env.BASE_PATH);
  });
  router.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
  router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect:  process.env.BASE_PATH + 'login' }), (req, res) => {
    res.redirect(req.session.returnTo || process.env.BASE_PATH);
  });

  // mount the router on the app
  app.use(app.locals.basepath, router);
}
