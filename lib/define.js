// ********** DEFINE **********
// Gives definitions of a word.
// ****************************
const config = require('./../config');
const axios = require('axios');
const bot = require('./bot');

function getDefinitions(jsonResponse) {
   let msg = "*" + jsonResponse.data.results[0].id + "* -"; // msg begins with the word
   const defs = jsonResponse.data.results[0].lexicalEntries[0].entries[0].senses; 
   for (let i = 0; i < Math.min(3, defs.length); i++) { // adds maximum 3 defs to msg
      if (defs[i].short_definitions !== undefined) { // if short def exists
         msg += " " + (i + 1) + ". " + defs[i].short_definitions[0] + "/br/";
      } else {
         msg += " " + (i + 1) + ". " + defs[i].definitions[0] + "/br/";
      }
   }
   return msg;
}

module.exports = {
   
   define: function(data) {
      if (data.msg.startsWith("!define ")) {
         if (!bot.cooldown("define", 7000)) {return}
         const term = data.msg.substring(8).trim(); 
         if (encodeURI(term) === "alizee" || encodeURI(term) === "aliz%C3%A9e") {
            bot.chat("*alizee* - 1. perfection/br/ 2. unbelievably beautiful and sexy french goddess");
         } else {
            axios.get('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + encodeURI(term), {
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
         }
      }
   }
}