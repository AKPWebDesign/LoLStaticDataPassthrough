/**
 * Copyright (C) 2016  Austin Peterson <austin@akpwebdesign.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var request = require('request-json');
var client = request.createClient("https://global.api.pvp.net");

function Server(config) {
  this.app = express();
  this.app.use(bodyParser.urlencoded({extended: true}));
  this.app.use(bodyParser.json());
  this.server = require('http').Server(this.app);

  this.config = config;
  this.port = process.env.PORT || this.config.serverWebPort || 8080; //Process-set port overrides config. If neither are there, use safe default.
  this.api_key = this.config.RIOT_API_KEY;

  this.APIRouter = express.Router();
  this.setUpRoutes();
  this.setUpLogging();
  this.app.use('/', this.APIRouter);
  this.app.use(morgan('combined')); //set up logger for Express.

  this.server.listen(this.port);
  console.log("Listening on port " + this.port);
}

/**
 * Sets up routes for Express.
 */
Server.prototype.setUpRoutes = function () {
  var self = this;
  this.APIRouter.get('/', function(req, res) {
    res.json({message: "Welcome to the LoL Static Data Passthrough API."});
  });

  this.APIRouter.get('/champs', function(req, res) {
    client.get(`/api/lol/static-data/${region}/${version}/champion?champData=all&api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        res.json({status:"Error"});
      }
      res.json(body.data);
    });
  });

  this.APIRouter.get('/items', function(req, res) {
    client.get(`/api/lol/static-data/${region}/${version}/item?itemListData=all&api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        res.json({status:"Error"});
      }
      res.json(body.data);
    });
  });

  this.APIRouter.get('/maps', function(req, res) {
    client.get(`/api/lol/static-data/${region}/${version}/map?&api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        res.json({status:"Error"});
      }
      res.json(body.data);
    });
  });

  this.APIRouter.get('/masteries', function(req, res) {
    client.get(`/api/lol/static-data/${region}/${version}/mastery?masteryListData=all&api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        res.json({status:"Error"});
      }
      res.json(body.data);
    });
  });

  this.APIRouter.get('/spells', function(req, res) {
    client.get(`/api/lol/static-data/${region}/${version}/summoner-spell?spellData=all&api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        res.json({status:"Error"});
      }
      res.json(body.data);
    });
  });

  this.APIRouter.get('/versions', function(req, res) {
    client.get(`/api/lol/static-data/${region}/${version}/realm?api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        res.json({status:"Error"});
      }
      res.json(body.data);
    });
  });
};

/**
 * Sets up logging.
 */
Server.prototype.setUpLogging = function () {
  var logDirectory = __dirname + '/../log';

  // ensure log directory exists
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

  // create a rotating write stream
  var accessLogStream = FileStreamRotator.getStream({
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false,
    date_format: "YYYY-MM-DD"
  });

  // setup the logger
  this.app.use(morgan('combined', {stream: accessLogStream}));
  this.app.use(morgan('combined', {stream: process.stdout}));
};
