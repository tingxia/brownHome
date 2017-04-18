var express = require('express');
//var shuttleDB = require('./shuttle')
var router = express.Router();
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;

// ENTITIES:
const DEPARTMENT_ENTITY = 'Brown_Department';
const SHUTTLE_STOP_ENTITY = 'ShuttleStop'

// INTENTS:
const BROWN_YELLOWBOOK = 'Brown Yellowbook';
const SHUTTLE = 'Shuttle';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/brownCentric', function(req, res, next) {
  res.render('index', { title: 'Express brown yellow book' });
});

// TODO:
// - load this in dynamically based on location
// - get information from csv?
var yellowBookMap = new Map();
yellowBookMap.set("DPS", "401 863 4111");
yellowBookMap.set("health service", "401 863 3953");

function getNumber(assistant) {
  var dept = assistant.getArgument(DEPARTMENT_ENTITY);
  if (yellowBookMap.get(dept) != null) {
    assistant.tell("The phone number for " + dept + " is " + yellowBookMap.get(dept));
  } else {
    assistant.tell("Sorry, but I couldn't find the contact information for " + dept);
  }
}

function handleShuttle(assistant) {
  var shuttle_stop = assistant.getArgument(SHUTTLE_STOP_ENTITY);
  console.log(shuttle_stop);
  //console.log(shuttleDB);
  //var time = shuttleDB.requestArrivalEstimateByName(shuttle_stop);
  //console.log(time);
  //assistant.tell(time);
  assistant.tell("Sorry, but I'm not sure how to handle that.");
}

/* GET home page. */
router.post('/brownCentric', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});
  
  function responseHandler (assistant) {
    const intent = req.body.result.metadata.intentName;//assistant.getIntent();
    
    switch (intent) {
     case BROWN_YELLOWBOOK:
        getNumber(assistant);
        break;
      case SHUTTLE:
        handleShuttle(assistant);
        break
    }
  }

  assistant.handleRequest(responseHandler);
  res.send();
});

module.exports = router;
