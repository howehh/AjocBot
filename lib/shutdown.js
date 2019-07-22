// ******************************** SHUTDOWN HANDLER **************************************
// When the bot shuts down, relevant data (Alizee count, user points, etc) is saved online
// ****************************************************************************************
const bot = require('./bot');
const config = require('./../config');
const Gists = require('gists');

const shutdownCallbacks = {
   checks: [], // array of functions that check whether a save can be done
   data: [] // array of functions that return a data object
}

// Saves and ends AjocBot process
function saveAndExit() {
   clearInterval(saveInterval);
   saveData(
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

// Saves data to the heavens
function saveData(success, fail) {
   if (canSave()) {
      console.log("\nSaving bot data to gist...");
      const gists = new Gists({
         username: config.gist.username,
         password: config.gist.password
      });
      const options = createGistOptions(); 
      gists.edit(config.gist.fileID, options).then(success);
   } else {
      fail();
   }
}

// Returns true if each callback in "checks" array returns true
function canSave() {
   for (let i = 0; i < shutdownCallbacks.checks.length; i++) {
      if (!shutdownCallbacks.checks[i]()) {
         return false;
      }
   }
   return true;
}

// Creates an object that contains data for Gist to save:
//
// "files": {
//    "NAME_OF_FILE": {
//       "content": "" + DATA
//    }
// }
function createGistOptions() {
   let options = {
      "files": {}
   }
   shutdownCallbacks.data.forEach(function(func) {
      let dataObj = func();
      options.files[dataObj.filename] = {
         "content": "" + dataObj.data
      }
   });
   return options;
}

// On bot disconnecting from cytube, program automatically exits after 5 seconds
bot.socket().on("disconnect", () => setTimeout(saveAndExit, 5000));

// On Ctrl+C'ing, closing cmd prompt, or terminating, saves Alizee count & points then exits
['SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => process.on(signal, saveAndExit));

// On an error that ends program, saves Alizee count and user points then exits
process.on('uncaughtException', e => {
   console.log(e.stack);
   console.log();
   saveAndExit();
});

// Safeguard: every hour, save data
const saveInterval = setInterval(function() {
   saveData(
      function() { // success callback
         console.log("\nSave successful.");
      },
      
      function() { // fail callback
         console.log("\nDid not save");
      }
   )
}, 1800000);

module.exports = {
   // Adds a callback function to data array, which returns true
   // if the data to be saved is in a valid state
   addShutdownCheck: function(func) {
      shutdownCallbacks.checks.push(func);
   },
   
   // Adds a callback function to the data array, which returns
   // a data object that will be used to create a Gist options object
   //
   // data = {
   //   filename: "FILE_NAME",
   //   data: SOME_DATA
   // }
   addShutdownData: function(func) {
      shutdownCallbacks.data.push(func);
   },
}