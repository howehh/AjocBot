// ********************************** BOT INITIALIZER ********************************** 
// This module connects AjocBot to Cytube. It provides getters for the bot's name and the
// socket connection. It also provides the bot with its standard functions such as chatting,
// pm-ing, queueing media, and applying cooldowns to functions
// *************************************************************************************

const config = require('./../config');
const sc = require("socket.io-client");

const botData = {
   cooldowns: new Map(), // maps a function and its ability to be called (true if yes)
   userData: new Map(), // maps a user name to their metadata
   emoteNames: [] // names of emotes in the cytube chatroom
};

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

// On first connecting, emoteList data is received and every emote is added to
// emoteNames array
socketConnect.on('emoteList', function(emotes) {
	for (let i = 0; i < emotes.length; i++) {
		botData.emoteNames.push(emotes[i].name.toLowerCase());
   }
});

// When an emote is added, the name is added to emoteNames array
socketConnect.on('updateEmote', function(emote) {
   if (!botData.emoteNames.includes(emote["name"].toLowerCase())) {
		botData.emoteNames.push(emote["name"].toLowerCase());
	}
});

// When an emote is removed, emoteNames array is updated to remove that emote name
socketConnect.on('removeEmote', function(emote) {
   let emoteIndex = botData.emoteNames.indexOf(emote["name"].toLowerCase());
   if (emoteIndex !== -1) {
      botData.emoteNames.splice(emoteIndex, 1);
   }
});

// Userlist callbacks
const userlistEvents = [setMultipleUserData];
socketConnect.on("userlist", function(userlist) {
   userlistEvents.forEach(c => c(userlist));
});

// User leave callbacks
const userLeaveEvents = [];
socketConnect.on("userLeave", function(data) {
   userLeaveEvents.forEach(c => c(data));
});

// Add user callbacks
const addUserEvents = [setUserData];
socketConnect.on("addUser", function(data) {
   addUserEvents.forEach(c => c(data));
});

// Maps the metadata of a user to their name in the userData map
function setUserData(data) {
   botData.userData.set(data.name, data.rank);
}

function setMultipleUserData(list) {
   for (let i = 0; i < list.length; i++) {
      setUserData(list[i]);
   }
}

module.exports = {
   
   // Botname getter
   BOTNAME: username,
   
   // Socket getter
   socket: socketConnect,
   
   // Emote list getter
   emotes: botData.emoteNames,
   
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
   
   // Checks if user is an admin (rank >= 5)
   isAdmin: function(username) {
      return botData.userData.has(username) && botData.userData.get(username) >= 5;
   },
   
   // If the given function is not on cooldown, returns true (then puts function on cooldown)
   // If function is on cooldown, returns false.
   cooldown: function(funcToPause, duration) {
      // function can be called
      if (!botData.cooldowns.has(funcToPause) || botData.cooldowns.get(funcToPause) === true) {
         botData.cooldowns.set(funcToPause, false); 
         setTimeout(function() {
            botData.cooldowns.set(funcToPause, true);
         }, duration);
         return true;
      } else { // function can't be called
         return false;
      }
   },

   // Add callback to userlistEvents array
   addUserlistEvent: function(obj) {
      userlistEvents.push(obj);
   },
   
   // Add callback to addUserEvents array
   addAddUserEvent: function(obj) {
      addUserEvents.push(obj);
   },
   
   // Add callback to userLeaveEvents array
   addUserLeaveEvent: function(obj) {
      userLeaveEvents.push(obj);
   }
};