// ************************ AJOCBOT MAIN ***********************************
// The main file for AjocBot that is ran in Node. It determines which
// modules are enabled for AjocBot, and also handles bot shutdown
// *************************************************************************
const config = require('./config');
const bot = require('./lib/bot');
const Gists = require('gists');

// Modules
const count = require('./lib/count');
const points = require('./lib/points');
const trivia = require('./lib/trivia');
require('./lib/alarm');
require('./lib/basiccommands');
require('./lib/convertunits');
require('./lib/dates');
require('./lib/define');
require('./lib/store');
require('./lib/notifications');
require('./lib/weather');
require('./lib/songs');
require('./lib/jinx');

// ******************************** SHUTDOWN HANDLER **************************************
// When the bot shuts down, relevant data (Alizee count and user points) is saved to a gist
// ****************************************************************************************
function saveGistsAndExit() {
   clearInterval(saveInterval);
   saveGists(
      function() {
         console.log("\nSave successful.");
         process.exit(0);
      },
      
      function() {
         console.log("\nExited without saving");
         process.exit(0);
      }
   );
}

function saveGists(success, fail) {
   if (count.getCount() > 0 && points.getPointsMapSize() > 0) {
      console.log("\nSaving bot data to gist...");
      const gists = new Gists({
         username: config.gist.username,
         password: config.gist.password
      });
      const options = {
         "files": {
            "alizeecount": {
               "content": "" + count.getCount()
            },
            "points": {
               "content": points.getPointsMapString()
            },
            "trivianum": {
               "content": "" + trivia.getTriviaNum()
            }
         }
      }
      gists.edit(config.gist.fileID, options).then(success);
   } else {
      fail();
   }
}

// On bot disconnecting from cytube, program automatically exits after 10 seconds
bot.socket.on("disconnect", () => setTimeout(saveGistsAndExit, 5000));

// On Ctrl+C'ing, closing cmd prompt, or terminating, saves Alizee count & points then exits
['SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => process.on(signal, saveGistsAndExit));

// On an error that ends program, saves Alizee count and user points then exits
process.on('uncaughtException', e => {
   console.log(e.stack);
   console.log();
   saveGistsAndExit();
});

// Safeguard: every hour, save data
const saveInterval = setInterval(function() {
   saveGists(
      function() { // success callback
         console.log("\nSave successful.");
      },
      
      function() { // fail callback
         console.log("\nDid not save");
      }
   )
}, 1800000);