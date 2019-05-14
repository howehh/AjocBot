// ***************************** ALARM *****************************
// Create an alarm that alerts user when specified time has elapsed.
// *****************************************************************
const bot = require('./bot');
const callbacks = require('./callbacks');
const parseDuration = require('parse-duration');

const alarmUsers = new Map(); // maps usernames to their alarm object

// takes a string denoting a username. Clears the user's alarm intervals/timeouts
function clearAlarms(user) { 
   if (alarmUsers.has(user)) {
      clearTimeout(alarmUsers.get(user).timeout); // override alarm timeout
      clearInterval(alarmUsers.get(user).spam); // stops current spam
      clearTimeout(alarmUsers.get(user).stopSpam); // clears any spam timeout
      alarmUsers.delete(user);
   }
}

// Takes a username, and the ms for their alarm. Sets the user's alarm (timeout) and when
// the time has elapsed, starts a spam (interval). The spam stops automatically mins later
function setAlarmHelper(username, ms, isChatMsg) {
   const alarmTime = getFormattedTime(ms);
   const msg = username + ": I will spam whisper you in (" + alarmTime + ") AlizeeOP";
   isChatMsg ? bot.chat(msg) : bot.pm(username, msg);
   
   // Sets the user's alarm (a timeout for the given ms)
   alarmUsers.set(username, {
      "timeout": setTimeout(function(){
         // this spam (private messages on 1 sec interval) starts after timeout 
         alarmUsers.get(username).spam = setInterval(function() { 
            bot.pm(username, "YOUR ALARM FOR (" + alarmTime + ") IS OVER AlizeeREE " +
                   "`Type anything to turn off.` (Automatically stops after 5 min)");
         }, 1000);
         
         alarmUsers.get(username).stopSpam = setTimeout(function() { 
            clearInterval(alarmUsers.get(username).spam);
         }, 30000); 
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

module.exports = {
   // Command to see how much time is left on a 
   checkAlarm: function(data) {
      if (data.msg.trim() === "!alarm") {
         if (!alarmUsers.has(data.username)) {
            bot.chat(data.username + ": you have no current alarms active. Type `!alarm [duration]`"
                     + " to set an alarm.");
         } else {
            const msLeft = Math.max(0, alarmUsers.get(data.username).targetTime - Date.now());
            bot.chat(data.username + ": you have (" + getFormattedTime(msLeft) + ") left"
                     + " on your alarm"); 
         }
      }
   },
   
   // command to start a personal alarm for the user (format: "!alarm [duration]")
   setAlarm: function(data) {
      if (data.msg.startsWith("!alarm ")) {
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
      if (alarmUsers.has(data.username) && alarmUsers.get(data.username).spam !== null) {
         clearAlarms(data.username);
      }
   }
}

callbacks.addMultipleChatAndWhispers(module.exports);