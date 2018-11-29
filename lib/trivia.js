// **************************************** TRIVIA ****************************************
// Plays trivia games with the user. Users type !trivia to begin round. The user may skip 
// to the next question (lose 50 pts) or win by typing the correct answer. (earn 100 pts)
// When user gets the right answer, round ends and new question is generated for next round
// **************************************************************************************** 
const bot = require('./bot');
const axios = require('axios');

const trivia = {
   playGame: false,
   questionNum: 0,
   currentQuestion: "",
   currentAnswer: "",
   questionsLength: 0,
   players: new Map()
};

function getQuestion() {
   axios.get("https://pastebin.com/raw/epvEFdgD")
   .then(function(response) {
      trivia.currentQuestion = response.data.questions[trivia.questionNum].q;
      trivia.currentAnswer = response.data.questions[trivia.questionNum].a;
      trivia.questionsLength = response.data.questions.length;
      bot.chat(trivia.currentQuestion + " AlizeeHmm (100 pts if correct, -75 pts if skipped)");
   });
}

function adjustPoints(currentPlayer, pointAdjustment) {
   if (!trivia.players.has(currentPlayer)) {
      trivia.players.set(currentPlayer, 0);
   }
   let newScore = trivia.players.get(currentPlayer) + pointAdjustment;
   if (newScore < 0) {
      newScore = 0;
   }
   trivia.players.set(currentPlayer, newScore);
}

module.exports = {
   
   playTrivia: function(data) {
      if (data.msg.indexOf("!trivia") !== -1) {
         if (trivia.playGame) {
            bot.chat("Current question: " + trivia.currentQuestion + " (!skip deducts 75 points)");
         } else {
            trivia.playGame = true;
            getQuestion();
         } 
      } else if (trivia.playGame && (data.msg.indexOf(trivia.currentAnswer) !== -1 || 
                 data.msg.indexOf("!skip") !== -1)) {
         trivia.questionNum++;
         if (trivia.questionNum === trivia.questionsLength) {
            trivia.questionNum = 0;
         }
         if (data.msg.indexOf(trivia.currentAnswer) !== -1) {
            adjustPoints(data.username, 100);
            bot.chat(data.username + " answered correctly and earned 100 points!");
            trivia.playGame = false;
         } else if (data.msg.indexOf("!skip") !== -1) {
            if (!bot.cooldown("playTrivia", 2000)) {return}
            adjustPoints(data.username, -75);
            bot.chat(data.username + " skipped current question and lost 75 points.");
            getQuestion();
         }
      }
   },

   points: function(data) {
      if (data.msg.indexOf("!points") !== -1) {
         if (trivia.players.size > 0) {
            let scoreboard = "Trivia Points - ";
            trivia.players.forEach(function(points, player, map) {
               scoreboard += player + ": " + points + " pts. ";
            });
            bot.chat(scoreboard);
         } else {
            bot.chat("Trivia scoreboard is empty. Type !trivia to play AlizeeOui2");
         }
      }
   }
};