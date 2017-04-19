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
const IS_DAYTIME_SHUTTLE = "isDayTimeShuttle";

// INTENTS:
const BROWN_YELLOWBOOK = 'Brown Yellowbook';
const SHUTTLE = 'Shuttle';
const SHUTTLE_FOLLOWUP = "Shuttle-followup";

// CONTEXTS
const SHUTTLE_CONTEXT = "shuttle-ctx";

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

var dayNightShuttle = new Map();
dayNightShuttle.set("Daytime", "4006812");
dayNightShuttle.set("Night", "4006810");

parseMenu();

function parseMenu() {
    // "http://legacy.cafebonappetit.com/api/2/menus?cafe=1536&date=2017-04-19"
    unirest.get("http://legacy.cafebonappetit.com/api/2/menus?cafe=1534&date=2017-04-19")
        .header("Accept", "application/json")
        .end(function (result) {
            console.log("let's look at this json file");

            // for blueroom:
            // this finds out the item id
            //console.log(result.body.days[0].cafes["1534"]["dayparts"][0][0]["stations"]);
            // this finds the item name and description based on item id
            //console.log(result.body.items);

            // arr = result.body.days[0].cafes["1536"]["dayparts"][0][1]["stations"]
            // the above is an array, iterate through to look for "arr[i].label",which gives Tacos, Falafel
            // Sandwitch bar, smoothies, pizza, etc.
            //if (result.body.data.length == 0) {
            //} else {
            //
            //}
        });
}

function getNumber(assistant) {
  var dept = assistant.getArgument(DEPARTMENT_ENTITY);

  if (yellowBookMap.get(dept) != null) {
    assistant.tell("The phone number for " + dept + " is " + yellowBookMap.get(dept));
  } else {
    assistant.tell("Sorry, but I couldn't find the contact information for " + dept);
  }
}

function handleShuttle(assistant) {
    var contexts = assistant.getContexts();
    var hasPriorContext = false;
    var name = null;
    for (var i=0; i < contexts.length; i++) {
        if (contexts[i].name === SHUTTLE_CONTEXT) {
            console.log(contexts[i]);
            name = contexts[i].parameters.shuttleName; //assistant.getContextArgument("shuttle-ctx",'shuttleName');
            hasPriorContext = true;
            break;
        }
    }
    if (hasPriorContext) {
        var originalName = name;
        name = "%"+name.toLowerCase()+"%";
        var route_id = assistant.getArgument(IS_DAYTIME_SHUTTLE);
        route_id = route_id.includes("daytime")? dayNightShuttle.get("Daytime"):dayNightShuttle.get("Night");
        conn.query("SELECT * FROM shuttleStops WHERE " +
            "name like $1 and route_id= $2",
            [name, route_id], function(err, result){
                var rowCount = result.rowCount;
                if (rowCount == 0) {
                    assistant.tell("Sorry, but I don't know a shuttle stop called " + originalName);
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
    } else {
        name = assistant.getArgument(SHUTTLE_STOP_ENTITY);
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
                    if (rowCount > 1) {
                        console.log("more than 1 rowCount");
                        assistant.setContext(SHUTTLE_CONTEXT, 2, {shuttleName: originalName});
                        assistant.ask("Are you asking for daytime shuttle or evening time shuttle?");
                    } else {
                        var stop_id = result.rows[0].stop_id;
                        if (stop_id !== undefined && stop_id !== "") {
                            requestArrivalEstimatesByStopId(originalName, stop_id, assistant);
                        }
                    }
                } else {
                    console.log(err);
                    assistant.tell("Sorry, there was an error occurred when I tried to find the stop_id for" +
                        "stop " + originalName);
                }
            });
    }
}

function requestArrivalEstimatesByStopId(name, stop_id, assistant) {
    // These code snippets use an open-source library. http://unirest.io/nodejs
    unirest.get("https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=635&callback=call&stops="+stop_id)
        .header("X-Mashape-Key", "0PiJbg4Ao5mshixwHHSHZTiy5ZGGp1ptfx1jsn82ux5n1i0qqe")
        .header("Accept", "application/json")
        .end(function (result) {
            if (result.body.data.length == 0) {
                assistant.tell("I'm sorry, but there are no arrival estimates for the stop right now.");
            } else {
                var next_arrival_time_json_format =  result.body.data[0].arrivals[0].arrival_at;
                var now = Date.now();
                var arrival_time = new Date(next_arrival_time_json_format);

                // getting the time diference until the next shuttle:
                var date_diff = new Date(0);
                date_diff.setMilliseconds(arrival_time - now);

                // setting arrival time seconds to 0 so Google home doesn't read seconds
                arrival_time.setSeconds(0);

                if (date_diff.getMinutes() < 1) {
                  assistant.tell("The shuttle is arriving now to " + name );
                } else {
                //TODO: add time from now (ie: "will arrive in 5 minutes at 6:24pm")
                  assistant.tell("The next shuttle will arrive at " + name + " in " + date_diff.getMinutes() + " minutes " + " at " + arrival_time.toLocaleTimeString());
                }
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
        case SHUTTLE_FOLLOWUP:
            handleShuttle(assistant);
    }
  }

  assistant.handleRequest(responseHandler);
  //res.send();

});

module.exports = router;
