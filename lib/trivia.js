// ***********************************************************************
// This module manages trivia games. Users earn points for correct answers
// ***********************************************************************
const axios = require('axios');
const shutdown = require('./shutdown');
const callbacks = require('./callbacks');
const config = require('./../config');
const bot = require('./bot');
const points = require('./pointsdata');

// State of trivia
const trivia = {
   playGame: false,
   questionNum: 0,
   currentQuestion: "",
   currentAnswers: [],
   questionsLength: 0,
   CORRECT_PTS: 80,
   SKIP_DEDUCT: 60
};

// Initializes trivia by loading saved question number
axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   trivia.questionNum = parseInt(response.data.files.trivianum.content);
});

// Pre: must have pastebin with json of trivia questions/answers "{"questions":[{"q": q, "a": a}]}"
// Updates state of trivia with a new question/answer from a pastebin. Then chats the question
function getQuestion() {
   axios.get("https://pastebin.com/raw/" + config.pastes.triv)
   .then(function(response) {
      // Saves the current question, answers, and number of total questions to trivia object
      trivia.currentQuestion = response.data.questions[trivia.questionNum].q;
      trivia.currentAnswers = response.data.questions[trivia.questionNum].a;
      trivia.questionsLength = response.data.questions.length;
      bot.chat(trivia.currentQuestion + " AlizeeHmm (" + trivia.CORRECT_PTS + " pts if correct, -"
               + trivia.SKIP_DEDUCT + " pts if skipped)");
   });
}

// Checks if a user has typed either the correct trivia answer or !skip
function checkForAnswer(data) {
   const username = data.username.toLowerCase();
   if (msgIncludesAnswer(data.msg)) {
      trivia.questionNum = 
         (trivia.questionNum + 1 === trivia.questionsLength) ? 0 : trivia.questionNum + 1;
      points.adjustPoints(username, trivia.CORRECT_PTS);
      bot.chat(username + " answered correctly and earned " + trivia.CORRECT_PTS + " points!");
      trivia.playGame = false;
   } else if (data.msg.indexOf("!skip") !== -1) { // user skips current question
      if (points.hasPoints(username) && points.getPoints(username) >= trivia.SKIP_DEDUCT) {
         trivia.questionNum = 
            (trivia.questionNum + 1 === trivia.questionsLength) ? 0 : trivia.questionNum + 1;
         points.adjustPoints(username, -(trivia.SKIP_DEDUCT));
         bot.chat(username + " skipped current question and lost " + trivia.SKIP_DEDUCT + " points.");
         getQuestion();
         callbacks.cooldown(module.exports.playTrivia, 3000); // 3 sec cooldown if skipped
      } else {
         bot.chat(username + ": you need at least " + trivia.SKIP_DEDUCT + " points to skip.");
      }
   }
}

// checks if msg includes any of the correct answers
function msgIncludesAnswer(msg) {
   for (let i = 0; i < trivia.currentAnswers.length; i++) {
      if (msg.indexOf(trivia.currentAnswers[i]) !== -1) {
         return true;
      }
   }
   return false;
}

module.exports = {   
   // Manages trivia games. "!trivia" triggers bot to chat a question if there is no current game.
   // Otherwise, chats the current question. When a question has been triggered (a game is in 
   // progress), waits for either the correct answer or "!skip". 
   playTrivia: function(data) {
      if (points.pointEligible(data.username.toLowerCase())) {
         if (data.msg.indexOf("!trivia") !== -1) {
            if (trivia.playGame) { // game in progress
               bot.chat("Current question: " + trivia.currentQuestion + " AlizeeHmm (" + 
                  trivia.CORRECT_PTS + " pts if correct, -" + trivia.SKIP_DEDUCT + " pts if skipped)");
            } else { // no game currently in progress, so chat new question
               trivia.playGame = true;
               getQuestion();
            } 
         } else if (trivia.playGame) {
            checkForAnswer(data);
         }
      } else if (data.msg.indexOf("!trivia") !== -1 || data.msg.indexOf("!skip") !== -1) {
         bot.chat(data.username + ": guests/duplicates cannot play trivia.");
      }
   }
}

callbacks.addChatEvents(module.exports);

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "trivianum",
      data: trivia.questionNum
   };
   return data;
});