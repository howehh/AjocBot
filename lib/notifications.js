// ********************** YOUTUBE/TWITCH NOTIFICATIONS ********************
// Checks on an interval if any of the channels are live or have uploaded a 
// new video. Then alerts/queues the media.
// ************************************************************************
const bot = require('./bot');
const callbacks = require('./callbacks');
const axios = require('axios');
const config = require('./../config');

const state = {
   firstAlert: true,
   firstAlertCount: 0,

   channels: [], // array of youtube/twitch channels (name, tw/yt tag, and additional tag
   newestUploads: new Map() // maps youtube channel to video ID of their newest upload 
}

// Must have json pastebin: "{"entries":[{"name": x, "type": "tw"/"yt"}]}"
// also, "id": x if it is a youtube channel, "live": true/false if twitch channel
// Post: Gets the streamer list from pastebin and stores it in array of objects
function updateChannels() {
   state.channels.splice(0, state.channels.length);
   state.newestUploads.clear();
   axios.get("https://pastebin.com/raw/7bJU7bLJ")
   .then(function(response) {
      state.channels.push.apply(state.channels, response.data.entries);
   });
   state.firstAlert = true;
   state.firstAlertCount = 0;
}
updateChannels();

// Checks if the given videoId is the newest upload of that channel.
// If so, updates that channel's newest video and returns true.
// Returns false otherwise
function newerUpload(channelName, videoId, time) {
   if (!state.newestUploads.has(channelName)) {
      state.newestUploads.set(channelName, "");
   }
   // verifies if new upload and if it has been uploaded within the last 10 mins
   if (videoId !== state.newestUploads.get(channelName) && (Date.now() - time < 600000)) {
      // updates channelName's newestUpload to this video
      state.newestUploads.set(channelName, videoId);
      return true;
   }
   return false;
}

// Called whenever it's the bot's first round of alerts. After every channel
// has been checked once, firstAlert is toggled off.
function incrementFirstAlertCount() {
   if (++state.firstAlertCount === state.channels.length) {
      state.firstAlert = false;
   }
}

// Every few mins, each entry in the notifications array is checked for an update
setInterval(function() { 
   for (let i = 0; i < state.channels.length; i++) {
      let channel = state.channels[i];
      channel.type === "tw" ? handleTwitchLive(channel) : handleYoutubeUpload(channel);
   }
}, 90000);

// Param channel = the channel object in channels array
// When a Twitch channel from channels is live, Toggles their live status
// accordingly. If a streamer is toggled from offline to live, gives an alert saying
// they are live and adds them to queue.
function handleTwitchLive(channel) {
   axios.get("https://api.twitch.tv/kraken/streams/" + channel.name + 
             "?client_id=" + config.twitchKey)
   .then(function(response) {
      if (response.data.stream !== null && !channel.live) {
         channel.live = true;
         if (!state.firstAlert) {
            const title = response.data.stream.channel.status;
            let msg = "Queued up *" + channel.name + "*:" + " \"";
            msg += (title.length > 40) ? title.substring(0, 40) + "...\"" : title + "\"";
            bot.chat(msg + " alizBae");
         }
         bot.queue(channel.name.toLowerCase(), channel.type);
      } else if (channel.live && response.data.stream === null) {
         channel.live = false;
      }
      if (state.firstAlert) incrementFirstAlertCount();
   });
}

// When a youtube channel uploads a new video, bot sends an alert through chat.
function handleYoutubeUpload(channel) {
   axios.get("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=" + 
             channel.id + "&key=" + config.youtubeKey)
   .then(function(response) {
      const uploadsId = response.data.items[0].contentDetails.relatedPlaylists.uploads;
      axios.get("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails"
                + "&maxResults=50&playlistId=" + uploadsId + "&key=" + config.youtubeKey)
      .then(function(response) {
         const items = response.data.items;
         // sort videos by their published date - larger dates (newer) comes first
         items.sort(function(item1, item2) { 
            return Date.parse(item2.snippet.publishedAt) - Date.parse(item1.snippet.publishedAt);
         });
         const highestResult = items[0];
         const highestResultId = highestResult.contentDetails.videoId;
         // If the newest video is different from the current newest video, queues it and alerts.
         if (newerUpload(channel.name, highestResultId, Date.parse(highestResult.snippet.publishedAt))) {
            if (!state.firstAlert) {
               bot.chat("NEW *" + channel.name + "* UPLOAD: \"" +
                        decodeHTML(highestResult.snippet.title) + "\" /br/" +
                        "Link: https://youtu.be/" + highestResultId + " AlizeeW"); 
               bot.queue(highestResultId, channel.type);
            }
         }
         if (state.firstAlert) incrementFirstAlertCount();
      });
   });
}

// Returns a non-retarded string from a string with HTML tokens
function decodeHTML(str) {
   return str.replace(/&#(\d+);/g, function(match, dec) {
      return String.fromCharCode(dec);
   });
}

module.exports = {
   // private message command to refresh channels list from pastebin.
   refreshSubscriptions: function(data) {
      if (data.msg.startsWith("!refresh")) {
         if (data.username === "howeh") {
            updateChannels();
            bot.pm(data.username, "Refreshed subscriptions!");
         } else {
            bot.pm(data.username, "You do not have this permission AlizeeWeird");
         }
      }
   },
   
   // public message command to get a list of twitch/youtube channels that are on the notifications
   subList: function (data) {
      if (data.msg.startsWith("!subscriptions")) {
         if (state.channels.length > 0) {
            let message =  "AJOC is subscribed to get notifications for: " + state.channels[0].name;
            for (let i = 1; i < state.channels.length; i++) {
               message += ", " + state.channels[i].name;
            }
            data.to === undefined ? bot.chat(message) : bot.pm(data.username, message);
         }
      }
   }
}

callbacks.addMultipleChatAndWhispers(module.exports);