// entity documentation: https://docs.api.ai/docs/concept-entities#section-developer-enum-type-entities

var express = require('express');

var router = express.Router();
var unirest = require('unirest');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
var laundryFunction = require('./laundry.js');
var shuttleFunction = require('./shuttle.js');
var eventsFunction = require('./events.js');
var diningFunctions = require('./dining.js');

// ACTIONS
const SHUTTLE = 'Shuttle';
const DINING_MENU = "Dining";
const BROWN_EVENTS = 'BrownEvents';
const LAUNDRY = "Laundry";
const DINING_HOURS = "dining-hours";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/brownCentric', function(req, res, next) {
  res.render('index', { title: 'Express brown centric' });
});

/* GET home page. */
router.post('/', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});

  const actionMap = new Map();
  actionMap.set(SHUTTLE, shuttleFunction.handleShuttle);
  actionMap.set(DINING_MENU, diningFunctions.handleDining);
  actionMap.set(DINING_HOURS, diningFunctions.handleDiningHours);
  actionMap.set(BROWN_EVENTS, eventsFunction.handleBrownEvents);
  actionMap.set(LAUNDRY, laundryFunction.handleLaundry);
  assistant.handleRequest(actionMap);
});

module.exports = router;
