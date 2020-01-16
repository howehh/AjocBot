// ********************** YOUTUBE/TWITCH NOTIFICATIONS ********************
// Checks on an interval if any of the channels are live or have uploaded a 
// new video. Then alerts/queues the media.
// ************************************************************************
const bot = require('./bot');
const jsonUtil = require('./bot-utils/jsonutil');
const callbacks = require('./callbacks');
const axios = require('axios');
const config = require('./../config');

const state = {
   firstAlert: true,
   firstAlertCount: 0,

   channels: [], // array of youtube/twitch channels (name, tw/yt tag, and additional tag
   newestUploads: new Map() // maps youtube channel to video ID of their newest upload 
}

// Every few mins, each entry in the channels array is checked for an update
setInterval(function() { 
   let twitchObjs = [];
   for (let i = 0; i < state.channels.length; i++) {
      let channel = state.channels[i];
      if (channel.type === "tw") {
         twitchObjs.push(channel);
      } else {
         handleYoutubeUpload(channel);
      }
   }
   handleTwitchLive(twitchObjs);
}, 120000);

// Must have json pastebin: "{"entries":[{"name": x, "type": "tw"/"yt"}]}"
// also, "id": x if it is a youtube channel, "live": true/false if twitch channel
// Post: Gets the streamer list from pastebin and stores it in array of objects
function updateChannels() {
   state.channels.splice(0, state.channels.length);
   state.newestUploads.clear();
   axios.get("https://pastebin.com/raw/7bJU7bLJ")
   .then(function(pasteResponse) {
      let twitchNames = "";
      let twitchObjs = {}; // map lower case username to associated twitch obj
      
      for (let i = 0; i < pasteResponse.data.entries.length; i++) {
         let curr = pasteResponse.data.entries[i]
         if (curr.type === "tw") {
            if (twitchNames === "") {
               twitchNames += "?login=" + curr.name;
            } else {
               twitchNames += "&login=" + curr.name;
            }
            twitchObjs[curr.name.toLowerCase()] = curr;
         } else { // it's a youtube obj
            state.channels.push(curr);
         }
      }
      // Translate twitch names to IDs since new twitch api is trash- then push
      // new objs that contain the id into state.channels
      if (twitchNames !== "") {
         axios.get('https://api.twitch.tv/helix/users' + twitchNames, {
            headers: {
               "Client-ID": config.twitchKey
            }
         }).then(function(twitchResponse) {
            for (let i = 0; i < twitchResponse.data.data.length; i++) {
               let currTwitch = twitchResponse.data.data[i];
               let twitchObj = twitchObjs[currTwitch.login.toLowerCase()];
               twitchObj["id"] = currTwitch.id;
               state.channels.push(twitchObj);
            }
         });
      }
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

// Param twitchObjs = array of twitch objects
// When a Twitch channel from channels is live, Toggles their live status
// accordingly. If a streamer is toggled from offline to live, gives an alert saying
// they are live and adds them to queue.
function handleTwitchLive(twitchObjs) {
   let twitchNames = "";
   
   if (twitchObjs.length > 0) {
      twitchNames += "?user_id=" + twitchObjs[0].id;
      
      for (let i = 1; i < twitchObjs.length; i++) {
         let curr = twitchObjs[i];
         twitchNames += "&user_id=" + curr.id;
      }
   }
   
   if (twitchNames !== "") {
      axios.get('https://api.twitch.tv/helix/streams' + twitchNames, {
         headers: {
            "Client-ID": config.twitchKey
         }
      }).then(function(response) {
         let timeout = 0;
         for (let i = 0; i < twitchObjs.length; i++) {
            let found = false;
            let channel = twitchObjs[i];
            // find the corresponding response data object (if it exists then channel is live)
            for (let j = 0; j < response.data.data.length; j++) {
               let currResponseObj = response.data.data[j];
               // if we found the channel (it's live) 
               if (currResponseObj.user_id === channel.id) {
                  found = true;
                  if (!channel.live) { // currently not set to live, so alert, and set to live
                     channel.live = true;
                     if (!state.firstAlert) {
                        const title = currResponseObj.title;
                        let msg = `Queued up *${channel.name}*: `;
                        msg += (title.length > 40) ? `"${title.substring(0, 40)}..."` : `"${title}"`;
                        bot.chat(msg + " alizBae");
                     }
                     // prevents queueing everything at once (will do it with 0.5s between each q)
                     setTimeout(() => bot.queue(channel.name.toLowerCase(), channel.type), timeout);
                     timeout += 500;
                  }
                  break;
               }
            }
            if (channel.live && !found) { // object is set to live but currently not live on twitch 
               channel.live = false;
            }
            if (state.firstAlert) incrementFirstAlertCount();
         }
      });
   }
}

// When a youtube channel uploads a new video, bot sends an alert through chat.
function handleYoutubeUpload(channel) {
   axios.get(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ channel.id }` + 
             `&key=${ config.youtubeKey }`)
   .then(function(response) {
      const uploadsId = jsonUtil.getKey(response.data, "uploads");
      axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails`
                + `&maxResults=50&playlistId=${ uploadsId }&key=${ config.youtubeKey }`)
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
               bot.chat(`NEW *${ channel.name }* UPLOAD: "${ decodeHTML(highestResult.snippet.title) }" /br/` +
                        `Link: https://youtu.be/${ highestResultId } AlizeeW`); 
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

callbacks.addChatAndWhispers({
   // private message command to refresh channels list from pastebin.
   refreshSubscriptions: function(data) {
      if (data.tokens[0] === "!refresh") {
         if (bot.isAdmin(data.username)) {
            updateChannels();
            bot.pm(data.username, "Refreshed subscriptions!");
         } else {
            bot.pm(data.username, "You do not have this permission AlizeeWeird");
         }
      }
   },
   
   // public message command to get a list of twitch/youtube channels that are on the notifications
   subList: function (data) {
      if (data.tokens[0] === "!subscriptions") {
         if (state.channels.length > 0) {
            let message =  `AJOC is subscribed to get notifications for: ${state.channels[0].name}`;
            for (let i = 1; i < state.channels.length; i++) {
               message += `, ${state.channels[i].name}`;
            }
            data.to === undefined ? bot.chat(message) : bot.pm(data.username, message);
         }
      }
   }
});