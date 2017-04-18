var express = require('express');
//var shuttleDB = require('./shuttle')
var router = express.Router();
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://data/test.db');
var unirest = require('unirest');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;

// ENTITIES:
const DEPARTMENT_ENTITY = 'Brown_Department';
const SHUTTLE_STOP_ENTITY = 'ShuttleStop';

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
    var name = assistant.getArgument(SHUTTLE_STOP_ENTITY);
    var originalName = name;
    name = "%"+name.toLowerCase()+"%";
    // find the stop_id
    conn.query("SELECT * FROM shuttleStops WHERE " +
        "name like $1",
        [name], function(err, result){
            var rowCount = result.rowCount;
            if (rowCount == 0) {
                assistant.tell("Sorry, but I don't know a shuttle stop called " + name);
            } else if (!err) {
                var stop_id = result.rows[0].stop_id;
                if (stop_id !== undefined && stop_id !== "") {
                    requestArrivalEstimatesByStopId(originalName, stop_id, assistant);
                }
            } else {
                console.log(err);
                assistant.tell("Sorry, there was an error occurred when I tried to find the stop_id for" +
                    "stop " + originalName);
            }
        });
}

function requestArrivalEstimatesByStopId(name, stop_id, assistant) {

    // These code snippets use an open-source library. http://unirest.io/nodejs
    unirest.get("https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=635&callback=call&stops="+stop_id)
        .header("X-Mashape-Key", "0PiJbg4Ao5mshixwHHSHZTiy5ZGGp1ptfx1jsn82ux5n1i0qqe")
        .header("Accept", "application/json")
        .end(function (result) {
            //console.log(result.status, result.headers, result.body);
            if (result.body.data.length == 0) {
                assistant.tell("I'm sorry, but there are no arrival estimates for the stop at the time");
            } else {
                var next_arrival_time =  result.body.data[0].arrivals[0].arrival_at;
                assistant.tell("The next shuttle will arrive at " + name + " at " + next_arrival_time);
            }

        });
}
var yellowBookMap = new Map();
yellowBookMap.set("DPS", "401123456789");
yellowBookMap.set("health service", "401999999999");




/* GET home page. */
router.post('/', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});
  
  function responseHandler (assistant) {

    const intent = req.body.result.metadata.intentName;//assistant.getIntent();
    
    switch (intent) {
     case BROWN_YELLOWBOOK:
        getNumber(assistant);
        break;
      case SHUTTLE:
        handleShuttle(assistant);
        break;
    }
  }

  assistant.handleRequest(responseHandler);
  //res.send();

});

module.exports = router;
