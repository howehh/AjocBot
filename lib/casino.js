// ************ CASINO ************
// GAMBAAAAAAAAAAAAAAAAAAAAAAAAAAAA
// ********************************
 
const points = require('./pointsdata');
const bot = require('./bot');
const callbacks = require('./callbacks');
const Game = require('./bot-utils/blackjack').Game;
 
// maps usernames to blackjack games
const games = {};

// Called to indicate that the user is actively playing. Resets the stop-game timeout
function activity(username) {
   clearTimeout(games[username].timeout);
   
   games[username].timeout = setTimeout(function() {
      let half = Math.ceil(games[username].game.bet / 2.0);
      bot.chat(username + ": You haven't hit or stayed for 3 minutes. The game has been " +
               "cancelled and you have lost half your deposit (" + half + " pts) AlizeeStare");
      points.adjustPoints(username, -half);
      endGame(username);
   }, 180000);
}

// Ends the given user's game
function endGame(username) {
   if (username in games) {
      clearTimeout(games[username].timeout);
      delete games[username];
   }
}
 
module.exports = {
   blackjackInfo: function(data) {
      if (data.msg.trim() === "!blackjack") {
         if (data.username in games) {
            let game = games[data.username].game;
            bot.chat(data.username + ": " + game.summary());
         } else {
            bot.chat("Play me in a game of blackjack by typing `!blackjack [amount]`. If you "
                     + "win, you earn that amount. If you lose, I yoink it AlizeeTriHard");
         } 
      }
   },
   
   startBlackjack: function(data) { // Chat command - Starts a game of blackjack
      if (data.tokens[0] === "!blackjack" && data.tokens.length > 1) {
         if (data.username in games) {
            bot.chat("A game is already in session. Type `!blackjack` to see the current hands");
            return;
         }
         let amount = parseInt(data.tokens[1]);
         if (isNaN(amount) || amount < 1 || amount > 500) {
            bot.chat(data.username + ": Type `!blackjack [gamble amount]` (max 500 per game)");
         } else if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat(data.username + ": You don't have enough points to gamble that much AlizeesGame");
         } else {
            const game = new Game(data.username, amount);
            games[data.username] = {"game": game, "timeout": null};
            activity(data.username);
            game.startGame();
         }
      }
   },
   
   // If the user is currently playing, listens for commands (i.e. !hit, !stay, ace choice)
   playBlackjack: function(data) {
      if (data.username in games) {
         let game = games[data.username].game;
         
         if (game.currentAce !== null) { // wait for them to call a value for ace
            let val;
            if (data.msg.trim() === "1") {
               val = 1;
            } else if (data.msg.trim() === "11") {
               val = 11;
            } else if (data.msg.trim() === "!stay" || data.msg.trim() === "!hit") {
               bot.chat(data.username + ": Type `1` or `11` to choose your ace value."); 
            }
            if (val !== undefined) {
               activity(data.username);
               game.currentAce.value = val;
               if (!game.hit(game.currentAce)) {
                  endGame(game.playerName);
               }
            }
         }
         else if (data.msg.trim() === "!stay") {
            game.dealerFinish(data.username + ":");
            endGame(game.playerName);
         } else if (data.msg.trim() === "!hit") {
            activity(data.username);
            let card = game.deck.drawCard();
            if (card.name === "A") {
               game.currentAce = card;
               bot.chat(data.username + ": you got an A" + card.suit +
                        ". Type either `1` or `11` to choose your value");
            } else if (!game.hit(card)) {
               endGame(game.playerName);
            }
         }
      }             
   },
   
   // Simple roll gambling
   gamble: function(data) {
      if (data.tokens[0] === "!gamble") {
         const maxBet = 200;
         if (data.tokens.length < 2) {
            bot.chat("Type `!gamble [amount]` (" + maxBet + " max per game)");
            return;
         }
         let amount = parseInt(data.tokens[1]);
         if (isNaN(amount) || amount < 1 || amount > maxBet) {
            bot.chat("Please gamble an amount between 1 and " + maxBet + " AlizeeOui");
            return
         }
         if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat("You do not have enough points to gamble AlizeesGame");
            return;
         }
         const roll = Math.floor(Math.pow(Math.random(), 1.2) * 100 + 1);
         if (roll > 50) {
            points.adjustPoints(data.username, amount);
            bot.chat(data.username + ": you rolled " + roll + " and won " + amount
                     + " point(s). You now have " + points.getPoints(data.username) + " pts AlizeePog");
         } else {
            points.adjustPoints(data.username, -amount);
            bot.chat(data.username + ": you rolled " + roll + " and lost " + amount
                     + " point(s). You now have " + points.getPoints(data.username) + " pts AlizeeSad");
         }
      }
   }
}
 
callbacks.addChatEvents(module.exports);