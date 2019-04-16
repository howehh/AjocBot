// *********************************** CALLBACKS **************************************
// This module handles all the callback functions (chat message/private message events)
// ************************************************************************************
 
const config = require('./../config');
const bot = require('./bot');

// Arrays of chat msg functions and private message functions:
// On a chatMsg event or a pm event, each function is called in the respective array
const chatMsgEvents = []; 
const whisperEvents = []; 

// Add every function in an object to the chat message events array
function addMultipleChatEvents(obj) {
   Object.keys(obj).forEach(key => {
      // if the function takes data (0 argument functions aren't chat events)
      if (key.length > 0 && chatMsgEvents.indexOf(obj[key]) === -1) { 
         chatMsgEvents.push(obj[key])
      }
   });
}

// Add every function in an object to the whisper events array
function addMultipleWhisperEvents(obj) {
   Object.keys(obj).forEach(key => {
      if (key.length > 0) { 
         whisperEvents.push(obj[key])
      }
   });
}

// Add every function in an object to both chatMsgEvents and whisperEvents
function addMultipleChatAndWhispers(obj) {
   Object.keys(obj).forEach(key => {
      if (key.length > 0) {
         whisperEvents.push(obj[key]);
         chatMsgEvents.push(obj[key]);
      }
   });
}

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

module.exports = {
   // Adds one function to chat events
   addChatEvent: function(func) {
      chatMsgEvents.push(func);
   },
   
   // Adds one function to whisper events
   addWhisperEvent: function(func) {
      whisperEvents.push(func);
   },
   
   // Adds one function to both chatMsg and whisper events
   addChatAndWhisperEvent: function(func) {
      chatMsgEvents.push(func);
      whisperEvents.push(func);
   },
   
   addMultipleChatEvents: addMultipleChatEvents,
   
   addMultipleWhisperEvents: addMultipleWhisperEvents,
   
   addMultipleChatAndWhispers: addMultipleChatAndWhispers
}