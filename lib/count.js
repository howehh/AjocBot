// **************************** ALIZEE COUNTER ****************************
// Counts the number of total Alizee mentions in chat and saves count to gist.
// ************************************************************************
const bot = require('./bot');
const config = require('./../config');
const axios = require('axios');
const points = require('./points');

const countState = {
   count: 0,
   launchDate: "",
   DAILY_QUOTA: 1000
};

// Pre: must have a gist that contains:
//    - a file called "alizeecount", with a number denoting number of mentions
//    - a file called "launchdate", with a date (m/d/yyyy) indicating when count started
// Post: Reads a github gist to get launch date and the saved count of Alizee mentions.
axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   countState.launchDate = response.data.files.launchdate.content;
   countState.count = parseInt(response.data.files.alizeecount.content, 10);
});

// Returns the number of days since the bot started counting
function getElapsedDays() {
   const then = new Date(countState.launchDate);
   const now = new Date();
   return parseInt((now.getTime() - then.getTime()) / 86400000, 10);
}

// If the user's message got the daily quota, user earns points if eligible.
// Otherwise, just sends a milestone message.
function handleMilestone(username) {
   let result = "Alizee mention milestone: " + countState.count + "! ";
   if (countState.count === getElapsedDays() * countState.DAILY_QUOTA
       && points.pointEligible(username)) {
      points.adjustPoints(username, 25);
      result += username + " earned 25 points for getting us today's quota ";
   }
   bot.chat(result + "AlizeeYay");
}

module.exports = {
   // For every message that includes an Alizee keyword, increments the counter.
   // Every 500 mentions triggers a milestone alert with the current count.
   counter: function(data) {
      const terms = ["alizee", "alizée", "alizbae", "fastcarz", "alulzee", "mlolita", "lili"];
      for (let i = 0; i < terms.length; i++) {
         if (data.msg.indexOf(terms[i]) !== -1) {
            countState.count++;
            if (countState.count % 500 === 0) {
               handleMilestone(data.username.toLowerCase());
            }
            break;
         }
      }
   }, 
   
   // Reports the current count
   countReport: function(data) {
      if (data.msg.indexOf("!count") !== -1) {
         bot.chat("Alizee has been mentioned or had her emotes used in `" + countState.count + 
                  "` messages since " + countState.launchDate + " (" + getElapsedDays() +
                  " days ago) AlizeeOP");
      }
   },

   getCount: function() {
      return countState.count;
   }
};