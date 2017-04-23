// entity documentation: https://docs.api.ai/docs/concept-entities#section-developer-enum-type-entities

var express = require('express');

var router = express.Router();
var unirest = require('unirest');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
var parseString = require('xml2js').parseString;
var laundryFunction = require('./laundry.js');
var shuttleFunction = require('./shuttle.js');



// ENTITIES:
const DEPARTMENT_ENTITY = 'Brown_Department';
const EATERY_ENTITY = 'Eatery';
const MEALTIME_ENTITY = 'MealTime';
const FOODTYPE_ENTITY = 'FoodType';

const TIME_PERIOD_PARAMETER = 'TimePeriod'; // used in BrownEvents intent
const EVENT_CATEGORY_ENTITY = 'EventCategory';

// INTENTS (which double as actions):
const SHUTTLE = 'Shuttle';
const DINING_MENU = "Dining";
const BROWN_EVENTS = 'BrownEvents';
const LAUNDRY = "Laundry";

// ACTIONS:
const DINING_HOURS = "dining-hours";

// CONTEXTS
//const DINING_CONTEXT = "dining-followup";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/brownCentric', function(req, res, next) {
  res.render('index', { title: 'Express brown centric' });
});


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
    console.log("got here in handle dining");
  var eatery = assistant.getArgument(EATERY_ENTITY);
  if (eatery == JOS){
      assistant.tell("Sorry, I do not support queries for Jo's menus yet. However, I do support Ratty, Blue Room, V-Dub and Andrews Commons.");
    return;
  }

  var meal_time = assistant.getArgument(MEALTIME_ENTITY);
  var food_types = assistant.getArgument(FOODTYPE_ENTITY);

  var coursesToLookUp = [];
  var message = "";
  if (food_types.length == 0) {
    coursesToLookUp = defaultChangingDishes.get(eatery);
    message = "The rotating items on today's menu for " + meal_time + " at the " + eatery + " are: ";
  } else {
    for (var i = 0; i < food_types.length; i++) {
      coursesToLookUp.push(course.get(eatery + food_types[i]));
      message = message + food_types[i] + " ";
      if (i == food_types.length - 2) {
        message = message + " and ";
      }
    }
    message = message + " options at the " + eatery + " for " + meal_time + " are: ";
  }
  
  var menu_items = getDiningMenu(eatery, formatDate(new Date()), meal_time, coursesToLookUp);
  menu_items.then(function (items) {
    for (var i = 0; i < items.length; i++) {
      message = message + " " + items[i] + ",";
      if (i == items.length - 2) {
        message = message  + " and";
      }
    }

    if (items.length == 0) {
      assistant.tell("Sorry, I couldn't find any items.")
    } else {
      assistant.tell(message);
    }
  });
}

function handleDiningHours(assistant){
  var eatery = assistant.getArgument(EATERY_ENTITY);
  var mealTime = assistant.getArgument(MEALTIME_ENTITY);

  var hours_promise = getDiningTime(eatery, formatDate(new Date()), mealTime);
  hours_promise.then(function (ret) {
    assistant.tell(eatery + " " + mealTime + " hours are " + ret.start + " to " + ret.end + " today "); // to do: be able to check for other days (not just today)
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


/* GET home page. */
router.post('/', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});

     //    function responseHandler (assistant) {
     //
     //        const intent = req.body.result.metadata.intentName;
     //        switch (intent) {
     //            case SHUTTLE:
     //                shuttleFunction.handleShuttle(assistant);
     //                break;
     //            case SHUTTLE_FOLLOWUP:
     //                handleShuttle(assistant);
     //                break;
     //            case DINING_MENU:
     //                handleDining(assistant);
     //                break;
     //            case DINING_HOURS:
     //                handleDiningHours(assistant);
     //            case BROWN_EVENTS:
     //                handleBrownEvents(assistant);
     //                break;
     //            case LAUNDRY:
     //                laundryFunction.handleLaundry(assistant);
     //                break;
     //
     //        }
     //    }
     //assistant.handleRequest(responseHandler);


  const actionMap = new Map();
  actionMap.set(SHUTTLE, shuttleFunction.handleShuttle);
  actionMap.set(DINING_MENU, handleDining);
  actionMap.set(DINING_HOURS, handleDiningHours);
  actionMap.set(BROWN_EVENTS, handleBrownEvents);
  actionMap.set(LAUNDRY, laundryFunction.handleLaundry);
  assistant.handleRequest(actionMap);

  //res.send();

});

module.exports = router;
