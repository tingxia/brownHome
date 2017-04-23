// entity documentation: https://docs.api.ai/docs/concept-entities#section-developer-enum-type-entities

var express = require('express');
//var shuttleDB = require('./shuttle')
var router = express.Router();
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://data/test.db');
var unirest = require('unirest');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
var parseString = require('xml2js').parseString;

// ENTITIES:
const DEPARTMENT_ENTITY = 'Brown_Department';
const SHUTTLE_STOP_ENTITY = 'ShuttleStop';
const IS_DAYTIME_SHUTTLE = "isDayTimeShuttle";
const EATERY_ENTITY = 'Eatery';
const MEALTIME_ENTITY = 'MealTime';
const FOODTYPE_ENTITY = 'FoodType';
const LAUNDRY_ENTITY = "LaundryRoom";
const LAUNDRY_MACHINE_TYPE = "LaundryMachineType";
const DATE_ENTITY = "Date";
const FOODRESTRICTION_ENTITY = "FoodRestriction";

const TIME_PERIOD_PARAMETER = 'TimePeriod'; // used in BrownEvents intent
const EVENT_CATEGORY_ENTITY = 'EventCategory';

// INTENTS (which double as actions):
const SHUTTLE = 'Shuttle';
const SHUTTLE_FOLLOWUP = "Shuttle-followup";
const DINING_MENU = "Dining";
const BROWN_EVENTS = 'BrownEvents';
const LAUNDRY = "Laundry";

// ACTIONS:
const DINING_HOURS = "dining-hours";

// CONTEXTS
const SHUTTLE_CONTEXT = "shuttle-ctx";
//const DINING_CONTEXT = "dining-followup";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/brownCentric', function(req, res, next) {
  res.render('index', { title: 'Express brown centric' });
});

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
diningHalls.set(VDUB, "1532"); // Verney-Wooley
diningHalls.set(ANDREWS, "1533"); // Andrews Commons
diningHalls.set(BLUE_ROOM, "1534"); // Blue Room
diningHalls.set(JOS, "1535"); // Josiahs

const DESSERT = "dessert";
const COMFORT = "comfort";
const VEGETARIAN = "vegetarian";
const PIZZA = "pizza";
const SALAD = "salad";
const OMELET = "omelet";
const BREAKFAST = "breakfast";
const SPECIAL = "special";
const SOUP = "soup";
const STIRFRY = "stirfry";
const DELI = "deli";
const WOK = "wok";
const PHO = "pho";
const BAKERY = "bakery";
const FOCACCIABAR = "focaccia";
const BURRITOBAR = "burrito";
const INDIAN = "indian";
// const QUESADILLAS = "quesadilla"; // jo's-specific constants
// const GRILL = "grill";
// const WEEKDAYS = "weekdays";
// const WEEKENDS = "weekends";

var course = new Map();
// Ratty Constants:
course.set(RATTY + DESSERT, "12278"); 
course.set(RATTY + COMFORT, "12176");
course.set(RATTY + VEGETARIAN, "12177"); 
course.set(RATTY + PIZZA, "12305");
course.set(RATTY + SALAD, "12174");
course.set(RATTY + OMELET, "13506");
// Vdub Constants:
course.set(VDUB + BREAKFAST, "12368");
course.set(VDUB + DESSERT, "12405");
course.set(VDUB + COMFORT, "12419");
course.set(VDUB + SPECIAL, "12369");
course.set(VDUB + SOUP, "12404");
course.set(VDUB + STIRFRY, "12420");
course.set(VDUB + SALAD, "12402");
course.set(VDUB + DELI, "12403");
// Andrews Constants:
course.set(ANDREWS + WOK, "12344");
course.set(ANDREWS + PIZZA, "12341");
course.set(ANDREWS + SPECIAL, "12342");
course.set(ANDREWS + PHO, "12343");
// Blue Room Constants:
course.set(BLUE_ROOM + BAKERY, "12347");
course.set(BLUE_ROOM + DELI, "12433");
course.set(BLUE_ROOM + SOUP, "12348");
course.set(BLUE_ROOM + FOCACCIABAR, "12421");
course.set(BLUE_ROOM + BURRITOBAR, "12434");
course.set(BLUE_ROOM + INDIAN, "12424");
// Jo's Constants:
// TODO doesn't support Jo's because Jo's data is formatted differently
// course.set(JOS + SPECIAL, "12028"); // TODO: only supports specials on weekdays
// course.set(JOS + SPECIAL + WEEKDAYS, "12028");
// course.set(JOS + SPECIAL + WEEKENDS, "12365");
// //course.set(JOS + QUESADILLAS, "12032");
// course.set(JOS + GRILL, "12030");
// course.set(JOS + SALAD, "12029");

const defaultChangingDishes = new Map();
defaultChangingDishes.set(VDUB, [course.get(VDUB + BREAKFAST), course.get(VDUB + DESSERT), course.get(VDUB + COMFORT), course.get(VDUB + SOUP), course.get(VDUB + STIRFRY)]);
defaultChangingDishes.set(RATTY, [course.get(RATTY + DESSERT), course.get(RATTY + VEGETARIAN), course.get(RATTY + COMFORT)]);
defaultChangingDishes.set(ANDREWS, [course.get(ANDREWS + WOK), course.get(ANDREWS + PIZZA), course.get(RATTY + SPECIAL), course.get(ANDREWS + PHO)]);
defaultChangingDishes.set(BLUE_ROOM, [course.get(BLUE_ROOM + BAKERY), course.get(BLUE_ROOM + SOUP), course.get(BLUE_ROOM + INDIAN), course.get(BLUE_ROOM + BURRITOBAR)]);
//defaultChangingDishes.set(JOS, [course.get(JOS + SPECIAL + WEEKDAYS), course.get(JOS + SPECIAL + WEEKENDS)]);

const foodRestrictionsMap = new Map();
foodRestrictionsMap.set("vegetarian", ["1", "4"]); // vegetarian includes items labeled vegan
foodRestrictionsMap.set("vegan", ["4"]);
foodRestrictionsMap.set("gluten-free", ["9"]);

const laundryTypeMap = new Map();
laundryTypeMap.set("washer", "washFL");
laundryTypeMap.set("dryer", "dblDry");

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
// returns station information if mealTime is valid; else returns a list of valid mealtimes
function getMeal(menu, mealTime) {
  var allMeals = menu["dayparts"][0];
  var validMealTimes = [];
  for (var i = 0; i < allMeals.length; i++) {
    if (allMeals[i].label == mealTime) {
      return allMeals[i];
    }
    validMealTimes.push(allMeals[i].label)
  }
    return validMealTimes
}

// gets dining json
function getDiningJson(diningHallName, date) {
  //var includeAllCourses = courses.length == 0;
  var diningHallCode = diningHalls.get(diningHallName);
  return new Promise(function(resolve, reject) {
    unirest.get("http://legacy.cafebonappetit.com/api/2/menus?cafe="+ diningHallCode +"&date=" + date)
      .header("Accept", "application/json")
      .end(function (result) {
          resolve(result);
    });
  });
}

// date should be formatted
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
  Current Unused
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
  if (eatery == JOS){
      assistant.tell("Sorry, I do not support queries for Jo's menus yet. However, I do support Ratty, Blue Room, V-Dub and Andrews Commons.");
    return;
  }

  var meal_time = assistant.getArgument(MEALTIME_ENTITY);
  var food_types = assistant.getArgument(FOODTYPE_ENTITY);
  var date = assistant.getArgument(DATE_ENTITY);
  var original_food_restriction = assistant.getArgument(FOODRESTRICTION_ENTITY);
  var food_restriction = null;

  if (date == null || date == "today") {
      date = formatDate(new Date());
  }

  if (original_food_restriction != null) {
      food_restriction = foodRestrictionsMap.get(original_food_restriction);
  }

  //setting up items to look up & messages
  var coursesToLookUp = [];
  var message = "";
  if (food_types.length == 0) {
    coursesToLookUp = defaultChangingDishes.get(eatery);
    if (food_restriction == null) {
        message = "The main items on the menu on " + date  + " for " + meal_time + " at " + eatery + " are: ";
    } else {
        message = "The main " + original_food_restriction + " options on the menu on " + date  + " for " + meal_time + " at " + eatery + " are: ";
    }

  } else {
  if (food_restriction != null) {
      message = original_food_restriction + " ";
  }
    for (var i = 0; i < food_types.length; i++) {
      coursesToLookUp.push(course.get(eatery + food_types[i]));
      message = message + food_types[i] + " ";
      if (i == food_types.length - 2) {
        message = message + " and ";
      }
    }
    message = message + " options at the " + eatery + " for " + meal_time + " are: ";
  }

  var menu = getDiningJson(eatery, date);

  menu.then(function (result) {

      var allMealItems = getMeal(getDiningHallInfo(result, diningHalls.get(eatery)), meal_time);

      if (allMealItems["stations"] == undefined) {
        // mealType doesn't exist for this dining hall
          if (allMealItems.length == 0) {
              assistant.tell("Unable to retrieve information for " + eatery + " on " + date + ".  This probably means the dining hall is closed for " + meal_time);
          } else {

              message = meal_time + " at " + eatery + " does not exist. Try: ";
              for (var i = 0; i < allMealItems.length; i++) {
                  message = message + " " + allMealItems[i];
                  if (i == allMealItems.length - 2) {
                      message = message + " or";
                  }
              }
              assistant.tell(message);
          }
      } else {
          var item_lookup = result.body.items;
          var stations = allMealItems["stations"];
          var foodList = [];
          // front-end deals with determining whether coursesToLookUp is correct (check FoodType Entity)
          // assumption coursesToLookup is valid
          var includeAllCourses = coursesToLookUp == []; // include all courses if coursesToLookUp is empty
          for (var i = 0; i < stations.length; i++) {
              if (!includeAllCourses) {
                  // if we don't want to include all courses, check to make sure the label is in courses
                  if (coursesToLookUp.indexOf(stations[i].id) < 0) {
                      continue;
                  }
              }

              // include/exclude dishes
              for (var j = 0; j < stations[i].items.length; j++) {
                  var id = stations[i].items[j];
                  if (food_restriction != null) {
                      // if there are food restrictions, then only add items to the list that are OK
                      for (var k = 0; k < food_restriction.length; k++) {
                          if (item_lookup[id]["cor_icon"][food_restriction[k]] != undefined) {
                              foodList.push(item_lookup[id].label);
                              continue;
                          }
                      }
                  } else {
                      foodList.push(item_lookup[id].label);
                  }
              }
          }

          for (var i = 0; i < foodList.length; i++) {
              message = message + " " + foodList[i] + ",";
              if (i == foodList.length - 2) {
                  message = message  + " and";
              }
          }

          if (foodList.length == 0 && food_types.length == 0 && food_restriction == null) {
              assistant.tell("Sorry, I couldn't find any items for " + eatery + " at " + meal_time);
          } else if (foodList.length == 0 && food_restriction != null){
              assistant.tell("Sorry, I couldn't find any " + original_food_restriction + " options for " + eatery + " at " + meal_time);
          } else if (foodList.length == 0) {
              message = "Sorry, I couldn't find any items for " + eatery + " at " + meal_time + " in the category ";
              for (var i = 0; i < food_types.length; i++) {
                  message = message + " " + food_types[i];
                  if (i == food_types.length - 2) {
                      message = message + " or";
                  }
              }
              assistant.tell(message);
          } else {
              assistant.tell(message);
          }
      }
  });
}

function handleDiningHours(assistant){
  var eatery = assistant.getArgument(EATERY_ENTITY);
  var mealTime = assistant.getArgument(MEALTIME_ENTITY);
  var date = assistant.getArgument(DATE_ENTITY);

  var hours_promise = getDiningTime(eatery, date, mealTime);
  hours_promise.then(function (ret) {
      if (ret.start == undefined) {
          assistant.tell(eatery + " is not serving " + mealTime + " on " + date);
      } else {
          assistant.tell(eatery + " " + mealTime + " hours are " + ret.start + " to " + ret.end + " on " + date);
      }
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
                if (err) {
                  console.log(err);
                    assistant.tell("Sorry, there was an error occurred when I tried to find the stop_id for" +
                        "stop " + originalName);
                } else if (result.rowCount == 0) {
                    assistant.tell("Sorry, but I don't know a shuttle stop called " + originalName);
                } else if (!err) {
                        var stop_id = result.rows[0].stop_id;
                        if (stop_id !== undefined && stop_id !== "") {
                            requestArrivalEstimatesByStopId(originalName, stop_id, assistant);
                        }
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
                    assistant.tell("Sorry, but I don't know a shuttle stop called " + originalName);
                } else if (!err) {
                    if (rowCount > 1) {
                        //console.log("more than 1 rowCount");
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
                  assistant.tell("The shuttle is arriving now at " + name);
                } else {
                //TODO: add time from now (ie: "will arrive in 5 minutes at 6:24pm")
                  assistant.tell("The next shuttle will arrive at " + name + " in " + date_diff.getMinutes() + " minutes " + " at " + arrival_time.toLocaleTimeString());
                }
            }
        });
}

//  input duration: {"amount": 10, "unit": min}
function calcDays(duration) {
  if (duration == "day" || duration == "today") {
      return 1;
  } else if (duration == "week"){
      return 7;
  } else if (duration == "month") {
      return 31;
  }

  switch (duration["unit"]) {
    case "day":
      return duration.amount;
    case "wk":
      return duration.amount * 7;
    case "month":
      return duration.amount * 31;
  }

  return 2; // by default returns 2 days
}

/**
 * Very basic - looks up events for a given category and time period (ie: next 5 days)
 * @param assistant, google home assistant
 */
function handleBrownEvents(assistant) {
  var days = calcDays(assistant.getArgument(TIME_PERIOD_PARAMETER));
  var eventCategory = assistant.getArgument(EVENT_CATEGORY_ENTITY);
  if (eventCategory == null) {
      eventCategory = "";
  }
  var message = eventCategory + " events in the next " + days + " days are: ";
  unirest.get("http://events.brown.edu:/cal/main/listEvents.do?b=de&skinName=rss-list&setappvar=summaryMode(details)&days=" + days + "&cat=" + eventCategory)
    .header("Accept", "application/xml")
    .end(function (result) {
      parseString(result.body, function (err, result) {
        var list_events = result.rss.channel[0].item;
        for (var i = 0; i < list_events.length; i++) {
          message = message + " " + list_events[i].title;
        }
        if (list_events.length == 0) {
            assistant.tell("There are no " + eventsCategory + " events in the next " + days + "days");
        } else {
            assistant.tell(message);
        }
      });
  });
}

function handleLaundry(assistant) {
    console.log("got here in handle laundry");
    var room = assistant.getArgument(LAUNDRY_ENTITY);
    unirest.get("https://api.students.brown.edu/laundry/rooms?client_id=356e267c-3c75-418f-92a8-aec0eef5137c")
        .header("Accept", "application/json")
        .end(function (result) {
            var id = "";
            console.log(result.body);
            var results = result.body.results;
            for (var i = 0; i < results.length; i++) {
                if (results[i].name.includes(room)) {
                    id = results[i].id;
                    break;
                }
            }
            if (id === "") {
                assistant.tell("Sorry, but I was not able to find the room" + room);
            } else {
                getLaundryRoomStatus(assistant, id);
            }
        });
}

function getLaundryRoomStatus(assistant, id) {
    var originalType = assistant.getArgument(LAUNDRY_MACHINE_TYPE);
    var laundryType = laundryTypeMap.get(originalType);
    unirest.get("https://api.students.brown.edu/laundry/rooms/" + id +"/machines?client_id=356e267c-3c75-418f-92a8-aec0eef5137c&get_status=true")
        .header("Accept", "application/json")
        .end(function (result) {
            var res = [];
            var count = 0;
            var response = "";
            for (var i = 0; i < result.body.results.length; i++) {
                var curMachine = result.body.results[i];
                if (curMachine.type.includes(laundryType)) {
                    if (curMachine.avail) {
                        res.push(-1);
                        count += 1;
                    } else {
                        res.push(curMachine.time_remaining);
                        response = response + curMachine.time_remaining + "minutes, "
                    }
                }
            }
            response = response + "left.";
            originalType = count == 1 ? originalType : originalType + "s";
            var ones = res.length - count > 1 ? "ones in use have " : "one in use has ";
            var be = count == 1? "is ":"are ";
            response = "There " +  be  + count + " " +originalType + " available, and the " + ones + response;
            if (res.length == 0) {
                assistant.tell("Sorry, but I was not able to retrieve machine status at this time");
            } else {
                if (count == res.length) {
                    assistant.tell("There " + be + count + " " +originalType + " that are available");
                } else {
                    assistant.tell(response);
                }
            }

        });

}
/* GET home page. */
router.post('/', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});

  const actionMap = new Map();
  actionMap.set(SHUTTLE, handleShuttle);
  actionMap.set(SHUTTLE_FOLLOWUP, handleShuttle);
  actionMap.set(DINING_MENU, handleDining);
  actionMap.set(DINING_HOURS, handleDiningHours);
  actionMap.set(BROWN_EVENTS, handleBrownEvents);
  actionMap.set(LAUNDRY, handleLaundry);
  assistant.handleRequest(actionMap);

});

module.exports = router;
