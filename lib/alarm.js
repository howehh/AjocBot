// ***************************** ALARM *****************************
// Create an alarm that alerts user when specified time has elapsed.
// *****************************************************************
const bot = require('./bot');
const parseDuration = require('parse-duration');

const alarmUsers = new Map(); // maps usernames to their alarm object

// takes a string denoting a username. Clears the user's alarm intervals/timeouts
function clearAlarms(user) { 
   if (!alarmUsers.has(user)) {
      alarmUsers.set(user, {"currentTimeout": null, "currentSpam": null, "stopSpam": null});
   } else {
      clearTimeout(alarmUsers.get(user).currentAlarm); // override alarm timeout
      clearInterval(alarmUsers.get(user).currentSpam); // stops current spam
      clearTimeout(alarmUsers.get(user).stopSpam); // clears any spam timeout
   }
}

// Takes a username, and the ms for their alarm. Sets the user's alarm (timeout) and when
// the time has elapsed, starts a spam (interval). The spam stops automatically mins later
function setAlarmHelper(username, ms, isChatMsg) {
   const seconds = parseInt((ms / 1000) % 60, 10);
   const mins = parseInt((ms / (1000 * 60)) % 60, 10);
   const hours = parseInt((ms / (1000 * 60 * 60)) % 24, 10);
   const days = parseInt((ms / (1000 * 60 * 60 * 24)) % 24, 10);
   
   const msg = username + ": I will spam whisper you in (*" + days + "*d *" +
               hours + "*h *" + mins + "*m *" + seconds + "*s) AlizeeOP";
   isChatMsg ? bot.chat(msg) : bot.pm(username, msg);
   // Sets the user's alarm (a timeout for the given ms)
   alarmUsers.get(username).currentAlarm = setTimeout(function(){
      // this spam (private messages on 1 sec interval) starts after timeout 
      alarmUsers.get(username).currentSpam = setInterval(function() { 
         bot.pm(username, "YOUR ALARM FOR (*" + days + "*d *" + hours + "*h *" +
                mins + "*m *" + seconds + "*s) IS OVER AlizeeREE " +
                "`Type anything to turn off.` (Automatically stops after 5 min)");
      }, 1000);
      
      // timeout to stop spam
      alarmUsers.get(username).stopSpam = setTimeout(function() { 
         clearInterval(alarmUsers.get(username).currentSpam);
      }, 300000); 
   }, ms);
}

module.exports = {
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
   
   // private message command to stop an alarm. 
   stopAlarm: function(data) {
      if (alarmUsers.has(data.username)) {
         clearInterval(alarmUsers.get(data.username).currentSpam);
      }
   }
}