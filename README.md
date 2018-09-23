# AjocBot
Bot for AJOC Cytube Channel

Bot Usage Instructions in case I have amnesia:

1. Configure config.json in AjocBot folder:

     - Cytube username and password fields are login for bot
     - socketConnection is the URL you are connecting to (ex: https://zip.cytu.be:10443)
     - channel is the name of the cytube channel to connect to
     - gist username and password fields are login for github. fileID is the gist you want to read/edit
     - openweathermapKey is API key from https://openweathermap.org/
     - twitchKey is API key from twitch.tv
     - dictionary app_id and app_key from Oxford dictionary
   
2. Install node and npm
3. `cd` into AjocBot folder through command prompt
4. `npm install` to install the node module dependencies
5. `node index.js` to run the bot
