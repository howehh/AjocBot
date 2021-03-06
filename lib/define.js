// ********** DEFINE **********
// Gives definitions of a word.
// ****************************
const config = require('./../config');
const jsonUtil = require('./bot-utils/jsonutil');
const callbacks = require('./callbacks');
const axios = require('axios');
const bot = require('./bot');

// Takes a json response from an oxford dictionary API call.
// Returns a string of 3 definitions maximum. Must have a chat filter in the cytube
// room "/br/" that creates a newline (<br>)
function getDefinitions(jsonResponse) {
   let msg = `*${decodeURI(jsonResponse.data.results[0].id)}* -`; // msg begins with the word
   const defs = jsonUtil.getKey(jsonResponse.data, "senses"); 
   let def;
   for (let i = 0; i < Math.min(3, defs.length); i++) { // adds maximum 3 defs to msg
      if (defs[i].shortDefinitions !== undefined) { // if short def exists
         def = defs[i].shortDefinitions[0];
      } else if (defs[i].definitions !== undefined) { // otherwise use long definition
         def = defs[i].definitions[0];  
      } else if (defs[i].crossReferenceMarkers !== undefined) { // else use crossReferenceMarker
         def = defs[i].crossReferenceMarkers[0];
      }
      if (def !== undefined) msg += ` ${i + 1}. ${def} /br/`;
   }
   return msg;
}

const chatEvents = {
   // Command to get definition(s) of a word from oxford dictionary api
   define: function(data) {
      if (data.tokens[0] === "!define" && data.tokens.length > 1) {
         const term = encodeURI(data.msg.substring(data.tokens[0].length + 1).trim()); 
         if (term === "alizee" || term === "aliz%C3%A9e") {
            bot.chat("*Alizée* - 1. perfection/br/ 2. unbelievably beautiful and sexy Corsican Goddess");
         } else {
            axios.get('https://od-api.oxforddictionaries.com/api/v2/entries/en-us/' + term
                      + "?strictMatch=false", {
               headers: {
                  "Accept": "application/json",
                  "app_id": config.dictionary.app_id,
                  "app_key": config.dictionary.app_key
               }
            })
            .then(function (response) {
               bot.chat(getDefinitions(response));
            })
            .catch(function(error) { // error message if word can't be found.
               if (error.response !== undefined && error.response.status === 404) {
                  bot.chat("I can't define that AlizeeFail");
               } else {
                  console.log(error);
               }
            });
            callbacks.cooldown(chatEvents.define, 7000); // 7 sec cooldown for api calls
         }
      }
   }
}
callbacks.addChatEvents(chatEvents);