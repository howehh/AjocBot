// **************************** ALIZEE COUNTER ****************************
// Counts the number of total Alizee mentions in chat and saves count to gist.
// ************************************************************************
const bot = require('./bot');
const config = require('./../config');
const axios = require('axios');

const countState = {
   count: 0,
   launchDate: ""
};

// Reads a github gist to get launch date and the saved count of Alizee mentions.
axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   countState.launchDate = response.data.files.launchdate.content;
   countState.count = parseInt(response.data.files.alizeecount.content, 10);
});

module.exports = {
   // For every message that includes an Alizee keyword, increments the counter.
   // Every 500 mentions triggers a milestone alert with the current count.
   counter: function(data) {
      if (data.msg.indexOf("alizee") !== -1 || data.msg.indexOf("alizbae") !== -1 ||
          data.msg.indexOf("fastcarz") !== -1 || data.msg.indexOf("alulzee") !== -1 ||
          data.msg.indexOf("mlolita") !== -1 || data.msg.indexOf("lili") !== -1) {
         countState.count++;
         if (countState.count % 500 === 0) {
            bot.chat("Alizee mention milestone: " + countState.count + "! AlizeeYay");
         }
      }
   }, 
   // Reports the current count
   countReport: function(data) {
      if (data.msg.indexOf("!count") !== -1) {
         const then = new Date(countState.launchDate);
         const now = new Date();
         const elapsedDays = parseInt((now.getTime() - then.getTime()) / 86400000, 10);
         bot.chat("Alizee has been mentioned or had her emotes used in `" + countState.count + 
                  "` messages since " + countState.launchDate + " (" + elapsedDays +
                  " days ago) AlizeeOP");
      }
   },

   getCount: function() {
      return countState.count;
   }
};