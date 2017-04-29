# brownHome
### Backend Service Set up:
	run "npm install" to get dependencies. No need to track them in git.
	run "node loader.js" to install and populate database. The database will be under /data.

### To run Backend Server:
1. ngrok:  Install ngrok to mask localhost to a https or http url for testing purpose with api_ai.
  * In the directory where you have downloaded ngrok, run ./ngrok http 3000. You will see the http or https url your localhost:3000 maps to. Copy either over (https when previewing), then opening your api_ai fulfillment tab on the left of your api_ai interface, paste the http/https url to the URL field and save.
2. Run the server by typing "node bin/www" in the brownHome directory. It is served at localhost:3000.  Now your api_ai should be able to talk to your localhost server.

### Frontend Api.Ai Setup to interact with Backend server:
1. Navigate to [api.ai](https://api.ai/) and log in to your account.
2. Create a new agent.  Name it BrownHome.
3. Navigate to the settings of the agent. (Click on the cog-icon to the right of the agent name on the left-handside menu.)
4. Choose the "Export and Import" tab.  
5. Choose "Restore from Zip" and restore the newest version of the api_ai zip files found in api_ai.
6. Enable the Webhook in Fulfillment (Click on Fulfillment on the left-handside menu).  For the URL, put the URL for ngrok in step #1 for setting up the Backend server (as before, https for preview).  You may need to manually check off "Use webhook" under "Fulfillment" for each intent imported.

### After setting up Backend Server & Api.AI, test the Action on Google Home:
1. Navigate to "Integrations" on the left-handside menu. 
2. Enable Actions on Google, setting "Invocation name for testing" to "Brown Home".
3. Authorize and then Preview the Action using [Google's Web Simulator](https://developers.google.com/actions/tools/web-simulator).  If your Google Home is connected with the same account the Action is authorized with, you can test the Action on your Google Home by invoking the Action by saying "Talk to Brown Home."  Note that previews only last for 24 hours.
  * For more information on the web simulator: https://developers.google.com/actions/tools/testing  
