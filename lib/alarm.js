// ***************************** ALARM *****************************
// Create an alarm that alerts user when specified time has elapsed.
// *****************************************************************
const bot = require('./bot');
const config = require('./../config');
const axios = require('axios');
const shutdown = require('./shutdown');
const callbacks = require('./callbacks');
const parseDuration = require('parse-duration');

const alarmData = {
   alarmUsers: new Map(), // maps usernames to their alarm object
   alarmsFromGistsSet: false
}

// Sets alarms of people who had alarms saved in the heavens
axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   let json = JSON.parse(response.data.files.alarms.content);
   for (let i = 0; i < json.users.length; i++) {
      setTimer(json.users[i].name, json.users[i].time);
   }
   alarmData.alarmsFromGistsSet = true;
});

// takes a string denoting a username. Clears the user's alarm intervals/timeouts
function clearAlarms(user) { 
   if (alarmData.alarmUsers.has(user)) {
      clearTimeout(alarmData.alarmUsers.get(user).timeout); // override alarm timeout
      clearInterval(alarmData.alarmUsers.get(user).spam); // stops current spam
      clearTimeout(alarmData.alarmUsers.get(user).stopSpam); // clears any spam timeout
      alarmData.alarmUsers.delete(user);
   }
}

// Takes a username, and the ms for their alarm. Sets the user's alarm (timeout) and when
// the time has elapsed, starts a spam (interval). The spam stops automatically mins later
function setAlarmHelper(username, ms, isChatMsg) {
   const msg = username + ": I will spam whisper you in (" + getFormattedTime(ms) + ") AlizeeOP";
   isChatMsg ? bot.chat(msg) : bot.pm(username, msg);
   
   setTimer(username, ms);
}

// Actually sets the alarm (without sending chat message)
function setTimer(username, ms) {
   alarmData.alarmUsers.set(username, {
      "timeout": setTimeout(function(){
         // this spam (private messages on 1 sec interval) starts after timeout 
         alarmData.alarmUsers.get(username).spam = setInterval(function() { 
            bot.pm(username, "YOUR ALARM FOR (" + getFormattedTime(ms) + ") IS OVER AlizeeREE " +
                   "`Type anything to turn off.` (Automatically stops after 5 min)");
         }, 1000);
         
         alarmData.alarmUsers.get(username).stopSpam = setTimeout(function() { 
            clearInterval(alarmData.alarmUsers.get(username).spam);
         }, 300000); 
      }, ms),
      
      "spam": null,
      "stopSpam": null,
      "targetTime": Date.now() + ms
   });
}

function getFormattedTime(ms) {
   const seconds = parseInt((ms / 1000) % 60, 10);
   const mins = parseInt((ms / (1000 * 60)) % 60, 10);
   const hours = parseInt((ms / (1000 * 60 * 60)) % 24, 10);
   const days = parseInt((ms / (1000 * 60 * 60 * 24)) % 24, 10);
   return days + "d " + hours + "h " + mins + "m " + seconds + "s";
}

// Requires that the given username is in 
// Returns ms left on username's alarm
function getTimeLeft(username) { 
   return Math.max(0, alarmData.alarmUsers.get(username).targetTime - Date.now());
}

function getAlarmMapString() {
   let str = "{\"users\":[";
   const mapKeys = alarmData.alarmUsers.keys();
   for (let i = 0; i < alarmData.alarmUsers.size; i++) {
      const name = mapKeys.next().value;
      str += "{\"name\":" + "\"" + name + "\", \"time\":" + getTimeLeft(name) + "},";
   }
   str = (str.charAt(str.length - 1) === ',') ? str.substring(0, str.length - 1) : str;
   str += "]}";
   return str;
}

module.exports = {   
   // command to start a personal alarm for the user (format: "!alarm [duration]")
   setAlarm: function(data) {
      if (data.msg.trim() === "!alarm") {
         if (!alarmData.alarmUsers.has(data.username)) {
            bot.chat(data.username + ": you have no current alarms active. Type `!alarm [duration]`"
                     + " to set an alarm.");
         } else {
            const msLeft = getTimeLeft(data.username);
            bot.chat(data.username + ": you have (" + getFormattedTime(msLeft) + ") left"
                     + " on your alarm"); 
         }
      } else if (data.msg.startsWith("!alarm ")) {
         const ms = parseDuration(data.msg.substring(7));
         if (ms >= 1000 && ms <= 604800000) { // ms must be between 1s and 7 days
            clearAlarms(data.username);
            setAlarmHelper(data.username, ms, data.to === undefined); 
         } else {
            const err = "Invalid input. Duration must be between 1 second and 1 week AlizeeFail";
            data.to === undefined ? bot.chat(err) : bot.pm(data.username, err);
         }
      }
   },
   
   // stop an alarm. 
   stopAlarm: function(data) {
      if (alarmData.alarmUsers.has(data.username) && alarmData.alarmUsers.get(data.username).spam !== null) {
         clearAlarms(data.username);
      }
   }
}

callbacks.addMultipleChatAndWhispers(module.exports);

// Tells shutdown handler that the alarms were successfully set
shutdown.addShutdownCheck(function() {
   return alarmData.alarmsFromGistsSet;
});

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "alarms",
      data: getAlarmMapString()
   };
   return data;
});