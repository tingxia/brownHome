# brownHome
Set up:
run npm install to get dependencies. No need to track them in git.
run node loader.js to install and populate database. The database will be under /data.

To run server:
You might want to use ngrok to mask localhost to a https or http url for testing purpose with api_ai. 
In the directory where you have downloaded ngrok, run ./ngrok http 3000. You will see the http or https 
url your localhost:3000 maps to. Copy either over, and open your api_ai fulfillment tab on the left of your api_ai interface, paste the http/https url to the URL field, and save. 
run the server by typing "node bin/www" in the brownHome directory. It is served at localhost:3000. 
Now your api_ai should be able to talk to your localhost server.

