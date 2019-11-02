// ********************************** BOT INITIALIZER ********************************** 
// This module connects AjocBot to Cytube. It provides getters for the bot's name and the
// socket connection. It also provides the bot with its standard functions such as chatting,
// pm-ing, queueing media
// *************************************************************************************

const config = require('./../config');
const sc = require("socket.io-client");
const axios = require('axios');

const botData = {
   userData: new Map(), // maps a user name to their metadata
   emoteNames: new Set(), // names of emotes in the cytube chatroom
   userlistEvents: [],
   userLeaveEvents: [],
   addUserEvents: [],
   username: config.cytube.username,
   pass: config.cytube.password,
   socketConnect: null,
   onChatCooldown: false,
   afkTimeout: null
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
      pw: botData.pass
   });
}

function startSocketHandlers() {
   // On first connecting, emoteList data is received and every emote is added to
   // emoteNames set
   botData.socketConnect.on('emoteList', function(emotes) {
      for (let i = 0; i < emotes.length; i++) {
         botData.emoteNames.add(emotes[i].name.toLowerCase());
      }
   });

   // When an emote is added, the name is added to emoteNames array
   botData.socketConnect.on('updateEmote', function(emote) {
      let name = emote["name"].toLowerCase();
      if (!botData.emoteNames.has(name)) {
         botData.emoteNames.add(name);
      }
   });

   // When an emote is removed, emoteNames array is updated to remove that emote name
   botData.socketConnect.on('removeEmote', function(emote) {
      let name = emote["name"].toLowerCase();
      if (botData.emoteNames.has(name)) {
         botData.emoteNames.delete(name);
      }
   });

   // Userlist handler
   botData.socketConnect.on("userlist", function(userlist) {
      setMultipleUserData(userlist); // has to be done first
      botData.userlistEvents.forEach(c => c(userlist));
   });

   // User leave handler
   botData.socketConnect.on("userLeave", function(data) {
      deleteUserData(data);
      botData.userLeaveEvents.forEach(c => c(data));
   });

   // Add user callbacks
   botData.socketConnect.on("addUser", function(data) {
      setUserData(data); // has to be done first
      botData.addUserEvents.forEach(c => c(data));
   });
   
   // When a user's rank changes, update userData map
   botData.socketConnect.on("setUserRank", function(data) {
      const name = data.name.toLowerCase();
      if (botData.userData.has(name)) {
         botData.userData.set(name, data.rank);
      }
   });
}

// Maps the metadata of a user to their name in the userData map
function setUserData(data) {
   const name = data.name.toLowerCase();
   if (!botData.userData.has(name)) {
      botData.userData.set(name, data.rank);
   } else if (data.rank > botData.userData.get(name)) {
      // often duplicates in the data that cytube gives, where ranks aren't accurate. 
      // (i.e. x may show rank 0 in the onAddUser data, and then appear again with rank 5)
      // we want user to have the highest rank - which will be the more accurate one
      botData.userData.set(name, data.rank);
   }
}

function setMultipleUserData(list) {
   for (let i = 0; i < list.length; i++) {
      setUserData(list[i]);
   }
}

function deleteUserData(data) {
   const name = data.name.toLowerCase();
   if (botData.userData.has(name)) {
      botData.userData.delete(name);   
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
            startSocketHandlers();
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
   
   // Sends the given message through a chatMsg. After the message,
   // there is a miniscule cooldown before being able to chat again.
   chat: function(message) {
      if (!botData.onChatCooldown) {
         botData.onChatCooldown = true;
         setTimeout(function() {
            botData.onChatCooldown = false;
         }, 37);
      } else {
         return;
      }
      this.socket().emit("chatMsg", {
         msg: message,
         meta: {}
      });
      // after sending a message, go afk after a small time (<= 1 sec)
      clearTimeout(botData.afkTimeout);
      botData.afkTimeout = setTimeout(() => {  
         this.socket().emit("chatMsg", {
            msg: "/afk",
            meta: {}
         });            
      }, 769);
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
   
   hasEmote: function(emoteName) {
      return botData.emoteNames.has(emoteName.toLowerCase());
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
   
   assignLeader: function(username) {
      // Cytube kicks bot for no good reason if it doesn't have permissions to assignLeader
      if (this.isMod(this.BOTNAME)) {
         this.socket().emit("assignLeader", {
            name: username
         });
         return true;
      }
      return false;
   },
   
   getRank: function(username) {
      username = username.toLowerCase();
      if (botData.userData.has(username)) {
         return botData.userData.get(username);
      }
      return -1;
   },
   
   // Checks if user is an admin (rank >= 4)
   isAdmin: function(username) {
      return this.getRank(username) >= 4;
   },
   
   isMod: function(username) {
      return this.getRank(username) >= 2;
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