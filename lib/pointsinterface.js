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

module.exports = {
   // ************************************************
   // CALLBACK EVENTS: Commands that users can trigger
   // ************************************************
   points: function(data) { // Shows a user's number of points and their scoreboard position
      if (data.msg.startsWith("!points")) {
         let username = "", result = "";
         // user can specify a name to get point info from. If they don't, username is set to user's name
         username = 
            (data.msg.trim() === "!points") ? data.username : data.msg.split(/\s+/g)[1];
         // if desired username isn't in points map, username is set to user's name
         if (!points.hasPoints(username)) {
            username = data.username;
         }
         if (points.hasPoints(username) && points.getPoints(username) > 0) {
            result = username + " has " + points.getPoints(username) + " points";
            const sortedMap = points.getSortedRankings();
            const sorted = Array.from(sortedMap.keys());
            result += " (rank " + (sorted.indexOf(username.toLowerCase()) + 2) + "/" + 
                  (sortedMap.size + 1) + ").";
         } else {
            result = username + " has 0 points (unranked).";
         }
         result += " Non-guests/non-duplicates automatically earn 1 pt per 5 mins in chat";
         bot.chat(result);
      }
   },
   
   topPoints: function(data) { // Command to show the scoreboard of points
      if (data.msg.indexOf("!toppoints") !== -1) {
         const sortedByPoints = points.getSortedRankings();
         if (sortedByPoints.size > 0) {
            let result = "*Top Points:*/br/1. Alizee: ∞";
            let i = 1;
            // Adds each user and their points to the result in descending order (if they
            // have more than 0 points). If adding a user's name/points makes the result
            // greater than 240 characters, does not include it.
            sortedByPoints.forEach(function(points, player) {
               if (points > 0) {
                  i++;
                  let addition = "/br/" + i + ". " + player + ": " + points;
                  if (addition.length + result.length <= 240) {
                     result += addition;
                  } else {
                     bot.chat(result);
                     return;
                  }
               }
            });
            bot.chat(result);
         } else {
            bot.chat("Scoreboard is empty AlizeeWeird");
         }
      }
   },
   
   // Give another user an amount of points 
   give: function(data) {
      if (data.msg.startsWith("!give ")) {
         const tokens = data.msg.trim().split(/\s+/g);
         if (tokens.length !== 3) {
            bot.chat("Invalid input. Format as `!give [valid username] [positive amount]`");
            return
         }
         const target = tokens[1];
         const amount = parseInt(tokens[2]);
         if (isNaN(amount) || amount <= 0 || !points.pointEligible(target)) {
            bot.chat("Invalid input. Format as `!give [valid username] [positive amount]`");
            return
         }
         if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat(data.username + ": you don't have enough points AlizeeWeird");
            return
         }
         points.adjustPoints(data.username, -(amount));
         points.adjustPoints(target, amount);
         bot.chat(data.username + " gave " + target + " " + amount + " point(s)!");
      }
   },
   
   
   // Starts a raffle that ends after a certain amount of time. When the time has elapsed,
   // a random person who joined the raffle wins the amount that was specified
   startRaffle: function(data) {
      if (data.msg.indexOf("!raffle ") != -1 && bot.isAdmin(data.username)) {
         const tokens = data.msg.trim().split(/\s+/g);
         const amount = parseInt(tokens[1]);
         if (tokens.length === 2 && !isNaN(amount) && amount > 0) { 
            clearRaffle();
            bot.newPoll("A raffle has been started for " + amount + " points. Type " +
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
                  bot.chat("The raffle has ended: " + raffle.joined[index] + " won " + 
                           amount + " pts! AlizeeYay");
               }
               clearRaffle();
            }, 3600000);  
         }
      }
   },
   
   // Admin command to set a user's number of points
   setPoints: function(data) {
      if (data.msg.startsWith("!setpoints ")) {
         if (!bot.isAdmin(data.username)) {
            bot.chat(data.username + ": you don't have this permission AlizeeWeird");
            return
         }
         const tokens = data.msg.trim().split(/\s+/g);
         if (tokens.length === 3) {
            const target = tokens[1];
            const amount = parseInt(tokens[2]);
            if (!isNaN(amount) && amount >= 0 && points.pointEligible(target)) {
               points.setPoints(target, amount);
               bot.chat("Set " + target + "'s points to " + amount + "!");
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
   },
   
   gamble: function(data) {
      if (data.msg.trim().startsWith("!gamble ")) {
         const tokens = data.msg.trim().split(/\s+/g);
         if (tokens.length < 2) {
            bot.chat("Type `!gamble [amount]` (200 max per game)");
            return;
         }
         let amount = parseInt(tokens[1]);
         if (isNaN(amount) || amount < 1 || amount > 200) {
            bot.chat("Please gamble an amount between 1 and 200 AlizeeOui");
            return
         }
         if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat("You do not have enough points to gamble AlizeesGame");
            return;
         }
         const roll = Math.floor(Math.pow(Math.random(), 1.2) * 100 + 1);
         if (roll > 50) {
            points.adjustPoints(data.username, amount);
            bot.chat(data.username + ": you rolled " + roll + " and won " + amount
                     + " point(s). You now have " + points.getPoints(data.username) + " pts AlizeePog");
         } else {
            points.adjustPoints(data.username, -amount);
            bot.chat(data.username + ": you rolled " + roll + " and lost " + amount
                     + " point(s). You now have " + points.getPoints(data.username) + " pts AlizeeSad");
         } 
      }
   }
};

callbacks.addChatEvents(module.exports);