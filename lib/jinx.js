// ************************************ JINX **************************************
// This module keeps track of messages to see if any two people said the same thing
// at the same time. If so, It will determine who said "jinx" first. The loser must
// then give the loser a soda :)
// ********************************************************************************

const bot = require('./bot');
const callbacks = require('./callbacks');
const points = require('./points');

const state = {
   jinxEnabled: true, // denotes whether it keeps track of jinxing or not.
   jinxHappening: false, // whether two people have just said identical things at the same time
   
   lastMessage: null,
   lastUser: null,
   lastMessageTime: 0,
   players: []
}

// Disables jinx for a couple seconds
function cooldownJinx() {
   state.jinxEnabled = false;
   setTimeout(function() {
      state.jinxEnabled = true;
   }, 5000);
}

module.exports = {
   // Whenever a new message comes in, it compares it to the last message/username/time
   // and determines if it is sufficient to start a jinx game.
   updateMessages: function(data) {
      if (state.jinxEnabled) {
         const thisTime = Math.floor(data.time / 1000);
         if (!state.jinxHappening && state.lastMessage !== null && data.msg.indexOf("jinx") === -1
             && data.msg === state.lastMessage && data.username !== state.lastUser) {
                
            if (thisTime === state.lastMessageTime) {
               state.jinxHappening = true;
               state.players.splice(0, state.players.length);
               state.players.push(state.lastUser, data.username);
            }
            
         }
         state.lastMessageTime = thisTime;
         state.lastMessage = data.msg;
         state.lastUser = data.username;
      }
   },

   // Whenever a jinx is currently happening, the first person to type jinx will win. The other
   // player who said the identical message will be prompted to give them a soda.
   checkForJinx: function(data) {
      if (state.jinxHappening && data.msg === "jinx" && state.players.indexOf(data.username) !== -1) {
         state.jinxHappening = false;
         cooldownJinx();
         const indexOfUser = state.players.indexOf(data.username);
         state.players.splice(indexOfUser, 1);
         bot.chat(data.username + " successfully jinxed first. Give them their soda, " + 
                  state.players[0] + " AlizeeOP");
      }
   },
   
   // Admin command to allow jinxing games to happen
   enableJinx: function(data) {
      if (data.msg.indexOf("!enablejinx") !== -1) {
         if (points.isAdmin(data.username)) {
            state.jinxEnabled = true;
            bot.chat("I will now keep track of who jinxes first in the case of two identical"   
                     + " messages in the same second deteAlizee");
         } else {
            bot.chat(data.username + " you do not have this permission AlizeeWeird");
         }
      }
   },
   
   // Admin command to pause jinxing
   disableJinx: function(data) {
      if (data.msg.indexOf("!disablejinx") !== -1) {
         if (points.isAdmin(data.username)) {
            state.jinxEnabled = false;
            state.jinxHappening = false;
            bot.chat("Jinxing has been paused AlizeeOui");
         } else {
            bot.chat(data.username + " you do not have this permission AlizeeWeird");
         }
      }
   },   
}

callbacks.addMultipleChatEvents(module.exports);