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
const EATERY_ENTITY = 'Eatery';
const MEALTIME_ENTITY = 'MealTime';

// INTENTS:
const BROWN_YELLOWBOOK = 'Brown Yellowbook';
const SHUTTLE = 'Shuttle';
const SHUTTLE_FOLLOWUP = "Shuttle-followup";
const DINING = "Dining";

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

var diningHalls = new Map();
const RATTY = "Ratty";
const VDUB = "VDub";
const ANDREWS = "Andrews";
const BLUE_ROOM = "Blue Room";
const JOS = "Jos";
diningHalls.set(RATTY, "1531"); // Sharpe Refectory
diningHalls.set(VDUB, "1532"); // TODO: Verney-Wooley
// diningHalls.set(ANDREWS, "1533"); // Andrews Commons
// diningHalls.set(BLUE_ROOM, "1534"); // Blue Room
// diningHalls.set(JOS, "1535"); // Josiahs

const DESSERT = "dessert";
const COMFORT = "comfort_food";
const VEGETARIAN = "vegetarian_food";
const PIZZA = "pizza";
const SALAD = "salad";
const OMELET = "omelet";
var course = new Map();
course.set(RATTY + DESSERT, "12278"); 
course.set(RATTY + COMFORT, "12176");
course.set(RATTY + VEGETARIAN, "12177"); 
course.set(RATTY + PIZZA, "12305");
course.set(RATTY + SALAD, "12174");
course.set(RATTY + OMELET, "13506");

var rattyChangingDishes = [course.get(RATTY + DESSERT), course.get(RATTY + VEGETARIAN), course.get(RATTY + COMFORT)];

// var promise = getDiningTime("Ratty", formatDate(new Date()), "Breakfast");
// promise.then(function (message) {
//   console.log(message);
// });

// var promise2 = getFoodItem(5767821);
// promise2.then(function (message) {
//   console.log(message);
// });

/*
  returns date in the format "YYYY-MM-DD"
*/
function formatDate(date) {
  var year = date.getFullYear();
  var month = date.getMonth();
  var date = date.getDate();

  month = new String(month + 1);
  if (month.length == 1) {
    month = 0 + month;
  }

  return year + "-" + month + "-" + date;
}

// returns dining hall menu (array of "dayparts")
function getDiningHallInfo(json, diningHallCode) {
  return json.body.days[0].cafes[diningHallCode];
}

// mealTime == Breakfast, Lunch or Dinner
function getMeal(menu, mealTime) {
  var allMeals = menu["dayparts"][0];

  for (var i = 0; i < allMeals.length; i++) {
    if (allMeals[i].label == mealTime) {
      return allMeals[i];
    }
  }
    return "Couldn't find meal for " + mealTime; // TODO
}

// if courses is empty, include all courses
// else if courses is populated, only print out courses requested
function getDiningMenu(diningHallName, date, mealType, courses=[]) {
  var includeAllCourses = courses.length == 0;
  var diningHallCode = diningHalls.get(diningHallName);
  return new Promise(function(resolve, reject) { 
    unirest.get("http://legacy.cafebonappetit.com/api/2/menus?cafe="+ diningHallCode +"&date=" + date)
      .header("Accept", "application/json")
      .end(function (result) {
          var menu = getDiningHallInfo(result, diningHallCode);
          var item_lookup = result.body.items;
          var allMealItems = getMeal(menu, mealType);
          var stations = allMealItems["stations"];

          var foodList = [];
          for (var i = 0; i < stations.length; i++) {
            if (!includeAllCourses) {
              // if we don't want to include all courses, check to make sure the label is in courses
              if (courses.indexOf(stations[i].id) < 0) {
                continue;
              }
            }
            // include/exclude dishes
            for (var j = 0; j < stations[i].items.length; j++) {
              var id = stations[i].items[j];
              foodList.push(item_lookup[id].label);
            }
          }
          resolve(foodList);
    });
  });
}

function getDiningTime(diningHallName, date, mealType) {
  var diningHallCode = diningHalls.get(diningHallName);
  return new Promise(function(resolve, reject) {
      unirest.get("http://legacy.cafebonappetit.com/api/2/menus?cafe="+ diningHallCode +"&date=" + date)
        .header("Accept", "application/json")
        .end(function (result) {
            var eatery = getDiningHallInfo(result, diningHallCode);
            var mealTypeInfo = getMeal(eatery, mealType);
            resolve({start: mealTypeInfo.starttime, end: mealTypeInfo.endtime});
    });
  });
}

/*
  input: id of food item
  output: name of food associated with the id
*/
function getFoodItem(id) {
  return new Promise(function (resolve, reject) {
      unirest.get("http://legacy.cafebonappetit.com/api/2/items?item="+ id)
      .header("Accept", "application/json")
      .end(function (result) {
        resolve(result.body.items[id].label);
    });
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

function handleDining(assistant) {
  var eatery = assistant.getArgument(EATERY_ENTITY);
  var meal_time = assistant.getArgument(MEALTIME_ENTITY)
  var menu_items = getDiningMenu(eatery, formatDate(new Date()), meal_time, rattyChangingDishes);
  menu_items.then(function (items) {
    var message = "The rotating items on today's menu at the " + eatery + " are: ";
    for (var i = 0; i < items.length; i++) {
      message = message + " " + items[i] + ",";
      if (i == items.length - 2) {
        message = message  + " and";
      }
    }
    assistant.tell(message);
  });
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
// var yellowBookMap = new Map();
// yellowBookMap.set("DPS", "401123456789");
// yellowBookMap.set("health service", "401999999999");

/* GET home page. */
router.post('/', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});
  
  function responseHandler (assistant) {

    const intent = req.body.result.metadata.intentName;
    
    switch (intent) {
     // case BROWN_YELLOWBOOK:
     //    getNumber(assistant);
     //    break;
      case SHUTTLE:
        handleShuttle(assistant);
        break;
      case SHUTTLE_FOLLOWUP:
        handleShuttle(assistant);
      case DINING:
        handleDining(assistant);
    }
  }

  assistant.handleRequest(responseHandler);
  //res.send();

});

module.exports = router;
