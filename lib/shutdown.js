// ******************************** SHUTDOWN HANDLER **************************************
// When the bot shuts down, relevant data (Alizee count, user points, etc) is saved online
// ****************************************************************************************
const bot = require('./bot');
const config = require('./../config');

const shutdownCallbacks = {
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
   console.log("\nSaving bot data to Alizee Heavens...");
   
   let obj = {};
   shutdownCallbacks.data.forEach(function(func) {
      let dataObj = func();
      if (dataObj && dataObj.shutdownCheck) {
         obj[dataObj.filename] = dataObj.data;
      }
   });
   
   bot.firestoreDb().collection('botdata').doc('jsons').update(obj).then(success)
   .catch(function(error) {
      console.log(error);
      fail();
   });
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
   
   // Adds a callback function that returns a data object that will be saved in Alizee heavens
   //
   // data = {
   //   "filename": "FILE_NAME",
   //   "shutdownCheck": BOOLEAN
   //   "data": SOME_DATA
   // }
   addShutdownData: function(func) {
      shutdownCallbacks.data.push(func);
   },
}