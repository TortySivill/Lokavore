var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var sessions = require('express-session');
var passport = require('passport');
var passportLocal = require('passport-local');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('catalog.db');

const https = require('https')
const fs = require('fs')

var index = require('./routes/index');
var users = require('./routes/users');
var catalog = require('./routes/catalog');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(expressValidator()); // Add this after the bodyParser middlewares!
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

/*app.use(sessions({
	secret: 'twygbe764384hj',
	resave: false,
	saveUnitialized: false
}));*/

//app.use(passport.initialize());
//app.use(passport.session());

app.use('/', index);
app.use('/users', users);
app.use('/catalog', catalog);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else{
    res.redirect('/login');
  }

}

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
	navbar()
	function navbar(){
    db.all("SELECT * FROM category",[], function(err,row){
      res.render('error', { category_list: row, isAuthenticated: req.isAuthenticated(), user_detail: req.user});
    });
  }
});

var googleMapsClient = require('@google/maps').createClient({
  key: 'your API key here'
});






module.exports = app;
