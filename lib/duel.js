// ************* DUEL **************
// Duel another user for points hehe
// *********************************
const callbacks = require('./callbacks');
const bot = require('./bot');
const points = require('./pointsdata');

const duelers = {
   challengers: {}, // maps name to the defender and duel timeout
   defenders: {} // maps name to the challenger
}

function addDuelers(challenger, defender, amount) {
   duelers.challengers[challenger] = {
      amount: amount,
      defender: defender,
      timer: setTimeout(function() {
         removeDuelers(challenger, defender);
      }, 120000)
   };
   
   duelers.defenders[defender] = challenger;
   
   points.setBusy(challenger, true);
   points.setBusy(defender, true);
}

function removeDuelers(challenger, defender) {
   let timeout = duelers.challengers[challenger].timer;
   clearTimeout(timeout);
   
   delete duelers.challengers[challenger];
   delete duelers.defenders[defender];
   points.setBusy(challenger, false);
   points.setBusy(defender, false);
}

const chatEvents = {
   // Duel a user for points
   startDuel: function(data) {
      if (data.tokens[0] === "!duel") {
         let username = data.username.toLowerCase();
         const target = data.tokens[1];
         const amount = parseInt(data.tokens[2]);
         
         if (username in duelers.challengers) {
            let defender = duelers.challengers[username].defender;
            bot.chat("You are already challenging " + defender + ". Type `!cancelduel`" +
                     " if you want to cancel it.");
            return;
         }
         if (username in duelers.defenders) {
            let challenger = duelers.defenders[username];
            let amount = duelers.challengers[challenger].amount;
            bot.chat(`${challenger} is already challenging you to a duel for `
                     + `${amount} ${points.CURRENCY}. Type \`!accept\` or \`!deny\``);
            return;
         }
         if (data.tokens.length !== 3 || isNaN(amount) || amount <= 0 || !points.pointEligible(target)
             || target.toLowerCase() === username) {
            bot.chat("Invalid input. Format as `!duel [valid username] [positive amount]`");
            return
         }
         if (target in duelers.defenders || target in duelers.challengers) {
            bot.chat(`${target} is already partaking in a duel. AlizeeWeird`);
            return;
         }
         if (points.isBusy(username) || points.isBusy(target)) {
            bot.chat(`${data.username}: one or both of you are currently busy and cannot duel`
                     + ` AlizeeWeird`);
            return
         }
         if (!points.hasPoints(username) || points.getPoints(username) < amount) {
            bot.chat(`${username}: you don't have enough ${points.CURRENCY} AlizeeWeird`);
            return
         }
         let targetPts = points.hasPoints(target) ? points.getPoints(target) : 0;
         if (targetPts < amount) {
            bot.chat(`${target} doesn't have enough ${points.CURRENCY} AlizeeWeird`);
            return
         }
         if (amount > 1000) {
            bot.chat(`${username}: you can only duel for a maximum of 1000 ${points.CURRENCY} AlizeeOui`);
            return
         }
         bot.chat(`${target}: ${username} challenged you to a duel for ${amount} `
                  + `${points.CURRENCY_SINGULAR}(s). Type \`!accept\` or \`!deny\` within 2 minutes`);
         addDuelers(username, target, amount);
      }
   },
   
   cancelDuel: function(data) {
      if (data.msg ==="!cancelduel") {
         let username = data.username.toLowerCase();
         if (username in duelers.challengers) {
            let defender = duelers.challengers[username].defender;
            removeDuelers(username, defender);
            bot.chat(`${data.username}: you have canceled your duel against ${defender}.`);
         }
      }
   },
   
   acceptOrDenyDuel: function(data) {
      let username = data.username.toLowerCase();
      if (username in duelers.defenders) {
         if (data.msg === "!accept") {
            let challenger = duelers.defenders[username];
            let amount = duelers.challengers[challenger].amount;
            
            if (amount > points.getPoints(challenger) || amount > points.getPoints(username)) {
               bot.chat(`${username}: you or ${challenger} lost too many ${points.CURRENCY} before`
                        + ` you accepted the duel. It has been cancelled AlizeeFail`);
               removeDuelers(challenger, username);
               return;
            }
            
            let challengerRoll = Math.floor(Math.random() * 100 + 1);
            let defenderRoll = Math.floor(Math.random() * 100 + 1);
            let message = `${challenger} rolled ${challengerRoll} and ${username} rolled ${defenderRoll}.`;
            
            if (challengerRoll > defenderRoll) {
               bot.chat(message + ` ${challenger} receives ${amount} ${points.CURRENCY} from ${username}!`);
               points.adjustPoints(challenger, amount);
               points.adjustPoints(username, -amount);
            } else if (defenderRoll > challengerRoll) {
               bot.chat(message + ` ${username} receives ${amount} ${points.CURRENCY} from ${challenger}!`);
               points.adjustPoints(username, amount);
               points.adjustPoints(challenger, -amount);
            } else { // tie
               bot.chat(message + " It's a tie!");
            }
            removeDuelers(challenger, username);
         } else if (data.msg === "!deny") {
            let challenger = duelers.defenders[username];
            removeDuelers(challenger, username);
            bot.chat(`${username} denied ${challenger}'s duel. AlizeeNo2`);
         }
      }
   }
}
callbacks.addChatEvents(chatEvents);