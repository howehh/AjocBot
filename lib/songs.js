// ****************************** SONGS ******************************
// Queues random/specific song to cytube playlist from pastebin list 
// *******************************************************************
const bot = require('./bot');
const callbacks = require('./callbacks');
const axios = require('axios');

const SONG_LIST = "https://pastebin.com/raw/cKP5MA5K";
const SONG_NAMES = "https://pastebin.com/raw/2WnZvQBz";

// arr: Array of objects with a "name" and "url" (youtube URL code (e.g. "t1TcDHrkQYg"))
// Queues a random song from that array
function queueRandomSong(arr) {
   const index = Math.floor(Math.random() * (arr.length));
   bot.queue(arr[index].url, "yt");
   bot.chat("Queuing up *" + arr[index].name + "*! AlizeeJam");
}

// arr = array of song objects to search through
// artist = the name of the artist
// Queues a random song by the given artist from the given arr of songs
function queueSongByArtist(arr, artist) {
   const songsByArtist = []; // arr of objects with field name and field url
   for (let i = 0; i < arr.length; i++) {
      let name = arr[i].name;
      if (name.indexOf(" - ") !== -1) {
         const artistName = name.split(" - ")[0].toLowerCase();
         if (artistName === artist || (artist.length >= 5 && artistName.indexOf(artist) !== -1)) {
            songsByArtist.push(arr[i]);
         }
      }
   }
   if (songsByArtist.length === 0) {
      bot.chat("Cannot find an artist of that name AlizeeWeird "
               + "Type `!songlist` for the available songs");
   } else {
      queueRandomSong(songsByArtist);
   }
}

// Returns a non-silly string from a string with HTML tokens
function decodeHTML(str) {
   return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/é/gi, "e");
}

module.exports = {
   // Pre: must have a pastebin containing json of songs: "{"videos":[{"name": name, "url": url}]}"
   // User command for queueing a random song. They can include an artist after "!randomsong " to 
   // specify if they want a random song from that artist. Otherwise, just queues any random song
   randomSong: function(data) {
      if (data.msg.trim() === "!randomsong") { // if given no artist parameter
         axios.get(SONG_LIST)
         .then(function(response) {
            queueRandomSong(response.data.videos);
         });
         callbacks.cooldown(module.exports.randomSong, 3000);
      } else if (data.msg.startsWith("!randomsong ")) { // if given an artist parameter
         const artist = data.msg.substring(12).trim().replace(/’/gi, "'");
         axios.get(SONG_LIST)
         .then(function(response) {
            queueSongByArtist(response.data.videos, decodeHTML(artist));
         });
         callbacks.cooldown(module.exports.randomSong, 3000);
      }     
   },

   // Pre: must have the same pastebin json of songs: "{"videos":[{"name": name, "url": url}]}"
   specificSong: function(data) {
      if (data.msg.startsWith("!song ")) {
         const songName = data.msg.substring(6).trim().replace(/’/gi, "'");
         if (songName.length >= 3) {
            axios.get("https://pastebin.com/raw/cKP5MA5K").then((response) => {
               // loops through each song and sees if any song name contains the user's request
               // If so, queues it up.
               for (let i = 0; i < response.data.videos.length; i++) {
                  if (response.data.videos[i].name.toLowerCase().replace(/’/g, "'")
                      .indexOf(songName) !== -1) { // replaces fancy apostrophes with standard
                     bot.queue(response.data.videos[i].url, "yt");
                     bot.chat("Queuing up *" + response.data.videos[i].name + "*! AlizeeJam");
                     return;
                  }
               }
               bot.chat("Song not found AlizeeWtf Type `!songlist` for the available songs");
            });
         } else {
            bot.chat("Need more information than that. AlizeeStare");
         }
         callbacks.cooldown(module.exports.specificSong, 3000);
      }
   },
   
   songList: function(data) {
      if (data.msg.indexOf("!songlist") !== -1) {
         bot.chat("View the list of songs here AlizeeJam - " + SONG_NAMES); 
      }
   }
};

callbacks.addChatEvents(module.exports);