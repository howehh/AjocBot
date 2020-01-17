// ******************************** Basic commands ******************************
// Simple, short functions that do not require extensive code or are small enough
// that they don't need to be in their own module
// ******************************************************************************

const bot = require('./bot');
const jsonUtil = require('./bot-utils/jsonutil');
const config = require('./../config');
const callbacks = require('./callbacks');
const axios = require('axios');

// replies for the ask function
const replies = ["Reply hazy, try again later AlizeeHmm", "Ask again later AlizeeHmm", 
      "Cannot predict now, ask again later AlizeeHmm", "Concentrate and ask again AlizeeOui2", 
      "You don't wanna know AlizeeWink", "It is certain AlizeeHahaa2", 
      "It is decidedly so AlizeeHahaa2", "Without a doubt AlizeeHahaa2", 
      "Yes definitely AlizeeHahaa2", "You may rely on it AlizeeHahaa2", 
      "As I see it, yes AlizeeOui", "Most likely AlizeeOui", "Outlook good AlizeeOui", 
      "Signs point to yes AlizeeOui", "No AlizeeNo2", "My reply is no AlizeeNo2", 
      "My sources say no AlizeeNo2", "Outlook not so good AlizeeNo2", 
      "Very doubtful AlizeeNo2", "If Alizee wills it AlizeeBless", 
      "Alizee wills it so AlizeeMegaBless", "If you !roll 100 above 50 AlizeeBless"];

// "botcode..."s are chat filters in the cytube chatroom
callbacks.addChatEvents({
   commands: function(data) {
      if (data.msg.indexOf("!commands") !== -1) {
         bot.chat("botcodecommands");
      }
   },

   hello: function(data) {
      const terms = ["hello", "hey", "hi", "morning", "bonjour"];
      for (let i = 0; i < terms.length; i++) {
         if (data.msg.indexOf(terms[i] + " " + bot.BOTNAME) !== -1) {
            bot.chat(`Bonjour ${data.username} AlizeeHeyGuys`);
            break;
         }
      }
   },

   bye: function(data) {
      const terms = ["bye", "night", "gn", "bonne nuit", "au revoir", "later"];
      for (let i = 0; i < terms.length; i++) {
         if (data.msg.indexOf(terms[i] + " " + bot.BOTNAME) !== -1) {
            bot.chat(`Au revoir ${data.username} AlizeeL`);
            break;
         }
      }
   },
   
   thanks: function(data) {
      const terms = ["thank you", "thank u", "thanks", "merci", "ty"];
      for (let i = 0; i < terms.length; i++) {
         if (data.msg.indexOf(terms[i] + " " + bot.BOTNAME) !== -1) {
            bot.chat(`De rien, ${data.username} AlizeeHaHAA`);
            break;
         }
      }
   },

   nanu: function(data) {
      if (data.msg.indexOf("nanu nanu " + bot.BOTNAME) !== -1) {
         bot.chat(`Nanu nanu ${data.username} < AlizeeOui2 >`);
      }
   },

   alizee: function(data) {
      if (data.msg.trim() === "!alizee") {
         bot.chat("botcodebae");
      }
   },

   rules: function(data) {
      if (data.msg.indexOf("!rules") !== -1) {
         bot.chat("botcoderules");
      }
   },

   time: function(data) {
      if (data.msg.trim() === "!time") {
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
   
   pillow: function(data) {
      if (data.msg.indexOf("!pillow") !== -1) {
         bot.chat("botcodepillow");
      }
   },
   
   newmo: function(data) {
      if (data.msg.indexOf("!newmo") !== -1) {
         bot.chat("botcodenewmo");
      }
   },
   
   // Rolls a random number from 1 to a specified positive upper limit inclusive
   roll: function(data) {
      if (data.msg.trim() === "!roll") { // no upper limit - default 100
         const rollNum = Math.floor(Math.random() * 100 + 1);
         bot.chat(`${data.username} rolls ${rollNum} (1-100)`);
         
      } else if (data.tokens[0] === "!roll") { // requires specified upper limit
         const upperLimit = parseInt(data.tokens[1]);
         
         if (upperLimit.length <= 0 || isNaN(upperLimit) || upperLimit <= 0) { 
            bot.chat("Invalid input AlizeeFail");
            
         } else if (upperLimit > 0) {
            const rollNum = Math.floor(Math.random() * upperLimit + 1);
            bot.chat(`${data.username} rolls ${rollNum} (1-${upperLimit})`);
         }
      }
   },
   
   // Gives a random reply to a question that starts with !ask. 
   ask: function(data) {
      if (data.tokens[0] === "!ask" && data.tokens.length > 1) {
         const replyIndex = Math.floor(Math.random() * replies.length);
         bot.chat(data.username + ": " + replies[replyIndex]);
      }
   },
   
   randomJoke: function(data) {
      if (data.msg.indexOf("!randomjoke") !== -1) {
         if (Math.random() < 0.1) {
            bot.chat("Twitch AlizeeLUL");
         } else {
            axios.get('https://icanhazdadjoke.com/slack')
            .then(function (response) {
               let joke = jsonUtil.getKey(response.data, "text");
               bot.chat(`${joke} AlizeeLUL`);
            });
         }
      }
   },
   
   randomNewmo: function(data) {
      if (data.msg.indexOf("!randomnewmo") !== -1) {
         bot.firestoreDb().collection('pastes').doc('newmo').get().then(doc => {
            let json = JSON.parse(doc.data().json);
            const index = Math.floor(Math.random() * json.links.length);
            bot.chat("PepeLaugh :point_right: " + json.links[index] + " (most likely NSFW)");
         }).catch(function(error) {
            console.log(error);
         });
      }
   }
});