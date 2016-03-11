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
var FileStreamRotator = require('file-stream-rotator');
var fs = require('fs');
var Promise = require('bluebird');
var client = request.createClient("https://global.api.pvp.net");
client.headers["User-Agent"] = "AKPWebDesign/LoLStaticDataPassthrough <https://github.com/AKPWebDesign/LoLStaticDataPassthrough>";
var region = "na";
var version = "v1.2";
var baseURL = `/api/lol/static-data/${region}/${version}`;
var lastVersionTime;

function Server(config) {
  this.data = {};

  this.config = config;
  this.port = process.env.PORT || this.config.port || 8080; //Process-set port overrides config. If neither are there, use safe default.
  if(!Array.isArray(this.port)) {this.port = [this.port];}
  this.api_key = this.config.RIOT_API_KEY;

  for (var i = 0; i < this.port.length; i++) {
    var app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    var server = require('http').Server(app);

    var apiRouter = express.Router();
    this.setUpRoutes(apiRouter);
    this.setUpLogging(app);

    app.use('/', apiRouter);
    app.use(morgan('combined')); //set up logging

    server.listen(this.port[i]);
    console.log("Listening on port " + this.port[i]);
  }
}

Server.prototype.getData = function (url, key) {
  var self = this;
  return new Promise(function(resolve, reject){
    self.checkVersionData().then(function(result) {
      if(!result || !self.data[key]) {
        client.get(url, function(err, resp, body) {
          if(err || (body.status && body.status.status_code !== 200)) {
            reject(err);
            return;
          }
          self.data[key] = body;
          resolve(body);
          return;
        });
      } else {
        resolve(self.data[key]);
      }
    });
  });
};

Server.prototype.checkVersionData = function () {
  var self = this;
  return new Promise(function(resolve, reject) {
    if(!self.data || !self.data.version) {
      resolve(false);
      return;
    }
    if(lastVersionTime && (new Date().getTime() - lastVersionTime) > 600) {
      resolve(true);
      return;
    }
    client.get(`${baseURL}/realm?api_key=${self.api_key}`, function(err, resp, body){
      if(err || (body.status && body.status.status_code !== 200)) {
        reject(err);
        return;
      }
      resolve(body.v == self.data.version.v);
      return;
    });
  });
};

/**
 * Sets up routes for Express.
 */
Server.prototype.setUpRoutes = function (apiRouter) {
  var self = this;
  apiRouter.get('/', function(req, res) {
    res.json({message: "Welcome to the LoL Static Data Passthrough API."});
  });

  apiRouter.get('/champs', function(req, res) {
    var url = `${baseURL}/champion?champData=image,skins,spells&api_key=${self.api_key}`;
    self.getData(url, "champion").then(function(result) {
      res.json(result.data);
    }, function(error) {
      res.json(error);
    });
  });

  apiRouter.get('/items', function(req, res) {
    var url = `${baseURL}/item?itemListData=consumed,gold,hideFromAll,image,inStore,into,maps,requiredChampion,sanitizedDescription,tags&api_key=${self.api_key}`;
    self.getData(url, "item").then(function(result) {
      res.json(result.data);
    }, function(error) {
      res.json(error);
    });
  });

  apiRouter.get('/spells', function(req, res) {
    var url = `${baseURL}/summoner-spell?spellData=image,key,modes,sanitizedDescription&api_key=${self.api_key}`;
    self.getData(url, "spell").then(function(result) {
      res.json(result.data);
    }, function(error) {
      res.json(error);
    });
  });

  apiRouter.get('/versions', function(req, res) {
    var url = `${baseURL}/realm?api_key=${self.api_key}`;
    self.getData(url, "version").then(function(result) {
      res.json(result);
    }, function(error) {
      res.json(error);
    });
  });
};

/**
 * Sets up logging.
 */
Server.prototype.setUpLogging = function (app) {
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
  app.use(morgan('combined', {stream: accessLogStream}));
  app.use(morgan('combined', {stream: process.stdout}));
};

new Server(require("./config.json"));
