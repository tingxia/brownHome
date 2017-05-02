/**
 * Created by Bev on 4/23/17.
 */
var unirest = require('unirest');
var parseString = require('xml2js').parseString;

const TIME_PERIOD_PARAMETER = 'TimePeriod'; // used in BrownEvents intent
const EVENT_CATEGORY_ENTITY = 'EventCategory';

module.exports = {
    handleBrownEvents: function (assistant) {
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
                    if (list_events === undefined) {
                        assistant.ask("There are no " + eventCategory + " events in the next " + days + "days");
                        return;
                    }
                    for (var i = 0; i < list_events.length; i++) {
                        message = message + " " + list_events[i].title;
                    }
                    if (list_events.length == 0) {
                        assistant.ask("There are no " + eventCategory + " events in the next " + days + "days");
                    } else {
                        assistant.ask(message);
                    }
                });
            });
    }
};

//  input duration: {"amount": 10, "unit": min} or string: today, week, month
function calcDays(duration) {
    if (duration == null) {
        return 2; // by default
    }

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