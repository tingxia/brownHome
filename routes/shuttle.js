/**
 * Created by Ting on 4/17/17.
 */
var express = require('express');
var router = express.Router();
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://data/test.db');
var unirest = require('unirest');

/* GET users listing. */
router.get('/', function(req, res, next) {
    // name has to be lower case
    var name = "cit";
    var name = "%"+name.toLowerCase()+"%";
    requestArrivalEstimateByName(name);
    res.send('respond with a resource');
});

function requestArrivalEstimateByName(name) {
    // find the stop_id
    conn.query("SELECT * FROM shuttleStops WHERE " +
        "name like $1",
        [name], function(err, result){
            var rowCount = result.rowCount;
            if (rowCount == 0) {
                //return "there was no matching stop_id for the given name";
            } else if (!err) {
                console.log(result.rows[0]);
                console.log(result.rows[0].stop_id);
                var stop_id = result.rows[0].stop_id;
                if (stop_id !== undefined && stop_id !== "")
                requestArrivalEstimatesByStopId(stop_id);

                //return result.rows[0].stop_id;
            } else {
                console.log(err);
               //return "error occured querying for a stop_id from a stop name";
            }
        });
}

function requestArrivalEstimatesByStopId(stop_id) {

    // These code snippets use an open-source library. http://unirest.io/nodejs
    unirest.get("https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=635&callback=call&stops="+stop_id)
        .header("X-Mashape-Key", "0PiJbg4Ao5mshixwHHSHZTiy5ZGGp1ptfx1jsn82ux5n1i0qqe")
        .header("Accept", "application/json")
        .end(function (result) {
            //console.log(result.status, result.headers, result.body);
            if (result.body.data.length == 0) {
                console.log("there are no arrival estimates for the stop currently.")
            } else {
                var next_arrival_time =  result.body.data[0].arrivals[0].arrival_at;
                console.log("next arrival time is " + next_arrival_time)
            }

        });
}

module.exports = router;