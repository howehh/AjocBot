// ****************************** STREAM STUFF ******************************
// Checks every 90 sec if any of the streamers are live then queues live ones
// **************************************************************************
const bot = require('./bot');
const axios = require('axios');
const config = require('./../config');

let streamers = [];

function getStreamers() {
   streamers.splice(0, streamers.length);
   axios.get("https://pastebin.com/raw/7bJU7bLJ")
   .then(function(response) {
      response.data.streamerStatuses.forEach(function(streamerStatus) {
         streamers.push(streamerStatus);
      });
   });
}

getStreamers();

setInterval(function() {
   for (let i = 0; i < streamers.length; i++) {
      if (streamers[i].type === "tw") {
         axios.get("https://api.twitch.tv/kraken/streams/" + streamers[i].name + 
                   "?client_id=" + config.twitchKey)
         .then(function(response) {
            if (response.data.stream !== null && !streamers[i].live) {
               streamers[i].live = true;
               bot.chat("Queued up " + streamers[i].name + "! alizBae");
               bot.queue(streamers[i].name.toLowerCase(), streamers[i].type);
            } else if (streamers[i].live && response.data.stream === null) {
               streamers[i].live = false;
            }
         });
      } else { // type is yt
         axios.get("https://www.googleapis.com/youtube/v3/search?part=snippet" +
                   "&channelId=" + streamers[i].id + 
                   "&type=video&eventType=live&key=" + config.youtubeKey)
         .then(function(response) {
            if (response.data.pageInfo.totalResults !== 0 && !streamers[i].live) {
               streamers[i].live = true;
               bot.chat("Queued up " + streamers[i].name + "! alizBae");
               bot.queue(response.data.items[0].id.videoId, streamers[i].type);
            } else if (streamers[i].live && response.data.pageInfo.totalResults === 0) {
               streamers[i].live = false;
            }
         });
      }
   }
}, 90000);

module.exports = {

   refreshStreamers: function(data) {
      if (data.msg.startsWith("!refreshstreamers")) {
         if (data.username === "howeh") {
            bot.pm(data.username, "Refreshing streamer list...");
            getStreamers();
         } else {
            bot.pm(data.username, "You do not have this permission AlizeeWeird");
         }
      }
   },

   streamerList: function (data) {
      if (data.msg.startsWith("!streamers")) {
         if (streamers.length > 0) {
            let message = "Streamers on the auto-queue list: " + streamers[0].name;
            for (let i = 1; i < streamers.length; i++) {
               message += ", " + streamers[i].name;
            }
            bot.chat(message);
         }
      }
   }
}