// **************************** ALIZEE COUNTER ****************************
// Reads a github gist to get launch date and the count of Alizee mentions.
// Counts the number of Alizee mentions and saves updated count to gist.
// ************************************************************************
const bot = require('./bot');
const config = require('./../config');
const Gists = require('gists');
const axios = require('axios');

const countState = {
   count: 0,
   launchDate: ""
};

axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   countState.launchDate = response.data.files.launchdate.content;
   countState.count = parseInt(response.data.files.alizeecount.content, 10);
});

// On bot disconnecting from cytube, program automatically exits after 10 seconds
bot.socket.on("disconnect", function() {
   setTimeout(function() {
      saveCountAndExit();
   }, 10000);
});

// On Ctrl+C'ing program, saves Alizee count then exits
process.on('SIGINT', function () {
   saveCountAndExit();
});
// On closing command prompt, saves Alizee count then exits
process.on('SIGHUP', function () {
   saveCountAndExit();
});
// On an error that ends program, saves Alizee count then exits
process.on('uncaughtException', function(e) {
   console.log(e.stack);
   console.log();
   saveCountAndExit();
});

// Edits "alizeecount" gist with new count and then exits.
function saveCountAndExit() {
   if (countState.count) {
      console.log("\nSaving Alizee count to gist...");
      const gists = new Gists({
         username: config.gist.username,
         password: config.gist.password
      });
      const options = {
         "files": {
            "alizeecount": {
               "content": "" + countState.count,
            }
         }
      }
      gists.edit(config.gist.fileID, options)
      .then(function() {
         process.exit(0);
      });
   } else {
      process.exit(0);
   }
}

module.exports = {
   
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
   
   countReport: function(data) {
      if (data.msg.indexOf("!count") !== -1) {
         const then = new Date(countState.launchDate);
         const now = new Date();
         const elapsedDays = parseInt((now.getTime() - then.getTime()) / 86400000, 10);
         bot.chat("Alizee has been mentioned or had her emotes used in `" + countState.count + 
                  "` messages since " + countState.launchDate + " (" + elapsedDays +
                  " days ago) AlizeeOP");
      }
   }
};