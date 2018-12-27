// ************************ AJOCBOT MAIN ***********************************
// The main working file for AjocBot that is ran in Node. Starts process and
// handles chat message/private message events. Also handles bot shutdown
// *************************************************************************

// Node package imports
const Gists = require('gists');

// Bot module imports
const config = require('./config');
const bot = require('./lib/bot');
const dates = require('./lib/dates');
const alarm = require('./lib/alarm'); // alarm has chatMsg (set) and pm (stop) component
const stream = require('./lib/stream'); // streamerList = chatMsg, refreshStreamers = pm
const points = require('./lib/points'); // includes two components: trivia and time spent in ajoc
const count = require('./lib/count');

// ****************************** Chat Msg Handler ******************************* 
// On a chat message event, data is printed and sent to each chatMsgEvent function
// *******************************************************************************

const chatMsgEvents = []; // Array of chat msg functions

// Add new chat events to chatMsgEvents array for new features:
addChatEvents(require('./lib/basiccommands'));
addChatEvents(require('./lib/songs'));
addChatEvents(require('./lib/weather'));
addChatEvents(require('./lib/convertunits'));
addChatEvents(require('./lib/define'));
chatMsgEvents.push(count.counter, count.countReport);
chatMsgEvents.push(alarm.setAlarm);
chatMsgEvents.push(stream.streamerList);
chatMsgEvents.push(points.points, points.playTrivia, points.store, points.secretEmote, points.give,
   points.addEmote); 

function addChatEvents(obj) {
   Object.keys(obj).forEach(key => chatMsgEvents.push(obj[key]));
}

bot.socket.on("chatMsg", (data) => {
   console.log(data);
   if (data.username.toLowerCase() === bot.botname) { 
      bot.chat("/afk");
      return; // exits this function without sending data to each chatMsgEvent funct
   }
   data.msg = data.msg.toLowerCase();
   chatMsgEvents.forEach(c => c(data));
});

// ********************************** PM HANDLER *********************************** 
// On private message events, data is printed and sent to each whisperEvent function
// *********************************************************************************
const whisperEvents = [];
whisperEvents.push(alarm.stopAlarm);
whisperEvents.push(stream.refreshStreamers); 
whisperEvents.push(points.secretEmote, points.buySecretEmote, points.confirmSecretEmote);

bot.socket.on("pm", (data) => {
   console.log(data);
   if (data.username.toLowerCase() === bot.botname) {
      return;
   }
   data.msg = data.msg.toLowerCase();
   whisperEvents.forEach(c => c(data));
});

// ******************************** SHUTDOWN HANDLER **************************************
// When the bot shuts down, relevant data (Alizee count and user points) is saved to a gist
// ****************************************************************************************
function saveGistsAndExit() {
   if (count.getCount() > 0 && points.getPointsMapSize() > 0) {
      console.log("\nSaving Alizee count and Points to gist...");
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
            }
         }
      }
      gists.edit(config.gist.fileID, options)
      .then(function() {
         console.log("\nSave successful.");
         process.exit(0);
      });
   } else {
      console.log("\nExited without saving");
      process.exit(0);
   }
}

// On bot disconnecting from cytube, program automatically exits after 10 seconds
bot.socket.on("disconnect", function() {
   setTimeout(function() {
      saveGistsAndExit();
   }, 10000);
});

// On Ctrl+C'ing program, saves Alizee count and user points then exits
process.on('SIGINT', function () {
   saveGistsAndExit();
});
// On closing command prompt, saves Alizee count and user points then exits
process.on('SIGHUP', function () {
   saveGistsAndExit();
});
// On an error that ends program, saves Alizee count and user points then exits
process.on('uncaughtException', function(e) {
   console.log(e.stack);
   console.log();
   saveGistsAndExit();
});