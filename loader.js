/**
 * Created by Ting on 4/15/17.
 */
//// loader stuff
var anyDB = require('any-db');
var unirest = require('unirest');
var conn = anyDB.createConnection('sqlite3://data/test.db');
//create table messages
conn.query("DROP table IF EXISTS shuttleStops");
var sqlCreate = "CREATE TABLE shuttleStops (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "code TEXT, " +
    "lat NUMBER, " +
    "lng number, " +
    "route_id TEXT, " +
    "stop_id TEXT, " +
    "name TEXT);";
conn.query(sqlCreate, function () {
    console.dir("Made table shuttleStops!");
});

unirest.get("https://transloc-api-1-2.p.mashape.com/stops.json?agencies=635&callback=call")
    .header("X-Mashape-Key", "0PiJbg4Ao5mshixwHHSHZTiy5ZGGp1ptfx1jsn82ux5n1i0qqe")
    .header("Accept", "application/json")
    .end(function (result) {
        console.log(result.body.data[0]);
        for (i=0; i < result.body.data.length; i++) {
            var code = result.body.data[i].code,
                lat = result.body.data[i].location.lat,
                lng =result.body.data[i].location.lng,
                route_id = result.body.data[i].routes[0],
                stop_id =result.body.data[i].stop_id,
                name = result.body.data[i].name ;
            var row = [code, lat, lng, route_id,stop_id, name.toLowerCase()];
            conn.query('INSERT INTO shuttleStops VALUES (NULL, $1, $2, $3, $4, $5, $6)', row, function (err) {
                if (err) {
                    console.log('Failed to insert row in the database.');
                    console.error(err);
                } else {
                    console.log("New stop info has been inserted into the database");
                }
            });
        }
    });