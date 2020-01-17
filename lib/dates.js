// ************************** event ALERTS **************************
// Gives anniversary alerts through a poll. Requires bot to have mod
// ***************************************************************** 

const bot = require('./bot');
const axios = require('axios');

const state = {
   eventHappening: false,
   currEvent: {
      m: 0,
      d: 0
   }
}

// Every hour, checks if the current event is one of the special events.
// If so, creates an anniversary alert through a poll that lasts the day
setInterval(function() {
   let today = new Date(Date.now() - 28800000); // go by PST to accommodate NA :)
   let hours = today.getHours();
   let month = today.getUTCMonth() + 1;
   let day = today.getUTCDate();
   let year = today.getUTCFullYear();
      
   // If there was an event happening and the day ended, turn eventHappening tag off
   if (state.eventHappening && (month !== state.currEvent.m || day !== state.currEvent.d)) {
      state.eventHappening = false;
   
   // If eventHappening is toggled off, check if there is one happening
   } else if (!state.eventHappening && hours < 7) {
      bot.firestoreDb().collection('pastes').doc('events').get().then(doc => {
         let json = JSON.parse(doc.data().json);
         let events = json.events;
         for (let i = 0; i < events.length; i++) {
            if (month === events[i].m && day === events[i].d) {
               bot.newPoll("Anniversary Alert: " + events[i].event + " " + (year - events[i].y) + 
                           " years ago today", [], 60000); // lasts ~17 hrs
               state.eventHappening = true;
               state.currEvent.m = events[i].m;
               state.currEvent.d = events[i].d;
            }
         }
      });
   }
}, 3600000);