// ******************** AJOCBOT MAIN ***************************
// The main working file for AjocBot, which compiles each module
// *************************************************************

// Module Exports
const bot = require('./lib/bot');
const dates = require('./lib/dates');
const alarm = require('./lib/alarm'); // alarm has chatMsg (set) and pm (stop) component
const stream = require('./lib/stream'); // streamerList = chatMsg, refreshStreamers = pm


// ****************************** Chat Msg Handler ******************************* 
// On a chat message event, data is printed and sent to each chatMsgEvent function
// *******************************************************************************

const chatMsgEvents = []; // Array of chat msg functions

// Add new chat events for new features:
addChatEvents(require('./lib/basiccommands'));
addChatEvents(require('./lib/count'));
addChatEvents(require('./lib/songs'));
addChatEvents(require('./lib/weather'));
chatMsgEvents.push(alarm.setAlarm);
chatMsgEvents.push(stream.streamerList);
addChatEvents(require('./lib/trivia'));
addChatEvents(require('./lib/convertunits'));
addChatEvents(require('./lib/define'));

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
const whisperEvents = [alarm.stopAlarm, stream.refreshStreamers]; 

bot.socket.on("pm", (data) => {
   console.log(data);
   if (data.username.toLowerCase() === bot.botname) {
      return;
   }
   data.msg = data.msg.toLowerCase();
   whisperEvents.forEach(c => c(data));
});
