/**
 * Created by Bev on 4/23/17.
 */

var unirest = require('unirest');
var util = require('./util.js');
var convertTimeToSpeakableString = util.convertTimeToSpeakableString;

// ENTITIES
const EATERY_ENTITY = 'Eatery';
const MEALTIME_ENTITY = 'MealTime';
const FOODTYPE_ENTITY = 'FoodType';
const DATE_ENTITY = "Date";
const FOODRESTRICTION_ENTITY = "FoodRestriction";
const ORIGINAL = "Original";

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
// TODO: Currently doesn't support Jo's because Jo's data is formatted differently
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

module.exports = {
    handleDiningHours: function (assistant){
        var eatery = assistant.getArgument(EATERY_ENTITY);
        var mealTime = assistant.getArgument(MEALTIME_ENTITY);
        var date = assistant.getArgument(DATE_ENTITY);
        var original_date = assistant.getArgument(DATE_ENTITY + ORIGINAL);
        // TODO: check if original_date is correct matchup with date (ie: tomorrow is actually tomorrow's date, today is actually today's date)

        var hours_promise = getDiningTime(eatery, date, mealTime);
        hours_promise.then(function (ret) {
            if (ret.start == undefined) {
                assistant.ask(eatery + " is not serving " + mealTime + " " +  original_date);
            } else {
                var start_split = ret.start.split(":");
                var end_split = ret.end.split(":");
                assistant.ask(eatery + " " + mealTime + " hours are " + convertTimeToSpeakableString(parseInt(start_split[0]), parseInt(start_split[1])) + " to " + convertTimeToSpeakableString(parseInt(end_split[0]), parseInt(end_split[1])) + " " +  original_date);
            }
        });
    },
    handleDining: function (assistant) {
        var eatery = assistant.getArgument(EATERY_ENTITY);
        if (eatery == JOS) {
            assistant.ask("Sorry, I do not support queries for Jo's menus yet. However, I do support Ratty, Blue Room, V-Dub and Andrews Commons.");
            return;
        }

        // SET UP
        var meal_time = assistant.getArgument(MEALTIME_ENTITY);
        var food_types = assistant.getArgument(FOODTYPE_ENTITY);
        var date = assistant.getArgument(DATE_ENTITY);
        var original_food_restriction = assistant.getArgument(FOODRESTRICTION_ENTITY);
        var food_restriction = null;

        if (date == null || date == "today") {
            date = formatDate(new Date()); // assumes date is today if not given a date
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
                message = "The main items on the menu on " + date + " for " + meal_time + " at " + eatery + " are: ";
            } else {
                message = "The main " + original_food_restriction + " options on the menu on " + date + " for " + meal_time + " at " + eatery + " are: ";
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
        console.log("about to get dining json");
        console.log(date);
        var menu = getDiningJson(eatery, date); // returns a Promise (async call to API)
        
        menu.then(function (result) { // waits for Promise's return and then parses through json to retrieve items requested
            var allMealItems = getMeal(getDiningHallInfo(result, diningHalls.get(eatery)), meal_time);

            if (allMealItems["stations"] == undefined) {
                // mealType doesn't exist for this dining hall
                if (allMealItems.length == 0) {
                    assistant.ask("Unable to retrieve information for " + eatery + " on " + date + ".  This probably means the dining hall is closed");
                } else {
                    message = meal_time + " at " + eatery + " does not exist on " + date + " . Try: ";
                    // Prompts the user to check for a different meal_time (ie: Breakfast/Brunch/Dinner... etc.)
                    for (var i = 0; i < allMealItems.length; i++) {
                        message = message + " " + allMealItems[i] + ",";
                        if (i == allMealItems.length - 2) {
                            message = message + " or";
                        }
                    }
                    assistant.ask(message);
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
                        // if it's not, then we skip the current food category based on coursesToLookUp (FoodType)
                        if (coursesToLookUp.indexOf(stations[i].id) < 0) {
                            continue;
                        }
                    }

                    // include/exclude dishes based on food_restriction (FoodRestriction)
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

                // Creating message for food items.
                for (var i = 0; i < foodList.length; i++) {
                    message = message + " " + foodList[i] + ",";
                    if (i == foodList.length - 2) {
                        message = message + " and";
                    }
                }

                // Final report of message to assistant:
                if (foodList.length == 0 && food_types.length == 0 && food_restriction == null) {
                    assistant.ask("Sorry, I couldn't find any items for " + eatery + " at " + meal_time);
                } else if (foodList.length == 0 && food_restriction != null) {
                    assistant.ask("Sorry, I couldn't find any " + original_food_restriction + " options for " + eatery + " at " + meal_time);
                } else if (foodList.length == 0) {
                    message = "Sorry, I couldn't find any items for " + eatery + " at " + meal_time + " in the category ";
                    for (var i = 0; i < food_types.length; i++) {
                        message = message + " " + food_types[i];
                        if (i == food_types.length - 2) {
                            message = message + " or";
                        }
                    }
                    assistant.ask(message);
                } else {
                    assistant.ask(message);
                }
            }
        });
    }
};

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

    var date = new String(date);
    if (date.length == 1) {
        date = 0 + date;
    }

    return year + "-" + month + "-" + date;
}

// returns dining hall menu (array of "dayparts")
function getDiningHallInfo(json, diningHallCode) {
    return json.body.days[0].cafes[diningHallCode];
}

// mealTime == Breakfast, Brunch, Lunch or Dinner [MealType]
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

// date should be formatted with formatDate
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
