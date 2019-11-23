// ************ CASINO ************
// GAMBAAAAAAAAAAAAAAAAAAAAAAAAAAAA
// ********************************
 
const points = require('./pointsdata');
const bot = require('./bot');
const callbacks = require('./callbacks');
const BlackjackGame = require('./bot-utils/blackjack').BlackjackGame;
 
// maps usernames to blackjack games
const games = {};

// Called to indicate that the user is actively playing. Resets the stop-game timeout
function activity(username) {
   clearTimeout(games[username].timeout);
   
   games[username].timeout = setTimeout(function() {
      let game = games[username].game;
      game.surrender();
      let ptAdjust = Math.round(game.getPointMultiplier() * game.getBet());
      bot.chat(`${username}: You haven't hit or stayed for 3 minutes. The game has been cancelled and you`
               + ` have lost half your deposit (${Math.abs(ptAdjust)} ${points.CURRENCY}) AlizeeSleeper`);
      points.adjustPoints(username, ptAdjust);
      removeGame(username);
   }, 180000);
}

// Ends the given user's game
function removeGame(username) {
   if (username in games) {
      clearTimeout(games[username].timeout);
      delete games[username];
   }
}

// Returns a summary of the given blackjack game in string format
function summary(game) {
   let playerHand = game.getPlayerHand();
   let dealerHand = game.getDealerHand();
   
   let message = `My face-up card is ${dealerHand[1]}.`;
   if (playerHand.length === 0) {
      message += " Your hand is currently empty.";
   } else {
      message += ` Your hand is ${playerHand[0]}`;
      for (let i = 1; i < playerHand.length; i++) {
         message += `, ${playerHand[i]}`;
      }
   }
   let playerLow = game.getPlayerLow();
   let playerHigh = game.getPlayerHigh();
   message += " (your total: " + ((playerLow === playerHigh) ? 
               playerLow : `${playerLow}/${playerHigh}`) + ")";
   message += " Type `!hit` to go agane, `!stay` to end turn, or `!surrender` (lose half your bet)";
   return message;
}

// Ends the given game with either a victory, tie, or loss (for the player)
// Initial message: A summary will be appended to this given string
function finishGame(game, initialMessage) {
   if (!game.isOver()) {
      throw new Error("Game was not properly ended");
   }
   let playerHand = game.getPlayerHand();
   let dealerHand = game.getDealerHand();
   
   let message = `${initialMessage} I drew the ${dealerHand[0]}`;
   for (let i = 1; i < dealerHand.length; i++) {
      message += `, ${dealerHand[i]}`;
   }
   message += ` (my total: ${game.getDealerHigh()}, your total: ${game.getPlayerHigh()})`;
   
   let pointMultiplier = game.getPointMultiplier();
   let adjust = Math.round(game.getBet() * pointMultiplier);
   if (pointMultiplier > 0) {
      bot.chat(`${message} Congratulations, you won ${adjust} ${points.CURRENCY}! AlizeePog`);
   } else if (pointMultiplier < 0) {
      let loss = Math.abs(adjust);
      bot.chat(`${message} Sorry, you lost ${loss} ${points.CURRENCY} AlizeeSad`);
   } else { // point multiplier is 0
      bot.chat(`${message} It's a tie! AlizeeOP`);
   }
   points.adjustPoints(game.getPlayerName(), adjust);
   removeGame(game.getPlayerName());
}
 
module.exports = {
   blackjackInfo: function(data) {
      if (data.msg.trim() === "!blackjack") {
         if (data.username in games) {
            let game = games[data.username].game;
            bot.chat(data.username + ": " + summary(game));
         } else {
            bot.chat("Play me in a game of blackjack by typing `!blackjack [amount]`. If you "
                     + "win, you earn that amount. If you lose, I yoink it AlizeeGamba");
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
         bot.chat(`${data.username}: You don't have enough ${points.CURRENCY} AlizeesGame`);
         } else {
            const game = new BlackjackGame(data.username, amount);
            games[data.username] = {"game": game, "timeout": null};
            activity(data.username);
            let playerHand = game.startGame();
            let message = `${data.username}: You got a ${playerHand[0]} and ${playerHand[1]}`;
            
            if (game.isOver()) { // got 21 right away
               message += " (blackjack)/br//br/";
               finishGame(game, message);
            } else {
               bot.chat(message + "/br//br/" + summary(game));
            }
         }
      }
   },
   
   // If the user is currently playing, listens for commands (i.e. !hit, !stay, ace choice)
   playBlackjack: function(data) {
      if (data.username in games) {
         let game = games[data.username].game;
  
         if (data.msg.trim() === "!stay") {
            game.stay();
            finishGame(game, `${data.username}:`);
         } else if (data.msg.trim() === "!hit") {
            activity(data.username);
            let card = game.hit();
            let message = `${data.username}: you got a ${card}./br//br/`;
            if (game.isOver()) { // busted
               message += `You now have a total of ${game.getPlayerHigh()}.`;
               finishGame(game, message);
            } else {
               message += summary(game);
               bot.chat(message);
            }
         } else if (data.msg.trim() === "!surrender") {
            game.surrender();
            let message = data.username + ": you have surrendered.";
            finishGame(game, message);
         }
      }             
   },
   
   // Simple roll gambling
   gamble: function(data) {
      if (data.tokens[0] === "!gamble") {
         const maxBet = 200;
         if (data.tokens.length < 2) {
            bot.chat("Type `!gamble [amount]` (" + maxBet + " max per game) AlizeeGamba");
            return;
         }
         let amount = parseInt(data.tokens[1]);
         if (isNaN(amount) || amount < 1 || amount > maxBet) {
            bot.chat("Please gamble an amount between 1 and " + maxBet + " AlizeeGamba");
            return
         }
         if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat("You do not have enough ${points.CURRENCY} to gamble AlizeesGame");
            return;
         }
         const roll = Math.floor(Math.random() * 100 + 1);
         if (roll > 50) {
            points.adjustPoints(data.username, amount);
            bot.chat(`${data.username}: you rolled ${roll} and won ${amount} ${points.CURRENCY}.`
                     + ` You now have ${points.getPoints(data.username)} ${points.CURRENCY} AlizeePog`);
         } else {
            points.adjustPoints(data.username, -amount);
            bot.chat(`${data.username}: you rolled ${roll} and lost ${amount} ${points.CURRENCY}.`
                     + ` You now have ${points.getPoints(data.username)} ${points.CURRENCY} AlizeeSad`);
         }
      }
   }
}
 
callbacks.addChatEvents(module.exports);