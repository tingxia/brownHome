var express = require('express');
var router = express.Router();
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
const DEPARTMENT_INTENT = 'Brown_Department';
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/brownYellowbook', function(req, res, next) {
  res.render('index', { title: 'Express brown yellow book' });
});

function getNumber(assistant) {
  var dept = assistant.getArgument(DEPARTMENT_INTENT);
  if (yellowBookMap.get(dept) != null ) {
    console.log("got here");
    console.log('The number of ' + dept + ' is ' + yellowBookMap.get(dept));
    assistant.tell('The number of ' + dept + ' is ' + yellowBookMap.get(dept));
  } else {
    assistant.tell("Sorry, but I couldn't find the contact information for it");
  }
}

var yellowBookMap = new Map();
yellowBookMap.set("DPS", "401123456789");
yellowBookMap.set("health service", "401999999999");




/* GET home page. */
router.post('/brownYellowbook', function(req, res, next) {
  const assistant = new ApiAiAssistant({request: req, response: res});

  function responseHandler (assistant) {
    // todo: use intent in the future. can be parsed manually.
    //const intent = assistant.getIntent();
    //console.log("intent is ");
    //console.log(intent);
    //switch (intent) {
    //  case DEPARTMENT_INTENT:
    //    getNumber(assistant);
    //    break;
    //}
    getNumber(assistant);
  }

  assistant.handleRequest(responseHandler);
  res.send();

});

module.exports = router;
