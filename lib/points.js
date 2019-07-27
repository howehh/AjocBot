// ************************************ POINTS ******************************
// This module manages the point system for points. Users automatically earn 
// points by being in the chatroom. Points can also be given to other users.
// Other modules may use this point manager to get point data / adjust points
// **************************************************************************
const axios = require('axios');
const shutdown = require('./shutdown');
const callbacks = require('./callbacks');
const config = require('./../config');
const bot = require('./bot');

const raffle = {
   joined: [], // array of users who have joined the raffle
   timeout: null
}

const userData = {
   points: new Map(), // maps usernames to their points
   statuses: new Map() // maps users to automatic point timer and data
}

// Adds a username to the userStatuses map, giving them a personal automatic point timer
// and an initial state of not purchasing and not having chosen an emote to purchase.
function addUserStatus(name, duplicate) {
   name = name.toLowerCase();
   if (name !== bot.BOTNAME.toLowerCase()) {
      if (!userData.statuses.has(name)) {
         userData.statuses.set(name, 
            {"dupl": duplicate, "stopwatch": null});  
      }
      if (userData.statuses.get(name).stopwatch !== null) {
         clearInterval(userData.statuses.get(name).stopwatch);
      }
      if (bot.getRank(name) > 0 && !duplicate) {
         userData.statuses.get(name).stopwatch = setInterval(function() {
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
         if (hasPoints(aliases[i])) {
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
bot.addUserlistEvent(function(userlist) {
   axios.get("https://api.github.com/gists/" + config.gist.fileID)
   .then(function(response) {
      let json = JSON.parse(response.data.files.points.content);
      for (let i = 0; i < json.users.length; i++) {
         setPoints(json.users[i].name, json.users[i].points);
      }
      
      for (let i = 0; i < userlist.length; i++) {
         if (userlist[i].meta.aliases !== undefined) {
            let duplicate = checkIfDuplicate(userlist[i].name, userlist[i].meta.aliases);
            addUserStatus(userlist[i]["name"], duplicate);
         }
      }
   });
});

// When a user joins the chat, adds them to the userStatuses map if they are new.
// If they are already are on the map, reinitializes their respective timer. 
bot.addAddUserEvent(function(data) {
   let duplicate = checkIfDuplicate(data.name, data.meta.aliases);
   addUserStatus(data.name, duplicate);
});

// When a user leaves, their timer is cleared
bot.addUserLeaveEvent(function(data) {
   const name = data.name.toLowerCase();
   if (userData.statuses.has(name)) {
      if (userData.statuses.get(name).stopwatch !== null) {
         clearInterval(userData.statuses.get(name).stopwatch);
      }
      userData.statuses.delete(name);   
   }
});


// Takes a string denoting a username, and a number denoting how many points to give/take
// from them. Then updates the points map to make the appropriate change. 
function adjustPoints(currentUser, pointAdjustment) {
   if (!hasPoints(currentUser)) {
      setPoints(currentUser, 0);
   }
   let newScore = getPoints(currentUser) + pointAdjustment;
   newScore = (newScore < 0) ? 0 : newScore;
   setPoints(currentUser, newScore);
}

// Sets a user's points
function setPoints(username, points) {
   userData.points.set(username.toLowerCase(), points);
}

// Returns true if the given username has points 
function hasPoints(username) {
   return userData.points.has(username.toLowerCase());
}
   
// Requires: hasPoints(username)
function getPoints(username) {
   return userData.points.get(username.toLowerCase());
}

// Returns true if a user is eligible to gain points. Eligible if they have points already.
// Otherwise, eligible if they are a non-guest and do not already have points on another account
function pointEligible(username) {
   username = username.toLowerCase();
   return ((hasPoints(username) && getPoints(username) > 0) || 
           (bot.getRank(username) > 0 && userData.statuses.has(username) &&
            userData.statuses.get(username).dupl === false));
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

// Returns a string of the points map in JSON format (will be saved in a gist to later be read)
function getPointsMapString() {
   let str = "{\"users\":[";
   userData.points.forEach(function(points, player) {
      if (points > 0) {
         str += "{\"name\":" + "\"" + player + "\", \"points\":" + points + "},";
      }
   });
   str = (str.charAt(str.length - 1) === ',') ? str.substring(0, str.length - 1) : str;
   str += "]}";
   return str;
}

module.exports = {
   // ****************************************************
   // METHODS FOR INTERNAL USE FROM OTHER MODULES
   // ****************************************************
   hasPoints: hasPoints,   
   getPoints: getPoints,
   setPoints: setPoints,  
   adjustPoints: adjustPoints,
   pointEligible: pointEligible
};
   
const publicFunctions = {
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
         if (!hasPoints(username)) {
            username = data.username;
         }
         if (hasPoints(username) && getPoints(username) > 0) {
            result = username + " has " + getPoints(username) + " points";
            const sortedItr = (new Map([...userData.points.entries()].sort((a, b) => b[1] - a[1]))).keys();
            const sorted = Array.from(sortedItr);
            result += " (rank " + (sorted.indexOf(username) + 2) + "/" + (userData.points.size + 1) + ").";
         } else {
            result = username + " has 0 points (unranked).";
         }
         result += " Non-guests/non-duplicates automatically earn 1 pt per 5 mins in chat";
         bot.chat(result);
      }
   },
   
   topPoints: function(data) { // Command to show the scoreboard of points
      if (data.msg.indexOf("!toppoints") !== -1) {
         if (userData.points.size > 0) {
            const sortedByPoints = new Map([...userData.points.entries()].sort((a, b) => b[1] - a[1]));
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
            const target = tokens[1];
            const amount = parseInt(tokens[2]);
            if (!isNaN(amount) && amount > 0 && pointEligible(target)) {
               if (hasPoints(data.username) && getPoints(data.username) >= amount) {
                  adjustPoints(data.username, -(amount));
                  adjustPoints(target, amount);
                  bot.chat(data.username + " gave " + target + " " + amount + " point(s)!");
               } else {
                  bot.chat(data.username + ": you don't have enough points AlizeeWeird");
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
      if (data.msg.startsWith("!setpoints") && bot.isAdmin(data.username)) {
         const tokens = data.msg.trim().split(/\s+/g);
         if (tokens.length === 3) {
            const target = tokens[1];
            const amount = parseInt(tokens[2]);
            if (!isNaN(amount) && amount >= 0 && pointEligible(target)) {
               setPoints(target, amount);
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
         if (pointEligible(data.username)) {
            if (raffle.joined.indexOf(data.username) === -1) {
               raffle.joined.push(data.username); // adds user to raffle's "joined" array
               bot.chat(data.username + ": you have joined the raffle.");
            } else {
               bot.chat(data.username + ": you are already in the raffle. AlizeeWeird");
            }
         } else {
            bot.chat(data.username + ": guests/duplicates cannot join the raffle.");
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
};

callbacks.addMultipleChatEvents(publicFunctions);

// Tells shutdown handler what needs to be true before saving
shutdown.addShutdownCheck(function() {
   return userData.points.size > 0;
});

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "points",
      data: getPointsMapString()
   };
   return data;
});