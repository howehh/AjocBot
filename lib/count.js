// **************************** ALIZEE COUNTER ****************************
// Counts the number of total Alizee mentions in chat and saves count to cloud.
// ************************************************************************
const bot = require('./bot');
const shutdown = require('./shutdown');
const callbacks = require('./callbacks');
const config = require('./../config');
const axios = require('axios');
const points = require('./pointsdata');

const countData = {
   count: 0,
   launchDate: "",
   DAILY_QUOTA: 1000,
   initialized: false
};

// Retrieves count from firestore and sets count/launchdate
bot.firestoreDb().collection('botdata').doc('jsons').get().then(doc => {
   if (!doc.exists) {
      console.log('Did not retrieve jsons document: does not exist');
   } else {
      if (doc.data().alizeecount !== undefined) {
         let json = JSON.parse(doc.data().alizeecount);
         if (json.count !== undefined && json.launchdate !== undefined) {
            countData.count = parseInt(json.count);
            countData.launchDate = json.launchdate;
            countData.initialized = true;
            return;
         }
      }
      let now = new Date();
      countData.launchDate = (now.getMonth() + 1) + "/" + (now.getDate()) + "/" + (now.getFullYear());
      countData.initialized = true;
   }
});

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

const chatEvents = {
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
         callbacks.cooldown(chatEvents.countReport, 2000);
      }
   }
}
callbacks.addChatEvents(chatEvents);

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "alizeecount",
      shutdownCheck: countData.initialized,
      data: JSON.stringify({"count": countData.count, "launchdate": countData.launchDate})
   };
   return data;
});