// ***********************************************************************
// This module manages trivia games. Users earn points for correct answers
// ***********************************************************************
const axios = require('axios');
const config = require('./../config');
const bot = require('./bot');
const points = require('./points');

// State of trivia
const trivia = {
   playGame: false,
   questionNum: 0,
   currentQuestion: "",
   currentAnswer: "",
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
      // Saves the current question, answer, and number of total questions to trivia object
      trivia.currentQuestion = response.data.questions[trivia.questionNum].q;
      trivia.currentAnswer = response.data.questions[trivia.questionNum].a;
      trivia.questionsLength = response.data.questions.length;
      bot.chat(trivia.currentQuestion + " AlizeeHmm (" + trivia.CORRECT_PTS + " pts if correct, -"
               + trivia.SKIP_DEDUCT + " pts if skipped)");
   });
}

// Checks if a user has typed either the correct trivia answer or !skip
function checkForAnswer(data) {
   const username = data.username.toLowerCase();
   if (data.msg.indexOf(trivia.currentAnswer) !== -1) { // correct answer
      trivia.questionNum = 
         (trivia.questionNum + 1 === trivia.questionsLength) ? 0 : trivia.questionNum + 1;
      points.adjustPoints(username, trivia.CORRECT_PTS);
      bot.chat(username + " answered correctly and earned " + trivia.CORRECT_PTS + " points!");
      trivia.playGame = false;
   } else if (data.msg.indexOf("!skip") !== -1) { // user skips current question
      if (!bot.cooldown("playTrivia", 2000)) {return} // 2 second cooldown to skip
      if (points.hasPoints(username) && points.getPoints(username) >= trivia.SKIP_DEDUCT) {
         trivia.questionNum = 
            (trivia.questionNum + 1 === trivia.questionsLength) ? 0 : trivia.questionNum + 1;
         points.adjustPoints(username, -(trivia.SKIP_DEDUCT));
         bot.chat(username + " skipped current question and lost " + trivia.SKIP_DEDUCT + " points.");
         getQuestion();
      } else {
         bot.chat(username + ": you need at least " + trivia.SKIP_DEDUCT + " points to skip.");
      }
   }
}

module.exports = {
   // Gets the current question number
   getTriviaNum: function() {
      return trivia.questionNum;
   },
   
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