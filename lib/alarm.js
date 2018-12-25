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

module.exports = {
   // command to start a personal alarm for the user (format: "!alarm [duration]")
   // When the duration times out, the bot spams the user for 5 minutes in private message
   setAlarm: function(data) {
      if (data.msg.startsWith("!alarm ")) {
         const ms = parseDuration(data.msg.substring(7));
         if (ms >= 1000 && ms <= 604800000) {
            const seconds = parseInt((ms / 1000) % 60, 10);
            const mins = parseInt((ms / (1000 * 60)) % 60, 10);
            const hours = parseInt((ms / (1000 * 60 * 60)) % 24, 10);
            const days = parseInt((ms / (1000 * 60 * 60 * 24)) % 24, 10);
            clearAlarms(data.username);
            bot.chat(data.username + ": I will spam whisper you in (*" + days + "*d *" 
                     + hours + "*h *" + mins + "*m *" + seconds + "*s) AlizeeOP");
            
            alarmUsers.get(data.username).currentAlarm = setTimeout(function(){ // new timeout
               alarmUsers.get(data.username).currentSpam = setInterval(function() { // start spam 
                  bot.pm(data.username, "YOUR ALARM FOR (*" + days + "*d *" + hours + "*h *"
                         + mins + "*m *" + seconds + "*s) IS OVER AlizeeREE " 
                         + "`Type anything to turn off.` (Automatically stops after 5 min)");
               }, 1000);
               // timeout to stop spam
               alarmUsers.get(data.username).stopSpam = setTimeout(function() { 
                  clearInterval(alarmUsers.get(data.username).currentSpam);
               }, 300000);
            }, ms);
         } else {
            bot.chat("Invalid input. Duration must be between 1 second and 1 week AlizeeFail");
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