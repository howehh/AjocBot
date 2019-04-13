// ************************************ POINTS ******************************
// This module manages the point system for points. Users automatically earn 
// points by being in the chatroom. Points can also be given to other users.
// Other modules may use this point manager to get point data / adjust points
// **************************************************************************
const axios = require('axios');
const config = require('./../config');
const bot = require('./bot');

const raffle = {
   joined: [], // array of users who have joined the raffle
   timeout: null
}

const points = new Map(); // maps usernames to their points
const userStatuses = new Map(); // maps users to automatic point timer & their purchasing status

// Adds a username to the userStatuses map, giving them a personal automatic point timer
// and an initial state of not purchasing and not having chosen an emote to purchase.
function addUserStatus(name, rank, duplicate) {
   name = name.toLowerCase();
   if (name !== bot.BOTNAME.toLowerCase()) {
      if (!userStatuses.has(name)) {
         userStatuses.set(name, 
            {"rank": rank, "dupl": duplicate, "stopwatch": null});  
      }
      if (userStatuses.get(name).stopwatch !== null) {
         clearInterval(userStatuses.get(name).stopwatch);
      }
      if (rank > 0 && !duplicate) {
         userStatuses.get(name).stopwatch = setInterval(function() {
            adjustPoints(name, 1);
         }, 300000);
      }
   }
}

// Pass in a username and the array of their aliases
// Returns true if any of their other aliases are in the points map.
function checkIfDuplicate(name, aliases) {
   name = name.toLowerCase();
   if (aliases !== undefined) {
      aliases = aliases.map(name => name.toLowerCase());
      aliases.splice(aliases.indexOf(name), 1); // removes their own name from aliases array
      for (let i = 0; i < aliases.length; i++) {
         if (points.has(aliases[i].toLowerCase())) {
            return true;
         }
      }
   }
   return false;
}

// Pre: must have a gist that contains:
//    > a file called "points", with json in format "{"users":[{"name": name, "points": points}]}"
//      initialize by having an empty array => {"users":[]}
//    > a file called "trivianum", with number indicating current question number (init = 0)
// Post: gets the points of each user from a gist adds those users/points to the map of points. 
//    On first joining the chat, bot gets a list of the chatroom and starts the timer (to 
//    automatically earn points) for each unique user.
bot.socket.on("userlist", function(userlist) {
   axios.get("https://api.github.com/gists/" + config.gist.fileID)
   .then(function(response) {
      let json = JSON.parse(response.data.files.points.content);
      for (let i = 0; i < json.users.length; i++) {
         points.set(json.users[i].name, json.users[i].points);
      }
      
      for (let i = 0; i < userlist.length; i++) {
         if (userlist[i].meta.aliases !== undefined) {
            let duplicate = checkIfDuplicate(userlist[i].name, userlist[i].meta.aliases);
            addUserStatus(userlist[i]["name"], userlist[i]["rank"], duplicate);
         }
      }
   });
});

// When a user joins the chat, adds them to the userStatuses map if they are new.
// If they are already are on the map, reinitializes their respective timer. 
bot.socket.on("addUser", function(data) {
   let duplicate = checkIfDuplicate(data.name.toLowerCase(), data.meta.aliases);
   addUserStatus(data.name, data.rank, duplicate);
});

// When a user leaves, their timer is cleared
bot.socket.on("userLeave", function(data) {
   const name = data.name.toLowerCase();
   if (userStatuses.has(name)) {
      if (userStatuses.get(name).stopwatch !== null) {
         clearInterval(userStatuses.get(name).stopwatch);
      }
      userStatuses.delete(name);   
   }
});

// Takes a string denoting a username, and a number denoting how many points to give/take
// from them. Then updates the points map to make the appropriate change. 
function adjustPoints(currentUser, pointAdjustment) {
   currentUser = currentUser.toLowerCase();
   if (!points.has(currentUser)) {
      points.set(currentUser, 0);
   }
   let newScore = points.get(currentUser) + pointAdjustment;
   newScore = (newScore < 0) ? 0 : newScore;
   points.set(currentUser, newScore);
}

// Returns true if a user is eligible to gain points. Eligible if they have points already.
// Otherwise, eligible if they are a non-guest and do not already have points on another account
function pointEligible(username) {
   username = username.toLowerCase();
   return ((points.has(username) && points.get(username) > 0) || (userStatuses.has(username) && 
           userStatuses.get(username).rank > 0 && userStatuses.get(username).dupl === false));
}

// Checks if a username is an admin (rank >= 5)
function isAdmin(username) {
   username = username.toLowerCase();
   return userStatuses.has(username) && userStatuses.get(username).rank >= 5;
}

// cancels the current raffle if there is one
function clearRaffle() { 
   if (raffle.timeout !== null) {
      clearTimeout(raffle.timeout);
      raffle.timeout = null;
   }
   raffle.joined.splice(0, raffle.joined.length);
   bot.socket.emit("closePoll");
}

module.exports = {
   // ****************************************************
   // METHODS FOR INTERNAL USE FROM OTHER MODULES
   // ****************************************************
    
   // Returns a string of the points map in JSON format (will be saved in a gist to later be read)
   getPointsMapString: function() {
      let str = "{\"users\":[";
      points.forEach(function(points, player) {
         str += "{\"name\":" + "\"" + player + "\", \"points\":" + points + "},";
      });
      str = (str.charAt(str.length - 1) === ',') ? str.substring(0, str.length - 1) : str;
      str += "]}";
      return str;
   },
   
   getPointsMapSize: function() {
      return points.size;
   },
   
   // Returns true if the given username has points 
   hasPoints: function(username) {
      return points.has(username.toLowerCase());
   },
   
   // Requires: hasPoints(username)
   getPoints: function(username) {
      return points.get(username.toLowerCase());
   },
   
   adjustPoints: adjustPoints,
   pointEligible: pointEligible,
   isAdmin: isAdmin,
   
   
   // **********************************
   // CHAT EVENTS THAT USERS CAN TRIGGER
   // **********************************
   points: function(data) { // Shows a user's number of points and their scoreboard position
      if (data.msg.startsWith("!points")) {
         let username = "", result = "";
         // user can specify a name to get point info from. If they don't, username is set to user's name
         username = 
            (data.msg.trim() === "!points") ? data.username.toLowerCase() : data.msg.split(/\s+/g)[1];
         // if desired username isn't in points map, username is set to user's name
         if (!points.has(username)) {
            username = data.username.toLowerCase();
         }
         if (points.has(username) && points.get(username) > 0) {
            result = username + " has " + points.get(username) + " points";
            const sortedItr = (new Map([...points.entries()].sort((a, b) => b[1] - a[1]))).keys();
            const sorted = Array.from(sortedItr);
            result += " (rank " + (sorted.indexOf(username) + 2) + "/" + (points.size + 1) + ").";
         } else {
            result = username + " has 0 points (unranked).";
         }
         result += " Non-guests/non-duplicates automatically earn 1 pt per 5 mins in chat";
         bot.chat(result);
      }
   },
   
   topPoints: function(data) { // Command to show the scoreboard of points
      if (data.msg.indexOf("!toppoints") !== -1) {
         if (points.size > 0) {
            const sortedByPoints = new Map([...points.entries()].sort((a, b) => b[1] - a[1]));
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
      if (data.msg.startsWith("!give")) {
         const tokens = data.msg.trim().split(/\s+/g);
         if (tokens.length === 3) {
            const username = data.username.toLowerCase();
            const target = tokens[1].toLowerCase();
            const amount = parseInt(tokens[2]);
            if (!isNaN(amount) && amount > 0 && pointEligible(target)) {
               if (points.has(username) && points.get(username) >= amount) {
                  adjustPoints(username, -(amount));
                  adjustPoints(target, amount);
                  bot.chat(username + " gave " + target + " " + amount + " point(s)!");
               } else {
                  bot.chat(username + ": you don't have enough points AlizeeWeird");
               }
               return;
            }
         }
         bot.chat("Invalid input. Format as `!give [valid username] [positive amount]`");
      }
   },
   
   
   // Starts a raffle that ends after a certain amount of time. When the time has elapsed,
   // a random person who joined the raffle wins the amount that was specified
   startRaffle: function(data) {
      if (data.msg.indexOf("!raffle ") != -1 && isAdmin(data.username)) {
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
                  adjustPoints(raffle.joined[index], amount);
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
      if (data.msg.startsWith("!setpoints") && isAdmin(data.username.toLowerCase())) {
         const tokens = data.msg.trim().split(/\s+/g);
         if (tokens.length === 3) {
            const username = data.username.toLowerCase();
            const target = tokens[1].toLowerCase();
            const amount = parseInt(tokens[2]);
            if (!isNaN(amount) && amount >= 0 && pointEligible(target)) {
               points.set(target, amount);
               bot.chat("Set " + target + "'s points to " + amount + "!");
               return;
            }
         }
         bot.chat("Invalid input. Format as `!setpoints [valid username] [amount]`");
      } else if (data.msg.startsWith("!setpoints")) {
         bot.chat(data.username + ": you don't have this permission AlizeeWeird");
      }
   },
   
   // Command to join a current raffle
   joinRaffle: function(data) {
      if (data.msg.indexOf("!join") !== -1 && raffle.timeout !== null) {
         const username = data.username.toLowerCase();
         if (pointEligible(username)) {
            if (raffle.joined.indexOf(username) === -1) {
               raffle.joined.push(username); // adds user to raffle's "joined" array
               bot.chat(username + ": you have joined the raffle.");
            } else {
               bot.chat(username + ": you are already in the raffle. AlizeeWeird");
            }
         } else {
            bot.chat(username + ": guests/duplicates cannot join the raffle.");
         }
      }
   },
   
   // Ends a current raffle. Caller must be rank 5 (admin)
   endRaffle: function(data) {
      if (data.msg.indexOf("!endraffle") !== -1 && isAdmin(data.username) && 
          raffle.timeout !== null) {
         clearRaffle();
         bot.chat("Raffle is CANCELLED AlizeeBanana");
      }
   }
};