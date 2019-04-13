// ************************ AJOCBOT MAIN ***********************************
// The main working file for AjocBot that is ran in Node. Starts process and
// handles chat message/private message events/bot shutdown
// *************************************************************************

// Node package imports
const Gists = require('gists');

// Bot module imports
const config = require('./config');
const bot = require('./lib/bot');
const dates = require('./lib/dates');
const points = require('./lib/points'); // includes two components: trivia and time spent in ajoc
const count = require('./lib/count');
const trivia = require('./lib/trivia');
const store = require('./lib/store');

// Arrays of chat msg functions and private message functions:
// On a chatMsg event or a pm event, each function is called in the respective array
const chatMsgEvents = []; 
const whisperEvents = []; 

// Add to the chat message events array
function addChatEvents(obj) {
   Object.keys(obj).forEach(key => {
      if (key.length > 0) { // if the function takes data (0 argument functions aren't chat events)
         chatMsgEvents.push(obj[key])
      }
   });
}

// Add to the whisper events array
function addWhisperEvents(obj) {
   Object.keys(obj).forEach(key => {
      if (key.length > 0) { 
         whisperEvents.push(obj[key])
      }
   });
}

// Add to both chatMsgEvents and whisperEvents
function addToChatAndWhispers(obj) {
   Object.keys(obj).forEach(key => {
      if (key.length > 0) { 
         whisperEvents.push(obj[key]);
         chatMsgEvents.push(obj[key]);
      }
   });
}

// Add new chat events to chatMsgEvents array:
addChatEvents(require('./lib/basiccommands'));
addChatEvents(require('./lib/songs'));
addChatEvents(require('./lib/weather'));
addChatEvents(require('./lib/convertunits'));
addChatEvents(require('./lib/define'));
addChatEvents(count);
addChatEvents(trivia);

chatMsgEvents.push(store.store, store.leader, store.addEmote, store.secretEmote);
chatMsgEvents.push(points.points, points.topPoints, points.give, points.setPoints);
chatMsgEvents.push(points.startRaffle, points.joinRaffle, points.endRaffle);

// Add new whisper events to whisperEvents array:
whisperEvents.push(store.secretEmote, store.buySecretEmote, store.confirmSecretEmote);

// Add to both arrays:
addToChatAndWhispers(require('./lib/alarm'));
addToChatAndWhispers(require('./lib/notifications'));

// ****************************** Chat Msg Handler ******************************* 
// On a chat message event, data is printed and sent to each chatMsgEvent function
// *******************************************************************************

bot.socket.on("chatMsg", data => {
   console.log(data);
   if (data.username.toLowerCase() === bot.BOTNAME) { 
      bot.chat("/afk");
      return; // exits this function without sending data to each chatMsgEvent funct
   }
   data.msg = data.msg.toLowerCase();
   chatMsgEvents.forEach(c => c(data));
});

// ********************************** PM HANDLER *********************************** 
// On private message events, data is printed and sent to each whisperEvent function
// *********************************************************************************
bot.socket.on("pm", data => {
   console.log(data);
   if (data.username.toLowerCase() === bot.BOTNAME) {
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
      gists.edit(config.gist.fileID, options).then(() => {
         console.log("\nSave successful.");
         process.exit(0);
      });
   } else {
      console.log("\nExited without saving");
      process.exit(0);
   }
}

// On bot disconnecting from cytube, program automatically exits after 10 seconds
bot.socket.on("disconnect", () => setTimeout(saveGistsAndExit, 10000));

// On Ctrl+C'ing, closing cmd prompt, or terminating, saves Alizee count & points then exits
['SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => process.on(signal, saveGistsAndExit));

// On an error that ends program, saves Alizee count and user points then exits
process.on('uncaughtException', e => {
   console.log(e.stack);
   console.log();
   saveGistsAndExit();
});