// This module manages the point system for points.
// Users Automatically obtain points by being in the cytube chatroom
// They can also gain points by playing trivia
const axios = require('axios');
const config = require('./../config');
const bot = require('./bot');

const points = new Map(); // maps usernames to their points
const timers = new Map(); // maps usernames to the timer that automatically gives them points

// gets the points of each user from a gist which saves that data
// Adds those users and their respective points to the map of users
axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   let json = JSON.parse(response.data.files.points.content);
   for (let i = 0; i < json.users.length; i++) {
      points.set(json.users[i].name, json.users[i].points);
   }
});

// On first joining the chat, bot gets a list of users in the chatroom and starts
// the timer (to automatically earn points) for each unique user.
bot.socket.on("userlist", function(userlist) {
   for (let i = 0; i < userlist.length; i++) {
      const name = userlist[i]["name"].toLowerCase();
      if (name !== bot.botname.toLowerCase() && !timers.has(name)) {
         timers.set(name, {"stopwatch": setInterval(function() {
               adjustPoints(name, 1);
            }, 300000)
         });
      }
   }
});

// When a user joins the chat, adds them to the timer map if they are new.
// If they are already are on the timer map, reinitializes their respective timer. 
bot.socket.on("addUser", function(data) {
   const name = data.name.toLowerCase();
   if (name !== bot.botname.toLowerCase()) {
      if (!timers.has(name)) {
         timers.set(name, {"stopwatch": null});
      }
      timers.get(name).stopwatch = setInterval(function() {
         adjustPoints(name, 1);
      }, 300000);
   }
});

// When a user leaves, their timer is cleared
bot.socket.on("userLeave", function(data) {
   const name = data.name.toLowerCase();
   if (timers.has(name)) {
      if (timers.get(name).stopwatch !== null) {
         clearInterval(timers.get(name).stopwatch);
      }
   }
});

const trivia = {
   playGame: false,
   questionNum: 0,
   currentQuestion: "",
   currentAnswer: "",
   questionsLength: 0
};

// Updates state of trivia with a new question/answer from a pastebin. Then chats the question
function getQuestion() {
   axios.get("https://pastebin.com/raw/epvEFdgD")
   .then(function(response) {
      trivia.currentQuestion = response.data.questions[trivia.questionNum].q;
      trivia.currentAnswer = response.data.questions[trivia.questionNum].a;
      trivia.questionsLength = response.data.questions.length;
      bot.chat(trivia.currentQuestion + " AlizeeHmm (100 pts if correct, -75 pts if skipped)");
   });
}

// Takes a string denoting a username, and a number denoting how many points to give/take from them
// Then updates the points map to make the appropriate change. 
function adjustPoints(currentUser, pointAdjustment) {
   if (!points.has(currentUser)) {
      points.set(currentUser, 0);
   }
   let newScore = points.get(currentUser) + pointAdjustment;
   if (newScore < 0) {
      newScore = 0;
   }
   points.set(currentUser, newScore);
}

// Returns a string representing the points map in a JSON format (to be saved in a gist)
function stringifyUserMap() {
   let result = "{\"users\":[";
   points.forEach(function(points, player, map) {
      result += "{\"name\":" + "\"" + player + "\", \"points\":" + points + "},";
   });
   if (result.charAt(result.length - 1) === ',') {
        result = result.substring(0, result.length - 1);
   }
   result += "]}";
   return result;
}

module.exports = {
   
   points: function(data) {
      if (data.msg.indexOf("!points") !== -1) {
         if (points.size > 0) {
            const sortedByPoints = new Map([...points.entries()].sort((a, b) => b[1] - a[1]));
            let scoreboard = "*Points (Trivia or 1 pt per 5 mins in AJOC)* - ";
            sortedByPoints.forEach(function(points, player, map) {
               scoreboard += player + ": " + points + " pts. ";
            });
            bot.chat(scoreboard);
         } else {
            bot.chat("Scoreboard is empty AlizeeWeird");
         }
      }
   },
   
   getPointsMapString: function() {
      return stringifyUserMap();
   },
   
   getPointsMapSize: function() {
      return points.size;
   },
   
   // Manages trivia games. "!trivia" triggers bot to chat a question if there is no current game.
   // Otherwise, chats the current question. When a question has been triggered (a game is in 
   // progress), waits for either the correct answer or "!skip". 
   playTrivia: function(data) {
      if (data.msg.indexOf("!trivia") !== -1) {
         if (trivia.playGame) { // game in progress
            bot.chat("Current question: " + trivia.currentQuestion + " (!skip deducts 75 points)");
         } else { // no game currently in progress, so chat new question
            trivia.playGame = true;
            getQuestion();
         } 
      } else if (trivia.playGame && (data.msg.indexOf(trivia.currentAnswer) !== -1 || 
                 data.msg.indexOf("!skip") !== -1)) {
         trivia.questionNum++;
         if (trivia.questionNum === trivia.questionsLength) {
            trivia.questionNum = 0;
         }
         if (data.msg.indexOf(trivia.currentAnswer) !== -1) { // user says correct answer
            adjustPoints(data.username, 100);
            bot.chat(data.username + " answered correctly and earned 100 points!");
            trivia.playGame = false;
         } else if (data.msg.indexOf("!skip") !== -1) { // user skips current question
            if (!bot.cooldown("playTrivia", 2000)) {return} // 2 second cooldown to skip
            adjustPoints(data.username, -75);
            bot.chat(data.username + " skipped current question and lost 75 points.");
            getQuestion();
         }
      }
   }
};