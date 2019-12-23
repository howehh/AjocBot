// *************************** POINTS INTERFACE ******************************
// This module provides a chat command interface for interacting with the
// point system.
// **************************************************************************
const callbacks = require('./callbacks');
const bot = require('./bot');
const points = require('./pointsdata');

const raffle = {
   joined: [], // array of users who have joined the raffle
   timeout: null
}

// cancels the current raffle if there is one
function clearRaffle() { 
   if (raffle.timeout !== null) {
      clearTimeout(raffle.timeout);
      raffle.timeout = null;
   }
   raffle.joined.splice(0, raffle.joined.length);
   bot.closePoll();
}

const duelers = {
   challengers: {}, // maps name to the defender and duel timeout
   defenders: {} // maps name to the challenger
}

function addDuelers(challenger, defender, amount) {
   duelers.challengers[challenger] = {
      amount: amount,
      defender: defender,
      timer: setTimeout(function() {
         delete duelers.challengers[challenger]
         delete duelers.defenders[defender]
      }, 120000)
   };
   
   duelers.defenders[defender] = challenger;
}

function removeDuelers(challenger, defender) {
   let timeout = duelers.challengers[challenger].timer;
   clearTimeout(timeout);
            
   delete duelers.challengers[challenger];
   delete duelers.defenders[defender];
}

callbacks.addChatEvents({
   points: function(data) { // Shows a user's number of points and their scoreboard position
      if (data.tokens[0] === "!points") {
         let username = "", result = "";
         // user can specify a name. If they don't, username is set to user's name
         username = 
            (data.msg.trim() === "!points") ? data.username : data.tokens[1];
         // if desired username isn't in points map, username is set to user's name
         if (!points.hasPoints(username)) {
            username = data.username;
         }
         if (points.hasPoints(username) && points.getPoints(username) > 0) {
            result = `${username} has ${points.getPoints(username)} ${points.CURRENCY}`;
            const sortedMap = points.getSortedRankings();
            const sorted = Array.from(sortedMap.keys());
            let position = sorted.indexOf(username.toLowerCase()) + 2;
            result += ` (rank ${position}/${ (sortedMap.size + 1) }).`;
         } else {
            result = `${username} has 0 ${points.CURRENCY} (unranked).`;
         }
         result += ` Non-guests/non-duplicates automatically earn 1 ${points.CURRENCY_SINGULAR}`
                  + ` per 5 mins in chat`;
         bot.chat(result);
      }
   },
   
   topPoints: function(data) { // Command to show the scoreboard of points
      if (data.msg.indexOf("!toppoints") !== -1) {
         let result = `*Top ${points.CURRENCY_SINGULAR} collectors:*/br/1. Alizee: ∞`;
         const sortedByPoints = points.getSortedRankings();
         if (sortedByPoints.size > 0) {
            let i = 1;
            // Adds each user and their points to the result in descending order (if they
            // have more than 0 points). If adding a user's name/points makes the result
            // greater than 240 characters, does not include it.
            sortedByPoints.forEach(function(pts, player) {
               if (pts > 0) {
                  i++;
                  let addition = `/br/${i}. ${player}: ${pts}`;
                  if (addition.length + result.length <= 240) {
                     result += addition;
                  } else {
                     bot.chat(result);
                     return;
                  }
               }
            });
         }
         bot.chat(result);
      }
   },
   
   // Give another user an amount of points 
   give: function(data) {
      if (data.tokens[0] === "!give") {
         if (data.tokens.length !== 3) {
            bot.chat("Invalid input. Format as `!give [valid username] [positive amount]`");
            return
         }
         const target = data.tokens[1];
         const amount = parseInt(data.tokens[2]);
         if (isNaN(amount) || amount <= 0 || !points.pointEligible(target)) {
            bot.chat("Invalid input. Format as `!give [valid username] [positive amount]`");
            return
         }
         if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat(`${data.username}: you don't have enough ${points.CURRENCY} AlizeeWeird`);
            return
         }
         points.adjustPoints(data.username, -(amount));
         points.adjustPoints(target, amount);
         bot.chat(`${data.username} gave ${target} ${amount} ${points.CURRENCY_SINGULAR}(s)!`);
      }
   },
   
   // Duel a user for points
   startDuel: function(data) {
      if (data.tokens[0] === "!duel") {
         let username = data.username.toLowerCase();
         const target = data.tokens[1];
         const amount = parseInt(data.tokens[2]);
         if (username in duelers.challengers) {
            let defender = duelers.challengers[username].defender;
            bot.chat("You currently have a duel active with " + defender + ". Type `!cancelduel`" +
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
         if (!points.hasPoints(username) || points.getPoints(username) < amount) {
            bot.chat(`${username}: you don't have enough ${points.CURRENCY} AlizeeWeird`);
            return
         }
         if (!points.hasPoints(target)) {
            bot.chat(`${target} has no ${points.CURRENCY} AlizeeWeird`);
            return
         }
         if (points.getPoints(target) < amount) {
            bot.chat(`${target} only has ${points.getPoints(target)} ${points.CURRENCY} AlizeeWeird`);
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
   },
   
   // Starts a raffle that ends after a certain amount of time. When the time has elapsed,
   // a random person who joined the raffle wins the amount that was specified
   startRaffle: function(data) {
      if (data.tokens[0] === "!raffle" && bot.isAdmin(data.username)) {
         const amount = parseInt(data.tokens[1]);
         if (data.tokens.length > 1 && !isNaN(amount) && amount > 0) { 
            clearRaffle();
            bot.newPoll(`A raffle has been started for ${amount} ${points.CURRENCY}. Type ` +
                        "'!join' to enter. A winner will be chosen 1 HOUR after the time below",
                        [], 3600);
            // Sets a 1 hour timer, after which time the raffle is cleared and random user
            // from the joined array is picked. They then get their points increased
            raffle.timeout = setTimeout(function() {
               if (raffle.joined.length === 0) {
                  bot.chat("The raffle has ended: No one joined. AlizeeLUL");
               } else {
                  const index = Math.floor(Math.random() * raffle.joined.length);
                  points.adjustPoints(raffle.joined[index], amount);
                  bot.chat(`The raffle has ended: ${raffle.joined[index]} won ${amount} `
                           + `${points.CURRENCY}! AlizeeYay`);
               }
               clearRaffle();
            }, 3600000);  
         }
      }
   },
   
   // Admin command to set a user's number of points
   setPoints: function(data) {
      if (data.tokens[0] === "!setpoints") {
         if (!bot.isAdmin(data.username)) {
            bot.chat(data.username + ": you don't have this permission AlizeeWeird");
            return
         }
         if (data.tokens.length === 3) {
            const target = data.tokens[1];
            const amount = parseInt(data.tokens[2]);
            if (!isNaN(amount) && amount >= 0 && points.pointEligible(target)) {
               points.setPoints(target, amount);
               bot.chat(`Set ${target}'s ${points.CURRENCY} to ${amount}!`);
               return;
            }
         }
         bot.chat("Invalid input. Format as `!setpoints [valid username] [amount]`");
      }
   },
   
   // Command to join a current raffle
   joinRaffle: function(data) {
      if (data.msg.indexOf("!join") !== -1 && raffle.timeout !== null) {
         if (!points.pointEligible(data.username)) {
            bot.chat(data.username + ": guests/duplicates cannot join the raffle.");
            return
         }
         if (raffle.joined.indexOf(data.username) === -1) {
            raffle.joined.push(data.username); // adds user to raffle's "joined" array
            bot.chat(data.username + ": you have joined the raffle.");
         } else {
            bot.chat(data.username + ": you are already in the raffle. AlizeeWeird");
         }   
      }
   },
   
   // Ends a current raffle. Caller must be rank an admin
   endRaffle: function(data) {
      if (data.msg.indexOf("!endraffle") !== -1 && bot.isAdmin(data.username) && raffle.timeout !== null) {
         clearRaffle();
         bot.chat("Raffle is CANCELLED AlizeeBanana");
      }
   }
});