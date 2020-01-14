// **************************** ALIZEE COUNTER ****************************
// Counts the number of total Alizee mentions in chat and saves count to gist.
// ************************************************************************
const bot = require('./bot');
const shutdown = require('./shutdown');
const callbacks = require('./callbacks');
const config = require('./../config');
const axios = require('axios');
const points = require('./pointsdata');
const countJson = require('./../data/alizeecount');

const countData = {
   count: 0,
   launchDate: "",
   DAILY_QUOTA: 1000,
   initialized: false
};

if (countJson.count !== undefined && countJson.launchdate !== undefined) {
   countData.count = parseInt(countJson.count);
   countData.launchDate = countJson.launchdate;
} else {
   countData.count = 0;
   let now = new Date();
   countData.launchDate = (now.getMonth() + 1) + "/" + (now.getDate()) + "/" + (now.getFullYear());
}
countData.initialized = true;


// Returns the number of days since the bot started counting
function getElapsedDays() {
   const then = new Date(countData.launchDate);
   const now = new Date();
   return parseInt((now.getTime() - then.getTime()) / 86400000, 10);
}

// If the user's message got the daily quota, user earns points if eligible.
// Otherwise, just sends a milestone message.
function handleMilestone(username) {
   let result = "Alizee mention milestone: " + countData.count + "! ";
   if (countData.count === getElapsedDays() * countData.DAILY_QUOTA
       && points.pointEligible(username)) {
      points.adjustPoints(username, 50);
      result += `${username} earned 50 ${points.CURRENCY} for getting us today's quota `;
   }
   bot.chat(result + "AlizeeYay");
}

callbacks.addChatEvents({
   // For every message that includes an Alizee keyword, increments the counter.
   // Every 500 mentions triggers a milestone alert with the current count.
   counter: function(data) {
      const terms = ["alizee", "alizée", "alizbae", "fastcarz", "alulzee", "mlolita", "lili"];
      if (data.username !== "[server]") {
         for (let i = 0; i < terms.length; i++) {
            if (data.msg.indexOf(terms[i]) !== -1) {
               countData.count++;
               if (countData.count % 500 === 0) {
                  handleMilestone(data.username.toLowerCase());
               }
               break;
            }
         }
      }
   }, 
   
   // Reports the current count
   countReport: function(data) {
      if (data.msg.indexOf("!count") !== -1) {
         let elapsedDays = getElapsedDays();
         bot.chat(`Alizee has been mentioned or had her emotes used in \`${countData.count}\`` + 
                  ` messages since ${countData.launchDate} (${elapsedDays} days ago) AlizeeOP`);
         callbacks.cooldown(module.exports.countReport, 2000);
      }
   }
});

// Tells shutdown handler what needs to be true before saving
shutdown.addShutdownCheck(function() {
   return countData.initialized;
});

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "alizeecount.json",
      data: JSON.stringify({"count": countData.count, "launchdate": countData.launchDate})
   };
   return data;
});