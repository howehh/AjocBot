// ********************************** BOT INITIALIZER ********************************** 
// This module connects AjocBot to Cytube. It provides getters for the bot's name and the
// socket connection. It also provides the bot with its standard functions such as chatting,
// pm-ing, queueing media, and applying cooldowns to functions
// *************************************************************************************

const config = require('./../config');
const sc = require("socket.io-client");
const axios = require('axios');

const botData = {
   cooldowns: new Map(), // maps a function and its ability to be called (true if yes)
   userData: new Map(), // maps a user name to their metadata
   emoteNames: [], // names of emotes in the cytube chatroom
   userlistEvents: [setMultipleUserData],
   userLeaveEvents: [],
   addUserEvents: [setUserData],
   username: config.cytube.username,
   pass: config.cytube.password,
   socketConnect: null
};

// Connects to CyTube with the given serverURL
function connectToCytube(serverUrl) { 
   botData.socketConnect = sc.connect(serverUrl, {
      secure: true
   });
   
   // Emitting joinChannel event that the server is listening to and telling it to join channel.  
   botData.socketConnect.emit("joinChannel", {
      name: config.cytube.channel
   });

   // Logging into Cytube
   botData.socketConnect.emit("login", {
      name: botData.username,
      pw: pass
   });
   
   startSocketHandlers();
}

function startSocketHandlers() {
   // On first connecting, emoteList data is received and every emote is added to
   // emoteNames array
   botData.socketConnect.on('emoteList', function(emotes) {
      for (let i = 0; i < emotes.length; i++) {
         botData.emoteNames.push(emotes[i].name.toLowerCase());
      }
   });

   // When an emote is added, the name is added to emoteNames array
   botData.socketConnect.on('updateEmote', function(emote) {
      if (!botData.emoteNames.includes(emote["name"].toLowerCase())) {
         botData.emoteNames.push(emote["name"].toLowerCase());
      }
   });

   // When an emote is removed, emoteNames array is updated to remove that emote name
   botData.socketConnect.on('removeEmote', function(emote) {
      let emoteIndex = botData.emoteNames.indexOf(emote["name"].toLowerCase());
      if (emoteIndex !== -1) {
         botData.emoteNames.splice(emoteIndex, 1);
      }
   });

   // Userlist handler
   botData.socketConnect.on("userlist", function(userlist) {
      botData.userlistEvents.forEach(c => c(userlist));
   });

   // User leave handler
   botData.socketConnect.on("userLeave", function(data) {
      botData.userLeaveEvents.forEach(c => c(data));
   });

   // Add user callbacks
   botData.socketConnect.on("addUser", function(data) {
      botData.addUserEvents.forEach(c => c(data));
   });
}

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
   // Connecting to Cytube via websocket. Callback param after is to be called after
   // bot has connected.
   connect: function(after) {
      axios.get("https://cytu.be/socketconfig/" + config.cytube.channel + ".json")
      .then(function(response) {
         if (response.status !== 200) {
            throw "Error code " + response.status;
         }
         let serverUrl;
         for (const server of response.data.servers) {
            if (server.secure === true) {
               serverUrl = server.url;
               break;
            } else {
               serverUrl = server.url;
            }
         }
         if (serverUrl && serverUrl.match(/(https?:\/\/)?(.*:\d*)/)) {
            connectToCytube(serverUrl);
            after();
         } else {
            throw "No server found";
         }
      });
   },
   
   // Botname getter
   BOTNAME: botData.username,
   
   // Socket getter
   socket: function() {
      return botData.socketConnect;
   },
   
   // Emote list getter
   emotes: botData.emoteNames,
   
   chat: function(message) {
      if (!this.cooldown("chat", 10)) {return} // 10 ms sec cooldown
      this.socket().emit("chatMsg", {
         msg: message,
         meta: {}
      });
   },

   pm: function(user, message) {
      this.socket().emit("pm", {
         to: user, 
         msg: message, 
         meta: {}
      });
   }, 
   
   queue: function(videoId, videoType) {
      this.socket().emit("queue", {
         id: videoId,
         pos: "end",
         type: videoType
      });
   },
   
   // These commands require that the bot has sufficient permissions:
   updateEmote: function(emoteName, url) {
      this.socket().emit("updateEmote", {
         name: emoteName,
         image: url
      });
   },
   
   newPoll: function(pollTitle, optionsArray, timeoutDuration) {
      this.socket().emit("newPoll", {
         title: pollTitle,
         opts: optionsArray,
         obscured: false,
         timeout: timeoutDuration
      });
   },
   
   closePoll: function() {
      this.socket().emit("closePoll");
   },
   
   // Cytube kicks bot for no good reason if it doesn't have permissions to assignLeader
   assignLeader: function(username) {
      this.socket().emit("assignLeader", {name: username});
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
      botData.userlistEvents.push(obj);
   },
   
   // Add callback to addUserEvents array
   addAddUserEvent: function(obj) {
      botData.addUserEvents.push(obj);
   },
   
   // Add callback to userLeaveEvents array
   addUserLeaveEvent: function(obj) {
      botData.userLeaveEvents.push(obj);
   }
};