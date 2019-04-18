// ********************************** BOT INITIALIZER ********************************** 
// This module connects AjocBot to Cytube. It provides getters for the bot's name and the
// socket connection. It also provides the bot with its standard functions such as chatting,
// pm-ing, queueing media, and applying cooldowns to functions
// *************************************************************************************

const config = require('./../config');
const sc = require("socket.io-client");

// Bot login credentials for cytube
const username = config.cytube.username;
const pass = config.cytube.password;

// Connecting to Cytube via websocket
const socketConnect = sc.connect(config.cytube.socketConnection, {
   secure: true
});

// Emitting joinChannel event that the server is listening to and telling it to join channel.  
socketConnect.emit("joinChannel", {
   name: config.cytube.channel
});

// Logging into Cytube
socketConnect.emit("login", {
   name: username,
   pw: pass
});

const cooldowns = new Map(); // maps a function and its ability to be called (true if yes)

// Stores the names of emotes in the cytube chatroom
const emoteNames = [];

// On first connecting, emoteList data is received and every emote is added to
// emoteNames array
socketConnect.on('emoteList', function(emotes) {
	for (let i = 0; i < emotes.length; i++) {
		emoteNames.push(emotes[i].name.toLowerCase());
   }
});

// When an emote is added, the name is added to emoteNames array
socketConnect.on('updateEmote', function(emote) {
   if (!emoteNames.includes(emote["name"].toLowerCase())) {
		emoteNames.push(emote["name"].toLowerCase());
	}
});

// When an emote is removed, emoteNames array is updated to remove that emote name
socketConnect.on('removeEmote', function(emote) {
   let emoteIndex = emoteNames.indexOf(emote["name"].toLowerCase());
   if (emoteIndex !== -1) {
      emoteNames.splice(emoteIndex, 1);
   }
});

module.exports = {
   
   // Botname getter
   BOTNAME: username,
   
   // Socket getter
   socket: socketConnect,
   
   // Emote list getter
   emotes: emoteNames,
   
   chat: function(message) {
      if (!this.cooldown("chat", 10)) {return} // 10 ms sec cooldown
      this.socket.emit("chatMsg", {
         msg: message,
         meta: {}
      });
   },

   pm: function(user, message) {
      this.socket.emit("pm", {
         to: user, 
         msg: message, 
         meta: {}
      });
   }, 
   
   queue: function(videoId, videoType) {
      this.socket.emit("queue", {
         id: videoId,
         pos: "end",
         type: videoType
      });
   },
   
   updateEmote: function(emoteName, url) {
      this.socket.emit("updateEmote", {
         name: emoteName,
         image: url
      });
   },
   
   newPoll: function(pollTitle, optionsArray, timeoutDuration) {
      this.socket.emit("newPoll", {
         title: pollTitle,
         opts: optionsArray,
         obscured: false,
         timeout: timeoutDuration
      });
   },
   
   // If the given function is not on cooldown, returns true (then puts function on cooldown)
   // If function is on cooldown, returns false.
   cooldown: function(funcToPause, duration) {
      // function can be called
      if (!cooldowns.has(funcToPause) || cooldowns.get(funcToPause) === true) {
         cooldowns.set(funcToPause, false); 
         setTimeout(function() {
            cooldowns.set(funcToPause, true);
         }, duration);
         return true;
      } else { // function can't be called
         return false;
      }
   } 
};