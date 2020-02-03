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
   currentQuestion: "Who is almighty Goddess?",
   currentAnswers: ["alizee", "alizée"],
   questionsLength: 0,
   CORRECT_PTS: 50,
   SKIP_DEDUCT: 40
};

// Initializes trivia by loading saved question number
bot.firestoreDb().collection('botdata').doc('jsons').get().then(doc => {
   if (!doc.exists) {
      console.log('Did not retrieve jsons document: does not exist');
   } else if (doc.data().trivianum !== undefined) {
      let num = parseInt(doc.data().trivianum);
      if (!isNaN(num)) {
         trivia.questionNum = num;
      }
   } 
});

// json of trivia questions/answers: "{"questions":[{"q": q, "a": a}]}"
// Updates state of trivia with a new question/answer
function getQuestion() {
   bot.firestoreDb().collection('pastes').doc('trivia').get().then(doc => {
      let json = JSON.parse(doc.data().json);
      if (json.questions !== undefined) { 
         // Saves the current question, answers, and number of total questions to trivia object
         trivia.questionNum = trivia.questionNum % Math.max(1, json.questions.length);
         trivia.currentQuestion = json.questions[trivia.questionNum].q;
         trivia.currentAnswers = json.questions[trivia.questionNum].a;
         trivia.questionsLength = json.questions.length;
      }
      bot.chat(`${trivia.currentQuestion} AlizeeHmm (${trivia.CORRECT_PTS} ${points.CURRENCY} if correct, ` +
               `-${trivia.SKIP_DEDUCT} ${points.CURRENCY} if skipped)`);
   });
}

// Checks if a user has typed either the correct trivia answer or !skip
function checkForAnswer(data) {
   const username = data.username.toLowerCase();
   if (msgIncludesAnswer(data.msg)) {
      trivia.questionNum = (trivia.questionNum + 1) % Math.max(1, trivia.questionsLength);
      points.adjustPoints(username, trivia.CORRECT_PTS);
      bot.chat(`${username} answered correctly and earned ${trivia.CORRECT_PTS} ${points.CURRENCY}!`);
      trivia.playGame = false;
   } else if (data.msg.indexOf("!skip") !== -1) { // user skips current question
      if (points.hasPoints(username) && points.getPoints(username) >= trivia.SKIP_DEDUCT) {
         trivia.questionNum = (trivia.questionNum + 1) % Math.max(1, trivia.questionsLength);
         points.adjustPoints(username, -(trivia.SKIP_DEDUCT));
         bot.chat(`${username} skipped current question and lost ${trivia.SKIP_DEDUCT} ${points.CURRENCY}.`);
         getQuestion();
         callbacks.cooldown(chatEvents.playTrivia, 3000); // 3 sec cooldown if skipped
      } else {
         bot.chat(`${username}: you need at least ${trivia.SKIP_DEDUCT} ${points.CURRENCY} to skip.`);
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

const chatEvents = {   
   // Manages trivia games. "!trivia" triggers bot to chat a question if there is no current game.
   // Otherwise, chats the current question. When a question has been triggered (a game is in 
   // progress), waits for either the correct answer or "!skip". 
   playTrivia: function(data) {
      if (points.pointEligible(data.username.toLowerCase())) {
         if (data.msg.indexOf("!trivia") !== -1) {
            if (trivia.playGame) { // game in progress
               bot.chat(`Current question: ${trivia.currentQuestion} AlizeeHmm (${trivia.CORRECT_PTS}` + 
                  ` ${points.CURRENCY} if correct, -${trivia.SKIP_DEDUCT} ${points.CURRENCY} if skipped)`);
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
callbacks.addChatEvents(chatEvents);

// Tells shutdown handler what data to save
shutdown.addShutdownData(function() {
   let data = {
      filename: "trivianum",
      shutdownCheck: true,
      data: trivia.questionNum
   };
   return data;
});