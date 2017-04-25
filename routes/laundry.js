/**
 * Created by Ting on 4/23/17.
 */
var unirest = require('unirest');
const LAUNDRY_ENTITY = "LaundryRoom";
const LAUNDRY_MACHINE_TYPE = "LaundryMachineType";
const laundryTypeMap = new Map();

laundryTypeMap.set("washer", "washFL");
laundryTypeMap.set("dryer", "dblDry");
module.exports = {
  handleLaundry: function (assistant) {
      var room = assistant.getArgument(LAUNDRY_ENTITY);
      unirest.get("https://api.students.brown.edu/laundry/rooms?client_id=356e267c-3c75-418f-92a8-aec0eef5137c")
          .header("Accept", "application/json")
          .end(function (result) {
              var id = "";
              var results = result.body.results;
              for (var i = 0; i < results.length; i++) {
                  if (results[i].name.includes(room)) {
                      id = results[i].id;
                      break;
                  }
              }
              if (id === "") {
                  assistant.ask("Sorry, but I was not able to find the room" + room);
              } else {
                  getLaundryRoomStatus(assistant, id);
              }
          });
}
};


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
                assistant.ask("Sorry, but I was not able to retrieve machine status at this time");
            } else {
                if (count == res.length) {
                    assistant.ask("There " + be + count + " " +originalType + " that "+ be +"available");
                } else {
                    assistant.ask(response);
                }
            }

        });

}