// *********************************** CALLBACKS **************************************
// This module handles all the callback functions (chat message/private message events)
// ************************************************************************************
 
const config = require('./../config');
const bot = require('./bot');

// Arrays of chat msg functions and private message functions:
// On a chatMsg event or a pm event, each function is called in the respective array
const events = {
   chatMsgEvents: [], 
   whisperEvents: []
} 

// ****************************** Chat Msg Handler ******************************* 
// On a chat message event, data is printed and sent to each chatMsgEvent function
// *******************************************************************************

bot.socket().on("chatMsg", data => {
   if (data.username.toLowerCase() === bot.BOTNAME) { 
      return; // exits this function without sending data to each chatMsgEvent funct
   }
   data.msg = data.msg.toLowerCase();
   events.chatMsgEvents.forEach(c => c(data));
});

// ********************************** PM HANDLER *********************************** 
// On private message events, data is printed and sent to each whisperEvent function
// *********************************************************************************

bot.socket().on("pm", data => {
   if (data.username.toLowerCase() === bot.BOTNAME) {
      return;
   }
   data.msg = data.msg.toLowerCase();
   events.whisperEvents.forEach(c => c(data));
});

module.exports = {
   // Adds one function to chat events
   addChatEvent: function(func) {
      events.chatMsgEvents.push(func);
   },
   
   // Adds one function to whisper events
   addWhisperEvent: function(func) {
      events.whisperEvents.push(func);
   },
   
   // Adds one function to both chatMsg and whisper events
   addChatAndWhisperEvent: function(func) {
      events.chatMsgEvents.push(func);
      events.whisperEvents.push(func);
   },
   
   // Add every function in an object to the chat message events array
   addMultipleChatEvents: function(obj) {
      Object.keys(obj).forEach(key => {
         // if the function takes data (0 argument functions aren't chat events)
         if (key.length > 0 && events.chatMsgEvents.indexOf(obj[key]) === -1) { 
            events.chatMsgEvents.push(obj[key])
         }
      });
   },
   
   // Add every function in an object to whisper events array
   addMultipleWhisperEvents: function(obj) {
      Object.keys(obj).forEach(key => {
         if (key.length > 0) { 
            events.whisperEvents.push(obj[key])
         }
      });
   },
   
   // Add every function in an object to both chatMsgEvents and whisperEvents
   addMultipleChatAndWhispers: function(obj) {
      Object.keys(obj).forEach(key => {
         if (key.length > 0) {
            events.whisperEvents.push(obj[key]);
            events.chatMsgEvents.push(obj[key]);
         }
      });
   },
   
   // removes a function from chatMsgEvents array, then adds it back after the given duration
   cooldown: function(funcToPause, duration) {
      for (let i = events.chatMsgEvents.length - 1; i >= 0; i--) {
         if(events.chatMsgEvents[i] === funcToPause) {
            events.chatMsgEvents.splice(i, 1); 
            setTimeout(function(){
               events.chatMsgEvents.push(funcToPause); 
            }, duration);
         }
      }
   }   
}