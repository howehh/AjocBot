// ************************** DATE ALERTS **************************
// Gives anniversary alerts through a poll. Requires bot to have mod
// ***************************************************************** 

const bot = require('./bot');
  
const dates = [{"date": "J'en Ai Marre was released", "m": 2, "d": 19, "y": 2003},
{"date": "Mes Courants Electriques was released", "m": 3, "d": 18, "y": 2003},
{"date": "Parler Tout Bas was released", "m": 4, "d": 25, "y": 2001},
{"date": "Gal Gadot was born", "m": 4, "d": 30, "y": 1985},
{"date": "J'ai Pas Vingt Ans was released", "m": 6, "d": 3, "y": 2003},
{"date": "Moi Lolita was released", "m": 7, "d": 4, "y": 2000},
{"date": "Robin Williams was born", "m": 7, "d": 21, "y": 1951},
{"date": "The Gourmandises single was released", "m": 7, "d": 25, "y": 2001},
{"date": "Robin Williams died", "m": 8, "d": 11, "y": 2014},
{"date": "Alizee was born", "m": 8, "d": 21, "y": 1984},
{"date": "Morten Harket was born", "m": 9, "d": 14, "y": 1959},
{"date": "Will Smith was born", "m": 9, "d": 25, "y": 1968},
{"date": "A Contre Courant was released", "m": 10, "d": 7, "y": 2003},
{"date": "Alizee En Concert was released", "m": 10, "d": 18, "y": 2004},
{"date": "Take On Me was released", "m": 10, "d": 19, "y": 1984},
{"date": "Alizee got married to Howeh", "m": 11, "d": 6, "y": 2003},
{"date": "Trump was elected", "m": 11, "d": 8, "y": 2016},
{"date": "The Gourmandises album was released", "m": 11, "d": 21, "y": 2000},
{"date": "L'alize was released", "m": 11, "d": 28, "y": 2000},
{"date": "Alizee Remixes album was released", "m": 12, "d": 21, "y": 2018}];

// Every hour, checks if the current date is one of the special dates.
// If so, creates an anniversary alert through a poll that lasts 19 hours
setInterval(function() {
   let today = new Date();
   let month = today.getUTCMonth() + 1;
   let day = today.getUTCDate();
   let hour = today.getUTCHours();
   let year = today.getUTCFullYear();
   
   for (let i = 0; i < dates.length; i++) {
      if (month === dates[i].m && day === dates[i].d && hour === 8) {
         bot.newPoll("Anniversary Alert: " + dates[i].date + " " + (year - dates[i].y) + 
                     " years ago today", [], 70000);
      }
   }
}, 3600000);