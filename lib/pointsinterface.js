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

// Returns true if there is a raffle happening
function raffleActive() {
   return raffle.timeout !== null;
}

// Starts a raffle for the given amount
function initRaffle(amount) {
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

const chatEvents = {
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
            let limitReached = false;
            // Adds each user and their points to the result in descending order (if they
            // have more than 0 points). If adding a user's name/points makes the result
            // greater than 240 characters, does not include it.
            sortedByPoints.forEach(function(pts, player) {
               if (!limitReached && pts > 0) {
                  i++;
                  let addition = `/br/${i}. ${player}: ${pts}`;
                  if (addition.length + result.length <= 240) {
                     result += addition;
                  } else {
                     limitReached = true;
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
         const target = data.tokens[1];
         const amount = parseInt(data.tokens[2]);
         
         if (data.tokens.length !== 3 || isNaN(amount) || amount <= 0 || !points.pointEligible(target)) {
            bot.chat("Invalid input. Format as `!give [valid username] [positive amount]`");
            return
         }
         if (points.isBusy(data.username)) {
            bot.chat(`${data.username}: you are currently busy and cannot give ${points.CURRENCY}`
                     + ` AlizeeWeird`);
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
   
   // Starts a raffle that ends after a certain amount of time. When the time has elapsed,
   // a random person who joined the raffle wins the amount that was specified
   startRaffle: function(data) {
      if (data.msg.trim() === "!raffle" && raffleActive()) {
         if (raffle.joined.length === 0) {
            bot.chat("No one has joined the current raffle yet. Alizee:P");
         } else {
            let result = "Users in the current raffle: ";
            result += raffle.joined[0];
            for (let i = 1; i < raffle.joined.length; i++) {
               result += ", " + raffle.joined[i];
            }
            bot.chat(result);
         }
      } else if (data.tokens.length === 2 && data.tokens[0] === "!raffle" && 
                 bot.isAdmin(data.username)) {
         const amount = parseInt(data.tokens[1]);
         if (!isNaN(amount) && amount > 0) { 
            initRaffle(amount);
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
      if (data.msg.indexOf("!join") !== -1 && raffleActive()) {
         if (!points.pointEligible(data.username)) {
            bot.chat(data.username + ": guests/duplicates cannot join the raffle.");
            return
         }
         let username = data.username.toLowerCase();
         if (raffle.joined.indexOf(username) === -1) {
            raffle.joined.push(username); // adds user to raffle's "joined" array
            bot.chat(data.username + ": you have joined the raffle.");
         } else {
            bot.chat(data.username + ": you are already in the raffle. AlizeeWeird");
         }   
      }
   },
   
   // Remove a person from a raffle
   removeFromRaffle: function(data) {
      if (data.tokens[0] === "!removeraffle" && data.tokens.length === 2 && 
          bot.isAdmin(data.username)) {
         let target = data.tokens[1].toLowerCase();
         let index = raffle.joined.indexOf(target);
         if (index === -1) {
            bot.chat(`${data.username}: That person is not in the raffle. AlizeeFail`);
         } else {
            raffle.joined.splice(index, 1);
            bot.chat(`${data.username}: removed ${target} from the raffle. AlizeeOui`);
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
}
callbacks.addChatEvents(chatEvents);