// ************************************ POINTS ******************************
// This module manages the point system as a model. Users automatically earn 
// points by being in the chatroom. Points can also be given to other users.
// Other modules may use this point manager to get point data / adjust points
// **************************************************************************
const axios = require('axios');
const shutdown = require('./shutdown');
const config = require('./../config');
const bot = require('./bot');

const userData = {
   points: new Map(), // maps usernames to their points
   statuses: new Map(), // maps users to automatic point timer and data
   initialized: false // initialized from cloud or not
}

// Adds a username to the userStatuses map, giving them a personal automatic point timer
// and an initial state of not purchasing and not having chosen an emote to purchase.
function addUserStatus(name, duplicate) {
   name = name.toLowerCase();
   if (name !== bot.BOTNAME.toLowerCase()) {
      if (userData.statuses.has(name)) {
         clearInterval(userData.statuses.get(name).stopwatch);
      }
      userData.statuses.set(name,  {"dupl": duplicate, "stopwatch": null, "busy": false});  
      
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
         if (hasPoints(aliases[i]) || userData.statuses.has(aliases[i])) {
            return true;
         }
      }
   }
   return false;
}

// Gets the points of each user from cloud, adds those users/points to the map of points. 
// On first joining the chat, bot gets a list of the chatroom and starts the timer (to 
// automatically earn points) for each unique user.
bot.addUserlistEvent(function(userlist) {
   bot.firestoreDb().collection('botdata').doc('jsons').get().then(doc => {
      if (!doc.exists) {
         console.log('Did not retrieve jsons document: does not exist');
      } else {
         if (doc.data().points !== undefined) {
            let json = JSON.parse(doc.data().points);
            for (let i = 0; json.users !== undefined && i < json.users.length; i++) {
               setPoints(json.users[i].name, json.users[i].points);
            }
         }
         userData.initialized = true;
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
      clearInterval(userData.statuses.get(name).stopwatch);
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
   newScore = Math.max(0, newScore);
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

// Returns true if user is busy (used for locking user points or any other utility
// that makes use of this status)
function isBusy(username) {
   username = username.toLowerCase();
   return userData.statuses.has(username) && userData.statuses.get(username).busy;
}

// Sets a user's busy status to the given boolean
function setBusy(username, bool) {
   username = username.toLowerCase();
   if (userData.statuses.has(username)) {
      userData.statuses.get(username).busy = bool;
   }
}

// Returns a string of the points map in JSON format (will be saved in cloud to later be read)
function getPointsMapString() {
   let obj = {
      "users": []
   }
   userData.points.forEach(function(points, player) {
      if (points > 0) {
         obj.users.push({"name": player, "points": points});
      }
   });
   return JSON.stringify(obj);
}

module.exports = {
   // ****************************************************
   // METHODS FOR INTERNAL USE FROM OTHER MODULES
   // ****************************************************
   
   CURRENCY: "bonbons", // name of the points
   CURRENCY_SINGULAR: "bonbon",
   
   hasPoints: hasPoints,   
   getPoints: getPoints,
   setPoints: setPoints,  
   adjustPoints: adjustPoints,
   pointEligible: pointEligible,
   setBusy: setBusy,
   isBusy: isBusy,
   
   getSortedRankings: function() { // returns a new Map of the rankings sorted by points
      return new Map([...userData.points.entries()].sort((a, b) => b[1] - a[1]));
   }
};

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "points",
      shutdownCheck: userData.initialized,
      data: getPointsMapString()
   };
   return data;
});