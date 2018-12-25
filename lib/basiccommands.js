// ******************************** Basic commands ******************************
// Simple, short functions that do not require significant code or helper methods
// ******************************************************************************

const bot = require('./bot');
const axios = require('axios');

// replies for the ask function
const replies = ["Reply hazy, try again AlizeeHmm", "Ask again AlizeeHmm", 
      "Cannot predict now, ask again AlizeeHmm", "Concentrate and ask again AlizeeOui2", 
      "You don't wanna know AlizeeWink", "It is certain AlizeeHahaa2", 
      "It is decidedly so AlizeeHahaa2", "Without a doubt AlizeeHahaa2", 
      "Yes definitely AlizeeHahaa2", "You may rely on it AlizeeHahaa2", 
      "As I see it, yes AlizeeOui", "Most likely AlizeeOui", "Outlook good AlizeeOui", 
      "Signs point to yes AlizeeOui", "No AlizeeNo2", "My reply is no AlizeeNo2", 
      "My sources say no AlizeeNo2", "Outlook not so good AlizeeNo2", 
      "Very doubtful AlizeeNo2", "If Alizee wills it AlizeeBless", 
      "Alizee wills it so AlizeeBless", "If you !roll 100 above 50 AlizeeBless"];

// "botcode..."s are chat filters in the cytube chatroom
module.exports = {
   
   commands: function(data) {
      if (data.msg.indexOf("!commands") !== -1) {
         bot.chat("botcodecommands");
      }
   },

   hello: function(data) {
      if (data.msg.indexOf("hello " + bot.botname) !== -1 || 
          data.msg.indexOf("hey " + bot.botname) !== -1 || 
          data.msg.indexOf("hi " + bot.botname) !== -1 || 
          data.msg.indexOf("morning " + bot.botname) !== -1 || 
          data.msg.indexOf("bonjour " + bot.botname) !== -1) {
         bot.chat("Hi " + data.username + " AlizeeHeyGuys");
      }
   },

   bye: function(data) {
      if (data.msg.indexOf("bye " + bot.botname) !== -1 || 
          data.msg.indexOf("night " + bot.botname) !== -1 || 
          data.msg.indexOf("bonne nuit " + bot.botname) !== -1 || 
          data.msg.indexOf("au revoir " + bot.botname) !== -1) {
         bot.chat("Bye " + data.username + " AlizeeL");
      }
   },

   nanu: function(data) {
      if (data.msg.indexOf("nanu nanu " + bot.botname) !== -1) {
         bot.chat("Nanu nanu " + data.username + " < AlizeeOui2 >");
      }
   },

   thanks: function(data) {
      if (data.msg.indexOf("thank you " + bot.botname) !== -1 ||
          data.msg.indexOf("thank u " + bot.botname) !== -1 || 
          data.msg.indexOf("thanks " + bot.botname) !== -1 ||
          data.msg.indexOf("merci " + bot.botname) !== -1 || 
          data.msg.indexOf("ty " + bot.botname) !== -1) {
         bot.chat("You're welcome, " + data.username + " AlizeeHaHAA");
      }
   },

   alizee: function(data) {
      if (data.msg !== null && data.msg !== undefined &&
          data.msg.toLowerCase().trim() === "!alizee") {
         bot.chat("botcodebae");
      }
   },

   rules: function(data) {
      if (data.msg.indexOf("!rules") !== -1) {
         bot.chat("botcoderules");
      }
   },

   time: function(data) {
      if (data.msg.indexOf("!time") !== -1) {
         bot.chat("botcodetime");
      }
   },

   iq: function(data) {
      if (data.msg.indexOf("!iq") !== -1) {
         bot.chat("botcodeiq");
      }
   },

   naysh: function(data) {
      if (data.msg.indexOf("!naysh") !== -1) {
         bot.chat("botcodenaysh");
      }
   },

   commandments: function(data) {
      if (data.msg.indexOf("!commandments") !== -1) {
         bot.chat("botcodecommandments");
      }
   },

   alizeeBible: function(data) {
      if (data.msg.indexOf("!alizeebible") !== -1) {
         bot.chat("botcodebible");
      }
   },
   
   // Rolls a random number from 1 to a specified positive upper limit inclusive
   roll: function(data) {
      if (data.msg.trim() === "!roll") { // no upper limit - default 100
         const rollNum = Math.floor(Math.random() * 100 + 1);
         bot.chat(data.username + " rolls " + rollNum + " (1-100)");
         
      } else if (data.msg.startsWith("!roll ")) { // requires specified upper limit
         const upperLimit = data.msg.split(/\s+/g)[1];
         
         if (upperLimit.length <= 0 || isNaN(upperLimit) || upperLimit <= 0) { 
            bot.chat("Invalid input AlizeeFail");
            
         } else if (upperLimit > 0) {
            const rollNum = Math.floor(Math.random() * upperLimit + 1);
            bot.chat(data.username + " rolls " + rollNum + " (1-" + upperLimit + ")");
         }
      }
   },
   
   // Gives a random reply to a question that starts with !ask. 
   ask: function(data) {
      if (data.msg.startsWith("!ask ")) {
         const replyIndex = Math.floor(Math.random() * replies.length);
         bot.chat(data.username + ": " + replies[replyIndex]);
      }
   },
   
   randomJoke: function(data) {
      if (data.msg.indexOf("!randomjoke") !== -1) {
         axios.get('https://icanhazdadjoke.com/slack')
         .then(function (response) {
            bot.chat(response.data.attachments[0].text + " AlizeeLUL");
         });
      }
   }
};