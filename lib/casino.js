// ************ CASINO ************
// GAMBAAAAAAAAAAAAAAAAAAAAAAAAAAAA
// ********************************
 
const points = require('./pointsdata');
const bot = require('./bot');
const callbacks = require('./callbacks');
 
// maps usernames to blackjack games
const games = new Map();
 
// Represents a blackjack game for a given player
// username = the player
// bet = what they wagered
function Game(username, bet) {
   this.playerName = username;
   this.bet = bet;
   
   this.activity();
   
   this.deck = new Deck();
   this.dealerCards = []; // first is hidden
   this.playerCards = [];
   
   this.dealerPoints = 0;
   this.playerPoints = 0;
   
   this.hitting = true;
   this.currentAce = null;
}
 
// Ends the game with either a victory, tie, or loss (for the player)
//
// Initial message: A summary will be appended to this given string
// Point multiplier: the multiplier for the user's points. This will be used
// to determine how much the user gained/lost
Game.prototype.endGame = function(initialMessage, pointMultiplier) {
   let message = initialMessage + " I drew the " + this.dealerCards[0].name + " of " +
                 this.dealerCards[0].suit;
   for (let i = 1; i < this.dealerCards.length; i++) {
      message += ", " + this.dealerCards[i].name + " of " + this.dealerCards[i].suit;
   }
   message += " (my total: " + this.dealerPoints + ", your total: " + this.playerPoints + ")";
   
   if (pointMultiplier === 1) {
      bot.chat(message + " Congratulations, you won " + this.bet + " pts! AlizeePog");
   } else if (pointMultiplier === -1) {
      bot.chat(message + " Sorry, you lost " + this.bet + " pts! AlizeeSad");
   } else { // point multiplier is 0
      bot.chat(message + " It's a tie! AlizeeOP");
   }
   points.adjustPoints(this.playerName, pointMultiplier * this.bet);
   clearTimeout(this.timeout);
   games.delete(this.playerName);
}
 
// Called to indicate that the user is actively playing. Resets the stop-game timeout
Game.prototype.activity = function() {
   clearTimeout(this.timeout);
   this.timeout = createTimeout(this);
}
 
// Returns a timeout to stop the given game
function createTimeout(game) {
   return setTimeout(function() {
      let half = Math.ceil(game.bet / 2.0);
      bot.chat(game.playerName + ": You haven't hit or stayed for 3 minutes. The game has been " +
               "cancelled and you have lost half your deposit (" + half + " pts) AlizeeStare");
      points.adjustPoints(game.playerName, -half);
      games.delete(game.playerName);
   }, 180000);
}
 
// Calculates and sets the dealer's initial points. Their initial points are
// the points they got from the first two cards they drew.
Game.prototype.calculateInitialDealerPoints = function() {
   let firstCard = this.dealerCards[0];
   let secondCard = this.dealerCards[1];
   if (firstCard.name === "ace" && secondCard.name === "ace") {
      firstCard.value = 1;
      secondCard.value = 11;
   } else if (firstCard.name === "ace") {
      firstCard.value = (secondCard.value === 6) ? 1 : 11;
   } else if (secondCard.name === "ace") {
      secondCard.value = (firstCard.value === 6) ? 1 : 11;
   }
   return this.updateDealerPoints();
}
 
Game.prototype.updateDealerPoints = function() {
   this.dealerPoints = this.dealerCards.reduce((total, obj) => {
      return total + obj.value;
   }, 0);
   return this.dealerPoints;
}
 
Game.prototype.updatePlayerPoints = function() {
   this.playerPoints = this.playerCards.reduce((total, obj) => {
      return total + obj.value;
   }, 0);
   return this.playerPoints;
}
 
// Called when a player hits (param card = the card they got from the hit)
Game.prototype.hit = function(card) {
   this.playerCards.push(card);
   let message = this.playerName + ": you got a " + card.name + " of " + card.suit + ".";
   this.updatePlayerPoints();
   
   if (this.playerPoints > 21) { // attempt to turn an 11 ace into a 1
      for (let i = 0; i < this.playerCards.length; i++) {
         if (this.playerCards[i].name === "ace" && this.playerCards[i].value === 11) {
            this.playerCards[i].value = 1;
            this.updatePlayerPoints();
            message += " Since you busted, your ace of " + this.playerCards[i].suit +
                       "'s value went down to 1.";
            break;
         }
      }
   }
   message += " You now have a total of " + this.playerPoints + ".";
 
   if (this.playerPoints === 21) {
      if (this.dealerPoints === 21) {
         this.endGame(message, 0); // tie
      } else {
         this.endGame(message, 1); // won
      }
   } else if (this.playerPoints > 21) {
      this.endGame(message, -1);
   } else { // continue playing
      message += " Type `!hit` or `!stay`";
      this.activity();
      bot.chat(message);
   }
}
 
// Called when the player stays. Dealer will draw cards until they reach a score >= 17
Game.prototype.dealerFinish = function() {
   while (this.dealerPoints < 17) {
      let card = this.deck.drawCard();
      if (card.name === "ace") {
         if (this.dealerPoints + 11 <= 21) {
            card.value = 11;
         } else {
            card.value = 1;
         }
      }
      this.dealerCards.push(card);
      this.updateDealerPoints();
      if (this.dealerPoints === 17 || this.dealerPoints > 21) { // if bust or soft 17
         // find the first ace with value 11 then reduce it to 1
         for (let i = 0; i < this.dealerCards.length; i++) {
            if (this.dealerCards[i].name === "ace" && this.dealerCards[i].value === 11) {
               this.dealerCards[i].value = 1;
               this.updateDealerPoints();
               break;
            }
         }
      }
   }
   if (this.dealerPoints > 21 || this.dealerPoints < this.playerPoints) {
      this.endGame(this.playerName + ":", 1);
   } else if (this.dealerPoints === this.playerPoints) {
      this.endGame(this.playerName + ":", 0);
   } else {
      this.endGame(this.playerName + ":", -1);
   }
}
 
// Simulates the first draws of the game: dealer gives two cards to the player
// and draws two cards for themselves (one facing up)
Game.prototype.firstDraws = function() {
   let firstCard = this.deck.drawCard();
   let secondCard = this.deck.drawCard();
   
   this.dealerCards.push(this.deck.drawCard(), this.deck.drawCard());
   
   let message = this.playerName + ": My face-up card from my first two cards is " +
                 this.dealerCards[1].name + " of " + this.dealerCards[1].suit + ".";
   
   if (firstCard.name === "ace" && secondCard.name === "ace") {
      message += " You got two aces for your first two cards. Type `1` or `11` to choose" +
               " the value of your second ace (the first is 1)";
      this.playerCards.push(firstCard);
      this.currentAce = secondCard;
   }
   
   else if (firstCard.name === "ace") {
      message += " You got a " + secondCard.name + " of " + secondCard.suit + " and an ace."
               + " Type `1` or `11` to choose the value of the ace.";
      this.playerCards.push(secondCard);
      this.currentAce = firstCard;
   }
   
   else if (secondCard.name === "ace") {
      message += " You got a " + firstCard.name + " of " + firstCard.suit + " and an ace."
               + " Type `1` or `11` to choose the value of the ace.";
      this.playerCards.push(firstCard);
      this.currentAce = secondCard;
      
   } else {
      message += " You got a " + firstCard.name + " of " + firstCard.suit + " and a "
                 + secondCard.name + " of " + secondCard.suit + ". Type `!hit` or `!stay`";
      this.playerCards.push(firstCard,secondCard);
   }
   this.updatePlayerPoints();
   this.calculateInitialDealerPoints();
   bot.chat(message);
}
 
// Represents a 52 card deck
function Deck() {
   this.cards = [];
   this.totalValue = 340;
 
   let suits = ["spades", "hearts", "diamonds", "clubs"];
   
   for (let i = 0; i < 4; i++) {
      for (let j = 2; j <= 10; j++) {
         this.cards.push({"suit": suits[i], "name": j, "value": j});
      }
   }
   for (let i = 0; i < 4; i++) {
      this.cards.push({"suit": suits[i], "name": "ace", "value": 1});
      this.cards.push({"suit": suits[i], "name": "king", "value": 10});
      this.cards.push({"suit": suits[i], "name": "queen", "value": 10});
      this.cards.push({"suit": suits[i], "name": "jack", "value": 10});
   }
}
 
// Removes a random card from the remaining cards in the deck and returns it
Deck.prototype.drawCard = function() {
   let roll = Math.floor(Math.random() * this.cards.length);
   let card = this.cards[roll];
   this.cards.splice(roll, 1);
   return card;
}
 
module.exports = {
   // Chat command - Starts a game of blackjack
   startBlackjack: function(data) {
      if (data.msg.trim() === "!blackjack") {
         if (games.has(data.username)) {
            let game = games.get(data.username);
            let message;
            if (game.currentAce != null) {
               message = data.username + ": Type `1` or `11` to choose your ace value. "; 
            } else {
               message = data.username + ": Type `!hit` to request another card or `!stay` to stop.";
            }
            message += " My face-up card is " + game.dealerCards[1].name + " of " + game.dealerCards[1].suit + ".";
            if (game.playerCards.length === 0) {
               message += " Your hand is empty.";
            } else {
               message += " Your hand is " + game.playerCards[0].name + " of " + game.playerCards[0].suit;
               for (let i = 1; i < game.playerCards.length; i++) {
                  message += ", " + game.playerCards[i].name + " of " + game.playerCards[i].suit;
               }
            }
            message += " (your total: " + game.playerPoints + ")"
            bot.chat(message);
         } else {
            bot.chat("Play me in a game of blackjack by typing `!blackjack [amount]`. If you "
                     + "win, you earn that amount. If you lose, I yoink it AlizeeTriHard");
         }
         
      } else if (data.tokens[0] === "!blackjack") {
         if (games.has(data.username)) {
            bot.chat("A game is already in session. Type `!blackjack` to see the current score");
            return;
         }
         let amount = parseInt(data.tokens[1]);
         if (isNaN(amount) || amount < 1 || amount > 500) {
            bot.chat(data.username + ": Type `!blackjack [gamble amount]` (max 500 per game)");
         } else if (!points.hasPoints(data.username) || points.getPoints(data.username) < amount) {
            bot.chat(data.username + ": You don't have enough points to gamble that much AlizeesGame");
         } else {
            const game = new Game(data.username, amount);
            games.set(data.username, game);
            game.firstDraws();
         }
      }
   },
   
   // If the user is currently playing, listens for commands (i.e. !hit, !stay, ace choice)
   playBlackjack: function(data) {
      if (games.has(data.username)) {
         let game = games.get(data.username);
         
         if (game.currentAce !== null) { // wait for them to call a value for ace
            if (data.msg.trim() === "1") {
               game.currentAce.value = 1;
               game.hit(game.currentAce);
               game.currentAce = null;
            } else if (data.msg.trim() === "11") {
               game.currentAce.value = 11;
               game.hit(game.currentAce);
               game.currentAce = null;
            } else if (data.msg.trim() === "!stay" || data.msg.trim() === "!hit") {
               bot.chat(data.username + ": Type `1` or `11` to choose your ace value."); 
            }
         }
         
         else if (game.hitting) {
            if (data.msg.trim() === "!stay") {
               game.hitting = false;
               game.dealerFinish();
            } else if (data.msg.trim() === "!hit") {
               let card = game.deck.drawCard();
               if (card.name === "ace") {
                  game.activity();
                  game.currentAce = card;
                  let message = data.username + ": you got an ace of " + card.suit +
                             ". Type either `1` or `11` to choose your value";
                  bot.chat(message);
               } else {
                  game.hit(card);
               }
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