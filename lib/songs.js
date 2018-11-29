// ****************************** SONGS ******************************
// Queues random/specific song to cytube playlist from pastebin list 
// *******************************************************************
const bot = require('./bot');
const axios = require('axios');

module.exports = {
   randomSong: function(data) {
      if (data.msg.indexOf("!randomsong") !== -1) {
         if (!bot.cooldown("randomSong", 3000)) {return}
         axios.get("https://pastebin.com/raw/cKP5MA5K")
         .then(function(response) {
            const index = Math.floor(Math.random() * (response.data.videos.length));
            bot.queue(response.data.videos[index].url, "yt");
            bot.chat("Queuing up *" + response.data.videos[index].name + "*! AlizeeOui2");
         });
      }
   },

   specificSong: function(data) {
      if (data.msg.startsWith("!song ")) {
         const songName = data.msg.substring(6).trim();
         if (songName.length >= 3) {
            axios.get("https://pastebin.com/raw/cKP5MA5K")
            .then(function(response) {
               for (let i = 0; i < response.data.videos.length; i++) {
                  if (response.data.videos[i].name.toLowerCase().indexOf(songName) !== -1) {
                     if (!bot.cooldown("specificSong", 3000)) {return}
                     bot.queue(response.data.videos[i].url, "yt");
                     bot.chat("Queuing up *" + response.data.videos[i].name + "*! AlizeeOui2");
                     return;
                  }
               }
               bot.chat("Song not found AlizeeWtf Song list: https://pastebin.com/raw/2WnZvQBz");
            });
         } else {
            bot.chat("Need more information than that. AlizeeStare");
         }
      }
   }
};