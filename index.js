// Imports
const config = require('./config');
const sc = require("socket.io-client");
const axios = require("axios");
const parseDuration = require("parse-duration");
const convert = require('convert-units');
const Gists = require('gists');

// Bot login credentials for cytube
const botname = config.cytube.username;
const password = config.cytube.password;

// Connecting to Cytube via websocket
const socket = sc.connect(config.cytube.socketConnection, {
   secure: true
});

// Asks the server for the channel callbacks
socket.emit("initChannelCallbacks");

// Emitting joinChannel event that the server is listening to and telling it to join channel.  
// You can see events cytube fires in chrome developer tools network tab
socket.emit("joinChannel", {
   name: config.cytube.channel
});

// Logging into Cytube
socket.emit("login", {
   name: botname,
   pw: password
});

// Join message
socket.on("login", (data) => {
   chat(botname.substring(0, 1).toUpperCase() + botname.substring(1) + 
        " reporting for duty deteAlizee");
});

// Array of chat msg functions
const chatMsgEvents = [commands, ask, hello, bye, nanu, thanks, fuckYou, alizee, rules,
   time, iq, funfriend, naysh, commandments, alizeeBible, roll, counter, countReport, 
   randomSong, specificSong, getWeather, alarm, playTrivia, points, convertUnits, units, define];

// On a chat message event, data is logged to console and sent to each chatMsgEvent function
// Data is whatever data is given from chat msg event
socket.on("chatMsg", (data) => {
   console.log(data);
   if (data.username.toLowerCase() === botname) { 
      chat("/afk");
      return; // exits this function without sending data to each chatMsgEvent funct
   }
   data.msg = data.msg.toLowerCase();
   chatMsgEvents.forEach(c => c(data));
});

// Creates and sends a chat message
// message = message to be sent
let currentChatTime = 0;
function chat(message) {
   let newTime = new Date().getTime();
   // 10 ms cooldown so bot doesn't chat several messages at once and get kicked by cytube
   if (newTime - currentChatTime > 10) { 
      socket.emit("chatMsg", {
         msg: message,
         meta: {}
      });
      currentChatTime = newTime;
   }
}

function pm(user, message) {
   socket.emit("pm", {
      to: user, 
      msg: message, 
      meta: {}
   });
}

// removes a function from chatMsgEvents array, then adds it back after the given duration (ms)
function cooldown(funcToPause, duration) {
   for (let i = chatMsgEvents.length - 1; i >= 0; i--) {
      if (chatMsgEvents[i] === funcToPause) {
         chatMsgEvents.splice(i, 1); 
         setTimeout(function(){
            chatMsgEvents.push(funcToPause); 
         }, duration);
      }
   }
}   

// ************** BASIC COMMANDS *************
// "botcode"s are chat filters in the channel.
// *******************************************
function commands(data) {
   if (data.msg.indexOf("!commands") !== -1) {
      chat("botcodecommands");
   }
}

function hello(data) {
   if (data.msg.indexOf("hello " + botname) !== -1 || 
       data.msg.indexOf("hey " + botname) !== -1 || 
       data.msg.indexOf("hi " + botname) !== -1 || 
       data.msg.indexOf("morning " + botname) !== -1 || 
       data.msg.indexOf("bonjour " + botname) !== -1) {
      chat("Hi " + data.username + " AlizeeHeyGuys");
   }
}

function bye(data) {
   if (data.msg.indexOf("bye " + botname) !== -1 || 
       data.msg.indexOf("night " + botname) !== -1 || 
       data.msg.indexOf("bonne nuit " + botname) !== -1 || 
       data.msg.indexOf("au revoir " + botname) !== -1) {
      chat("Bye " + data.username + " AlizeeL");
   }
}

function nanu(data) {
   if (data.msg.indexOf("nanu nanu " + botname) !== -1) {
      chat("Nanu nanu " + data.username + " < AlizeeOui2 >");
   }
}

function thanks(data) {
   if (data.msg.indexOf("thank you " + botname) !== -1 ||
       data.msg.indexOf("thank u " + botname) !== -1 || 
       data.msg.indexOf("thanks " + botname) !== -1 ||
       data.msg.indexOf("merci " + botname) !== -1 || 
       data.msg.indexOf("ty " + botname) !== -1) {
      chat("You're welcome, " + data.username + " AlizeeHaHAA");
   }
}

function fuckYou(data) {
   if (data.msg.indexOf("fuck you " + botname) !== -1) {
      chat("FUCK YOU " + data.username + " AlizeeRude");
   }
}

function alizee(data) {
   if (data.msg !== null && data.msg !== undefined &&
       data.msg.toLowerCase().trim() === "!alizee") {
      chat("botcodebae");
   }
}

function rules(data) {
   if (data.msg.indexOf("!rules") !== -1) {
      chat("botcoderules");
   }
}

function time(data) {
   if (data.msg.indexOf("!time") !== -1) {
      chat("botcodetime");
   }
}

function iq(data) {
   if (data.msg.indexOf("!iq") !== -1) {
      chat("botcodeiq");
   }
}

function funfriend(data) {
   if (data.msg.indexOf("!funfriend") !== -1) {
      chat("botcodefunfriend");
   }
}

function naysh(data) {
   if (data.msg.indexOf("!naysh") !== -1) {
      chat("botcodenaysh");
   }
}

function commandments(data) {
   if (data.msg.indexOf("!commandments") !== -1) {
      chat("botcodecommandments");
   }
}

function alizeeBible(data) {
   if (data.msg.indexOf("!alizeebible") !== -1) {
      chat("botcodebible");
   }
}

// Rolls a random number from 1 to a specified positive upper limit
function roll(data) {
   const upperLimit = data.msg.split(/\s+/g)[1];
   // Checks if message starts with !roll, if upperlimit is positive number
   if (data.msg.startsWith("!roll ") && upperLimit.length > 0 &&
       !isNaN(upperLimit) && upperLimit >= 0) {
      const rollNum = Math.floor(Math.random() * upperLimit + 1);
      chat(data.username + " rolls " + rollNum + " (1-" + upperLimit + ")");
   } else if (data.msg.startsWith("!roll ") && data.msg.includes(upperLimit, 5) &&
              (isNaN(upperLimit) || upperLimit < 0)) { // Invalid if number is negative or NaN
      chat("Invalid input AlizeeFail");
   } else if (data.msg.startsWith("!roll")) { // If command is simply !roll, roll from 1-100
      const rollNum = Math.floor(Math.random() * 100 + 1);
      chat(data.username + " rolls " + rollNum + " (1-100)");
   }
}

// ***************************************** ASK *****************************************
// Gives a random reply to a question that starts with !ask. Replies 0-2 invoke a cooldown
// ***************************************************************************************
const replies = ["Reply hazy, try again later AlizeeHmm", "Ask again later AlizeeHmm", 
   "Cannot predict now, ask later AlizeeHmm", "Concentrate and ask again AlizeeOui2", 
   "You don't wanna know AlizeeWink", "It is certain AlizeeHahaa2", 
   "It is decidedly so AlizeeHahaa2", "Without a doubt AlizeeHahaa2", 
   "Yes definitely AlizeeHahaa2", "You may rely on it AlizeeHahaa2", 
   "As I see it, yes AlizeeOui", "Most likely AlizeeOui", "Outlook good AlizeeOui", 
   "Signs point to yes AlizeeOui", "No AlizeeNo2", "My reply is no AlizeeNo2", 
   "My sources say no AlizeeNo2", "Outlook not so good AlizeeNo2", 
   "Very doubtful AlizeeNo2", "If Alizee wills it AlizeeBless", 
   "Alizee wills it so AlizeeBless", "If you !roll 100 above 50 AlizeeBless"];
   
function ask(data) {
   if (data.msg.startsWith("!ask ")) {
      const replyIndex = Math.floor(Math.random() * replies.length);
      chat(data.username + ": " + replies[replyIndex]);
      if (replyIndex <= 2) {
         cooldown(ask, 30000);
      } 
   }
}

// ************************** DATE ALERTS **************************
// Gives anniversary alerts through a poll. Requires bot to have mod
// *****************************************************************   
const dates = [{"date": "Alizee was born", "m": 8, "d": 21, "y": 1984},
{"date": "The Gourmandises album was released", "m": 11, "d": 21, "y": 2000},
{"date": "Moi Lolita was released", "m": 7, "d": 4, "y": 2000},
{"date": "L'alize was released", "m": 11, "d": 28, "y": 2000},
{"date": "The Gourmandises single was released", "m": 7, "d": 25, "y": 2001},
{"date": "Parler Tout Bas was released", "m": 4, "d": 25, "y": 2001},
{"date": "Mes Courants Electriques was released", "m": 3, "d": 18, "y": 2003},
{"date": "J'en Ai Marre was released", "m": 2, "d": 19, "y": 2003},
{"date": "J'ai Pas Vingt Ans was released", "m": 6, "d": 3, "y": 2003},
{"date": "A Contre Courant was released", "m": 10, "d": 7, "y": 2003},
{"date": "Alizee got married to Howeh", "m": 11, "d": 6, "y": 2003},
{"date": "Alizee En Concert was released", "m": 10, "d": 18, "y": 2004},
{"date": "Robin Williams was born", "m": 7, "d": 21, "y": 1951},
{"date": "Robin Williams died", "m": 8, "d": 11, "y": 2014},
{"date": "Will Smith was born", "m": 9, "d": 25, "y": 1968},
{"date": "Gal Gadot was born", "m": 4, "d": 30, "y": 1985},
{"date": "Trump was elected", "m": 11, "d": 8, "y": 2016},
{"date": "Morten Harket was born", "m": 9, "d": 14, "y": 1959},
{"date": "Take On Me was released", "m": 10, "d": 19, "y": 1984}];

setInterval(function() {
   let today = new Date();
   let month = today.getUTCMonth() + 1;
   let day = today.getUTCDate();
   let hour = today.getUTCHours();
   let year = today.getUTCFullYear();
   
   for (let i = 0; i < dates.length; i++) {
      if (month === dates[i].m && day === dates[i].d && hour === 8) {
         socket.emit("newPoll", {
            title: "Anniversary Alert: " + dates[i].date + " " + (year - dates[i].y) + 
                   " years ago today",
            opts: [],
            obscured: false,
            timeout: 70000
         });
      }
   }
}, 3600000);

// **************************** ALIZEE COUNTER ****************************
// Reads a github gist to get launch date and the count of Alizee mentions.
// ************************************************************************
const countState = {
   count: 0,
   launchDate: ""
};

axios.get("https://api.github.com/gists/" + config.gist.fileID)
.then(function(response) {
   countState.launchDate = response.data.files.launchdate.content;
   countState.count = parseInt(response.data.files.alizeecount.content, 10);
});

function counter(data) {
   if (data.msg.indexOf("alizee") !== -1 || data.msg.indexOf("alizbae") !== -1 ||
       data.msg.indexOf("fastcarz") !== -1 || data.msg.indexOf("alulzee") !== -1 ||
       data.msg.indexOf("mlolita") !== -1 || data.msg.indexOf("lili") !== -1) {
      countState.count++;
      if (countState.count % 500 === 0) {
         chat("Alizee mention milestone: " + countState.count + "! AlizeeYay");
      }
   }
}

// On bot disconnecting, program automatically exits after 10 seconds
socket.on("disconnect", function() {
   setTimeout(function() {
      saveCountAndExit();
   }, 10000);
});

// On Ctrl+C'ing program, saves Alizee count then exits
process.on('SIGINT', function () {
   saveCountAndExit();
});
// On closing command prompt, saves Alizee count then exits
process.on('SIGHUP', function () {
   saveCountAndExit();
});
// On an error that ends program, saves Alizee count then exits
process.on('uncaughtException', function(e) {
   console.log(e.stack);
   console.log();
   saveCountAndExit();
});

// Edits "alizeecount" gist with new count and then exits.
function saveCountAndExit() {
   console.log("\nSaving Alizee count to gist...");
   const gists = new Gists({
      username: config.gist.username,
      password: config.gist.password
   });
   const options = {
      "files": {
         "alizeecount": {
            "content": "" + countState.count,
         }
      }
   }
   gists.edit(config.gist.fileID, options)
   .then(function() {
      process.exit(0);
   });
}

function countReport(data) {
   if (data.msg.indexOf("!count") !== -1) {
      const then = new Date(countState.launchDate);
      const now = new Date();
      const elapsedDays = parseInt((now.getTime() - then.getTime()) / 86400000, 10);
      chat("Alizee has been mentioned or had her emotes used in `" + countState.count + 
           "` messages since " + countState.launchDate + " (" + elapsedDays + " days ago) AlizeeOP");
   }
}

// ****************************** SONGS ******************************
// Queues random/specific song to cytube playlist from pastebin list 
// *******************************************************************
function randomSong(data) {
   if (data.msg.indexOf("!randomsong") !== -1) {
      cooldown(randomSong, 3000);
      axios.get("https://pastebin.com/raw/cKP5MA5K")
      .then(function(response) {
         const index = Math.floor(Math.random() * (response.data.videos.length));
         socket.emit("queue", {
            id: response.data.videos[index].url,
            pos: "end",
            type: "yt"
         });
         chat("Queuing up *" + response.data.videos[index].name + "*! AlizeeOui2");
      });
   }
}

function specificSong(data) {
   if (data.msg.startsWith("!song ")) {
      const songName = data.msg.substring(6).trim();
      if (songName.length >= 3) {
         axios.get("https://pastebin.com/raw/cKP5MA5K")
         .then(function(response) {
            for (let i = 0; i < response.data.videos.length; i++) {
               if (response.data.videos[i].name.toLowerCase().indexOf(songName) !== -1) {
                  socket.emit("queue", {
                     id: response.data.videos[i].url,
                     pos: "end",
                     type: "yt"
                  });
                  chat("Queuing up *" + response.data.videos[i].name + "*! AlizeeOui2");
                  cooldown(specificSong, 3000);
                  return;
               }
            }
            chat("Song not found AlizeeWtf Song list: https://pastebin.com/raw/2WnZvQBz");
         });
      } else {
         chat("Need more information than that. AlizeeStare");
      }
   }
}

// *************************** WEATHER ***************************
// Informs user of the temperature and weather in a given location
// ***************************************************************
function getWeather(data) {
   if (data.msg.startsWith("!weather ")) { 
      cooldown(getWeather, 5000);
      const city = data.msg.substring(9);
      axios.get("http://api.openweathermap.org/data/2.5/weather?q=" + city + 
                "&APPID=" + config.openweathermapKey)
      .then(function(response) {
         const place = response.data.name + ", " + response.data.sys.country;
         const temperatureF = Math.round(1.8 * (response.data.main.temp - 273) + 32);
         const temperatureC = Math.round(response.data.main.temp - 273);
         const weather = response.data.weather[0].description;
         chat(place + ", is currently " + temperatureF + 
              " F (" + temperatureC + " C) with " + weather + " AlizeeOP");
      })
      .catch(function(error) { // error message if location isn't readable.
         if (error.response.status === 404) {
            chat("Invalid city name. AlizeeFail");
         }
      });
   }
}

// ***************************** ALARM *****************************
// Create an alarm that alerts user when specified time has elapsed.
// *****************************************************************
const alarmUsers = [];
function alarm(data) {
   if (data.msg.startsWith("!alarm ")) {
      const ms = parseDuration(data.msg.substring(7));
      if (ms >= 1000 && ms <= 604800000) {
         const seconds = parseInt((ms / 1000) % 60, 10);
         const mins = parseInt((ms / (1000 * 60)) % 60, 10);
         const hours = parseInt((ms / (1000 * 60 * 60)) % 24, 10);
         const days = parseInt((ms / (1000 * 60 * 60 * 24)) % 24, 10);
         
         checkForAlarmUser(data.username);
       
         for (let i = 0; i < alarmUsers.length; i++) {
            if (data.username === alarmUsers[i].name) {
               clearTimeout(alarmUsers[i].currentAlarm); // override previous timeout for user
               clearInterval(alarmUsers[i].currentSpam); // stops any current spam
               clearTimeout(alarmUsers[i].stopSpam); // clears any current spam timeout
               chat(data.username + ": I will spam whisper you in (*" + days + "*d *" 
                    + hours + "*h *" + mins + "*m *" + seconds + "*s) AlizeeOP");
               
               alarmUsers[i].currentAlarm = setTimeout(function(){ // sets new timeout
            
                  alarmUsers[i].currentSpam = setInterval(function() { // start spam after timeout
                     pm(alarmUsers[i].name, "YOUR ALARM FOR (*" + days + "*d *" + hours + "*h *"
                        + mins + "*m *" + seconds + "*s) IS OVER AlizeeREE " 
                        + "Type `STOP` to turn off. (Automatically stops after 1 min)");
                  }, 1000);
                  
                  alarmUsers[i].stopSpam = setTimeout(function() { // start timeout to stop spam
                     clearInterval(alarmUsers[i].currentSpam);
                  }, 60000);
              
               }, ms);
            }
         }
      } else {
         chat("Invalid input. Duration must be between 1 second and 1 week AlizeeFail");
      }
   }
}

socket.on("pm", (data) => {
   if (data.username.toLowerCase() === botname) {
      return;
   }
   if (data.msg.toLowerCase().indexOf("stop") !== -1) {
      for (let i = 0; i < alarmUsers.length; i++) {
         if (data.username === alarmUsers[i].name) { // finds name
            if (alarmUsers[i].currentSpam !== null) { // if currently spamming
               clearInterval(alarmUsers[i].currentSpam); // stop spamming
            }
         }
      }
   }
});

function checkForAlarmUser(user) {
   for (let i = 0; i < alarmUsers.length; i++) {
      if (user === alarmUsers[i].name) {
         return;
      }
   }
   alarmUsers.push({"name": user, "currentTimeout": null, "currentSpam": null, "stopSpam": null});
}

// ****************************** TWITCH STUFF ******************************
// Checks every 90 sec if any of the streamers are live then queues live ones
// **************************************************************************
const streamers = [{"name": "RajjPatel", "live": false}, 
   {"name": "Trainwreckstv", "live": false}, 
   {"name": "xQcOW", "live": false}, 
   {"name": "Sodapoppin", "live": false}, 
   {"name": "Reckful", "live": false}, 
   {"name": "Greekgodx", "live": false},
   {"name": "TriHardGodCx", "live": false}];

setInterval(function() {
   for (let i = 0; i < streamers.length; i++) {
      axios.get("https://api.twitch.tv/kraken/streams/" + streamers[i].name + 
                "?client_id=" + config.twitchKey)
      .then(function(response) {
         if (response.data.stream !== null && !streamers[i].live) {
            streamers[i].live = true;
            chat("Queued up " + streamers[i].name + "! alizBae");
            socket.emit("queue", {
               id: streamers[i].name.toLowerCase(),
               pos: "end",
               type: "tw"
            });
         } else if (streamers[i].live && response.data.stream === null) {
            streamers[i].live = false;
         }
      });
   }
}, 90000);

// **************************************** TRIVIA ****************************************
// Plays trivia games with the user. Users type !trivia to begin round. The user may skip 
// to the next question (lose 50 pts) or win by typing the correct answer. (earn 100 pts)
// When user gets the right answer, round ends and new question is generated for next round
// **************************************************************************************** 
const trivia = {
   playGame: false,
   questionNum: 0,
   currentQuestion: "",
   currentAnswer: "",
   questionsLength: 0,
   players: new Map()
};

function playTrivia(data) {
   if (data.msg.indexOf("!trivia") !== -1) {
      if (trivia.playGame) {
         chat("Current question: " + trivia.currentQuestion + " (!skip deducts 75 points)");
      } else {
         trivia.playGame = true;
         getQuestion();
      } 
   } else if (trivia.playGame && (data.msg.indexOf(trivia.currentAnswer) !== -1 || 
              data.msg.indexOf("!skip") !== -1)) {
      checkForPlayer(data.username);
      trivia.questionNum++;
      if (trivia.questionNum === trivia.questionsLength) {
         trivia.questionNum = 0;
      }
      if (data.msg.indexOf(trivia.currentAnswer) !== -1) {
         adjustPoints(data.username, 100);
         chat(data.username + " answered correctly and earned 100 points!");
         trivia.playGame = false;
      } else if (data.msg.indexOf("!skip") !== -1) {
         adjustPoints(data.username, -75);
         chat(data.username + " skipped current question and lost 75 points.");
         getQuestion();
      }
   }
}

function getQuestion() {
   axios.get("https://pastebin.com/raw/epvEFdgD")
   .then(function(response) {
      trivia.currentQuestion = response.data.questions[trivia.questionNum].q;
      trivia.currentAnswer = response.data.questions[trivia.questionNum].a;
      trivia.questionsLength = response.data.questions.length;
      chat(trivia.currentQuestion + " AlizeeHmm (100 pts if correct, -75 pts if skipped)");
   });
}

// adds user to players array if they are not in it yet
function checkForPlayer(currentPlayer) {
   if (!trivia.players.has(currentPlayer)) {
      trivia.players.set(currentPlayer, 0);
   }
}

function adjustPoints(currentPlayer, pointAdjustment) {
   let newScore = trivia.players.get(currentPlayer) + pointAdjustment;
   if (newScore < 0) {
      newScore = 0;
   }
   trivia.players.set(currentPlayer, newScore);
}

function points(data) {
   if (data.msg.indexOf("!points") !== -1) {
      const keys = trivia.players.keys();
      if (trivia.players.size > 0) {
         let scoreboard = "Trivia Points - ";
         let key = keys.next().value;
         while (key !== undefined) {
            scoreboard += key + ": " + trivia.players.get(key) + " pts. ";
            key = keys.next().value;
         }
         chat(scoreboard);
      } else {
         chat("Trivia scoreboard is empty. Type !trivia to play AlizeeOui2");
      }
   }
}

// *********** CONVERT METRIC/IMPERIAL ***********
// Converts quantities between metric and imperial
// ***********************************************
const conversions = [{"metric": "cm", "imperial": "in"},
   {"metric": "m", "imperial": "ft"},
   {"metric": "km", "imperial": "mi"},
   {"metric": "g", "imperial": "oz"},
   {"metric": "kg", "imperial": "lb"},
   {"metric": "ml", "imperial": "fl-oz"},
   {"metric": "l", "imperial": "gal"},
   {"metric": "C", "imperial": "F"}];
   
function convertUnits(data) {
   if (data.msg.startsWith("!convert ")) {
      const tokens = data.msg.split(/\s+/g);
      const amount = tokens[1];
      const unit = tokens[2];
      if (tokens.length >= 3 && !isNaN(amount)) {
         for (let i = 0; i < conversions.length; i++) { // traverse through conversions array
            for (let j = 0; j < 2; j++) { // traverse through the 2 units in each element in array
               // unitInObject = the jth key in the ith element of the conversions array
               let unitInObject = conversions[i][Object.keys(conversions[i])[j]];
               let otherUnit = conversions[i][Object.keys(conversions[i])[Math.abs(j-1)]];
               if (unit.toUpperCase() === unitInObject.toUpperCase()) {
                  if (otherUnit === "in") {
                     let inches = convert(amount).from(unitInObject).to(otherUnit).toFixed(2);
                     const feet = parseInt(inches / 12, 10);
                     if (feet === 0) {
                        chat(inches + " in");
                     } else {
                        inches = (inches % 12).toFixed(1);
                        chat(feet + "ft " + inches + " in");
                     }
                  } else {
                     chat(convert(amount).from(unitInObject).to(otherUnit).toFixed(2) + 
                          " " + otherUnit);
                  }
                  return;
               }
            }             
         }
      }
      chat("Invalid input. Format as one number followed by one valid unit keyword " +
           "listed under `!units` AlizeeNo");
   } 
}

function units(data) {
   if (data.msg.startsWith("!units")) {
      let unitList = "Valid units: " + conversions[0].metric + ", " + conversions[0].imperial;
      for (let i = 1; i < conversions.length; i++) {
         unitList += ", " + conversions[i].metric + ", " + conversions[i].imperial; 
      }
      chat(unitList);
   }
}

// ********** DEFINE **********
// Gives definitions of a word.
// ****************************
function define(data) {
   if (data.msg.startsWith("!define ")) {
      cooldown(define, 7000);
      const term = data.msg.substring(8).trim(); // trimmed cuz white space interferes with get req
      if (encodeURI(term) === "alizee" || encodeURI(term) === "aliz%C3%A9e") {
         chat("*alizee* - 1. perfection/br/ 2. unbelievably beautiful and sexy French Goddess");
      } else {
         axios.get('https://od-api.oxforddictionaries.com/api/v1/entries/en/' + encodeURI(term), {
            headers: {
               "Accept": "application/json",
               "app_id": config.dictionary.app_id,
               "app_key": config.dictionary.app_key
            }
         })
         .then(function (response) {
            let msg = "*" + response.data.results[0].id + "* -"; // msg begins with the word
            const defs = response.data.results[0].lexicalEntries[0].entries[0].senses; // defs array
            for (let i = 0; i < Math.min(3, defs.length); i++) { // adds maximum 3 defs to msg
               if (defs[i].short_definitions !== undefined) { // if short def exists
                  msg += " " + (i + 1) + ". " + defs[i].short_definitions[0] + "/br/";
               } else {
                  msg += " " + (i + 1) + ". " + defs[i].definitions[0] + "/br/";
               }
            }
            chat(msg);
         })
         .catch(function(error) { // error message if word can't be found.
            if (error.response !== undefined && error.response.status === 404) {
               chat("I can't define that AlizeeFail");
            } else {
               console.log(error);
            }
         });
      }
   }
}
