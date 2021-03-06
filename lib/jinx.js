// ************************************ JINX **************************************
// This module keeps track of messages to see if any two people said the same thing
// at the same time. If so it will start a jinx game. Loser must give winner a soda
// ********************************************************************************
const bot = require('./bot');
const callbacks = require('./callbacks');

const state = {
   jinxEnabled: true, // denotes whether it keeps track of jinxing or not.
   jinxHappening: false, // whether two people have just said same thing at the same time
   jinxExpire: null,
   
   lastMessage: null,
   lastUser: null,
   lastMessageTime: 0,
   players: new Map(), // maps two current jinxers to their current jinx count
}

// Disables jinx for a couple seconds
function cooldownJinx() {
   state.jinxEnabled = false;
   setTimeout(function() {
      state.jinxEnabled = true;
   }, 5000);
}

// Resets the state of jinxing: no game is currently happening / no current players
function resetJinxState() {
   state.jinxHappening = false;
   state.players.clear();
   clearTimeout(state.jinxExpire);
}

// Sets the last message's information with the given data
function updateLastMessage(data) {
   state.lastMessageTime = Math.floor(data.time / 1000);
   state.lastMessage = data.msg.trim().replace(/\s\s+/g, ' ');
   state.lastUser = data.username;
}

// Clears the last expiration timer and sets a new one for 10 seconds
function startJinxExpire() {
   clearTimeout(state.jinxExpire);
   state.jinxExpire = setTimeout(function() {
      resetJinxState();
   }, 10000);
}

const chatEvents = {
   // Whenever a new message comes in, it compares it to the last message/username/time
   // and determines if it is sufficient to start a jinx game.
   updateMessages: function(data) {
      if (state.jinxEnabled && !state.jinxHappening) {
         const thisTime = Math.floor(data.time / 1000);
         // If the newest and last message qualify as a jinx
         if (data.msg.trim().replace(/\s\s+/g, ' ') === state.lastMessage
             && data.username !== state.lastUser && thisTime === state.lastMessageTime) {
            // Toggle a jinx game and fill set each player's jinx counter to 0
            state.jinxHappening = true;
            state.players.clear()
            state.players.set(state.lastUser, 0);
            state.players.set(data.username, 0);
            startJinxExpire();
         }
         updateLastMessage(data);
      }
   },

   // Manages the jinx game when one is happening.
   playJinx: function(data) {
      if (state.jinxHappening && state.players.has(data.username)) {         
         // User's current jinx count
         let currCount = state.players.get(data.username);
         if ((currCount === 0 && data.msg.trim() === "jinx") ||
             (data.msg.trim() === "jinx " + (state.players.get(data.username) + 1))) {
            state.players.set(data.username, currCount + 1);
            startJinxExpire();
         }
         // get other player's name:
         let players = Array.from(state.players.keys());
         let otherPlayer = players[Math.abs(players.indexOf(data.username) - 1)];
         
         // If this player's jinx count is 2 greater than the other player's then they win
         if (state.players.get(data.username) === state.players.get(otherPlayer) + 2) {
            bot.chat(`${data.username} successfully got ahead in jinxes. ` +
                     `Give them their soda, ${otherPlayer} AlizeeOP`);
            cooldownJinx();
            resetJinxState();
         }
      }
   },
   
   // Admin command to allow jinxing games to happen or turn them off
   toggleJinx: function(data) {
      if (data.msg.indexOf("!togglejinx") !== -1) {
         if (bot.isAdmin(data.username)) {
            state.jinxEnabled = !state.jinxEnabled;
            state.jinxEnabled
            ? bot.chat("I will now keep track of who wins a jinx duel in the case of two "   
                       + "identical messages in the same second deteAlizee")
            : bot.chat("Jinxing has been paused AlizeeOui");
         } else {
            bot.chat(data.username + ": you do not have this permission AlizeeWeird");
         }
      }
   }
}
callbacks.addChatEvents(chatEvents);