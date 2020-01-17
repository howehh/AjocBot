// ****************************** SONGS ******************************
// Queues random/specific song to cytube playlist from saved list 
// *******************************************************************
const bot = require('./bot');
const callbacks = require('./callbacks');
const axios = require('axios');

const SONG_NAMES = "https://pastebin.com/raw/2WnZvQBz";

// arr: Array of objects with a "name" and "url" (youtube URL code (e.g. "t1TcDHrkQYg"))
// Queues a random song from that array
function queueRandomSong(arr) {
   const index = Math.floor(Math.random() * (arr.length));
   bot.queue(arr[index].url, "yt");
   bot.chat(`Queuing up *${ arr[index].name }*! AlizeeJam`);
}

// arr = array of song objects to search through
// artist = the name of the artist
// Queues a random song by the given artist from the given arr of songs
function queueSongByArtist(arr, artist) {
   const songsByArtist = arr.filter((song) => {
      return song.name.indexOf(" - ") !== -1 && song.name.split(" - ")[0].toLowerCase() === artist;
   });   
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

callbacks.addChatEvents({
   // Json format: "{"videos":[{"name": name, "url": url}]}"
   // User command for queueing a random song. They can include an artist after "!randomsong " to 
   // specify if they want a random song from that artist. Otherwise, just queues any random song
   randomSong: function(data) {
      if (data.msg.trim() === "!randomsong") { // if given no artist parameter
         bot.firestoreDb().collection('pastes').doc('songs').get().then(doc => {
            let json = JSON.parse(doc.data().json);
            queueRandomSong(json.videos);
         });
         callbacks.cooldown(module.exports.randomSong, 3000);
      } else if (data.tokens[0] === "!randomsong") { // if given an artist parameter
         const artist = data.msg.substring(data.tokens[0].length + 1).trim().replace(/’/gi, "'");
         bot.firestoreDb().collection('pastes').doc('songs').get().then(doc => {
            let json = JSON.parse(doc.data().json);
            queueSongByArtist(json.videos, decodeHTML(artist));
         });
         callbacks.cooldown(module.exports.randomSong, 3000);
      }     
   },

   // Json format for songs: "{"videos":[{"name": name, "url": url}]}"
   specificSong: function(data) {
      if (data.tokens[0] === "!song") {
         const songName = data.msg.substring(data.tokens[0].length + 1).trim().replace(/’/gi, "'");
         if (songName.length >= 3) {
            bot.firestoreDb().collection('pastes').doc('songs').get().then(doc => {
               let json = JSON.parse(doc.data().json);
               // loops through each song and sees if any song name contains the user's request
               // If so, queues it up.
               for (let i = 0; i < json.videos.length; i++) {
                  if (json.videos[i].name.toLowerCase().replace(/’/g, "'")
                      .indexOf(songName) !== -1) { // replaces fancy apostrophes with standard
                     bot.queue(json.videos[i].url, "yt");
                     bot.chat(`Queuing up *${json.videos[i].name}*! AlizeeJam`);
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
});