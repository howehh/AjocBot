# AjocBot
Chatbot for Synchtube

Bot Usage Instructions in case I have amnesia:

1. Configure config.json in AjocBot folder:

     - Username and password fields are login for bot
     - channel is the name of the channel to join
     - firestore id is the id of your firestore project. Must also include a firestore.json keyfile in AjocBot directory
     - geocodeKey is the API key for https://opencagedata.com/
     - openweathermapKey is API key from https://openweathermap.org/
     - twitchKey is API key from twitch.tv
     - dictionary app_id and app_key from Oxford dictionary
     - secret paste = pastebin ID for secret emotes, triv paste = pastebin ID for trivia questions
   
3. `npm install` to install the node module dependencies

4. Run index.js
