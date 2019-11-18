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
   this.firstDrawsComplete = false;
}

// Returns a summary of the current game in string format
Game.prototype.summary = function() {
   if (!this.firstDrawsComplete) 
      throw "firstDraws should be completed before requesting summary";
  
   let message = "My face-up card is " + this.dealerCards[1].name + 
                  this.dealerCards[1].suit + ".";
   if (this.playerCards.length === 0) {
      message += " Your hand is currently empty.";
   } else {
      message += " Your hand is " + this.playerCards[0].name + this.playerCards[0].suit;
      for (let i = 1; i < this.playerCards.length; i++) {
         message += ", " + this.playerCards[i].name + this.playerCards[i].suit;
      }
   }
   message += " (your total: " + this.playerPoints + ")";
   if (this.currentAce != null) {
      message += " Type `1` or `11` to choose your ace value. "; 
   } else {
      message += " Type `!hit` to request another card or `!stay` to stop.";
   }
   return message;
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

// Simulates the first draws of the game: dealer gives two cards to the player
// and draws two cards for themselves (one facing up)
Game.prototype.firstDraws = function() {
   let firstCard = this.deck.drawCard();
   let secondCard = this.deck.drawCard();
   this.dealerCards.push(this.deck.drawCard(), this.deck.drawCard());
   
   let message = this.playerName;
   
   if (firstCard.name === "A" && secondCard.name === "A") {
      message += ": You got two aces for your first two cards (The first is valued at 1).";
      this.playerCards.push(firstCard);
      this.currentAce = secondCard;
   } else if (firstCard.name === "A") {
      message += ": You got a " + secondCard.name + secondCard.suit + " and an Ace."
      this.playerCards.push(secondCard);
      this.currentAce = firstCard;
   } else if (secondCard.name === "A") {
      message += ": You got a " + firstCard.name + firstCard.suit + " and an Ace.";
      this.playerCards.push(firstCard);
      this.currentAce = secondCard;  
   } else {
      message += ": You got a " + firstCard.name + firstCard.suit + " and a "
                 + secondCard.name + secondCard.suit + ".";
      this.playerCards.push(firstCard,secondCard);
   }
   this.firstDrawsComplete = true;
   this.updatePlayerPoints();
   calculateInitialDealerPoints(this);
   message += "/br//br/" + this.summary();
   bot.chat(message);
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
   if (!this.firstDrawsComplete) 
      throw "firstDraws should be completed before doing a hit";
   
   this.playerCards.push(card);
   if (card.name === "A") this.currentAce = null;
   this.updatePlayerPoints();
   
   let message = this.playerName + ": you got a " + card.name + card.suit + ". ";
   
   if (this.playerPoints > 21) { // attempt to turn an 11 ace into a 1
      let reducedAce = reduceAce(this.playerCards);
      if (reducedAce) {
         this.updatePlayerPoints();
         message += "Since you busted, your A" + reducedAce.suit +
                    "'s value went down to 1.";
      }
   }
   message += "/br//br/";
   
   if (this.playerPoints < 21) { // continue playing
      message += this.summary();
      this.activity();
      bot.chat(message);
   } else { // player's turns are over
      message += " You now have a total of " + this.playerPoints + ".";
      this.dealerFinish(message);
   }
}
 
// Called when the player stays. Dealer will draw cards until they reach a score >= 17
// initial message is a string that will precede the final game summary
Game.prototype.dealerFinish = function(initialMessage) {
   if (!this.firstDrawsComplete) {
      throw "firstDraws should be completed before a game is finished";
   }
   if (this.playerPoints > 21) { // player loses automatically if they bust
      endGame(this, initialMessage, -1);
      return;
   }
   while (this.dealerPoints < 17) {
      let card = this.deck.drawCard();
      if (card.name === "A") {
         card.value = (this.dealerPoints + 11 <= 21) ? 11 : 1;
      }
      this.dealerCards.push(card);
      this.updateDealerPoints();
      if ((this.dealerPoints === 17 || this.dealerPoints > 21) && reduceAce(this.dealerCards)) {
         this.updateDealerPoints();
      }
   }
   if (this.dealerPoints > 21 || this.dealerPoints < this.playerPoints) {
      endGame(this, initialMessage, 1);
   } else if (this.dealerPoints === this.playerPoints) {
      endGame(this, initialMessage, 0);
   } else {
      endGame(this, initialMessage, -1);
   }
}

// Calculates and sets the dealer's initial points in the given game. Their initial 
// points are the points they got from the first two cards they drew.
function calculateInitialDealerPoints(game) {
   let firstCard = game.dealerCards[0];
   let secondCard = game.dealerCards[1];
   if (firstCard.name === "A" && secondCard.name === "A") {
      firstCard.value = 1;
      secondCard.value = 11;
   } else if (firstCard.name === "A") {
      firstCard.value = (secondCard.value === 6) ? 1 : 11;
   } else if (secondCard.name === "A") {
      secondCard.value = (firstCard.value === 6) ? 1 : 11;
   }
   return game.updateDealerPoints();
}
 
// Ends the given game with either a victory, tie, or loss (for the player)
//
// Initial message: A summary will be appended to this given string
// Point multiplier: the multiplier for the user's points. This will be used
// to determine how much the user gained/lost
function endGame(game, initialMessage, pointMultiplier) {
   let message = initialMessage + " I drew the " + game.dealerCards[0].name +
                 game.dealerCards[0].suit;
   for (let i = 1; i < game.dealerCards.length; i++) {
      message += ", " + game.dealerCards[i].name + game.dealerCards[i].suit;
   }
   message += " (my total: " + game.dealerPoints + ", your total: " + game.playerPoints + ")";
   
   if (pointMultiplier === 1) {
      bot.chat(message + " Congratulations, you won " + game.bet + " pts! AlizeePog");
   } else if (pointMultiplier === -1) {
      bot.chat(message + " Sorry, you lost " + game.bet + " pts! AlizeeSad");
   } else { // point multiplier is 0
      bot.chat(message + " It's a tie! AlizeeOP");
   }
   points.adjustPoints(game.playerName, pointMultiplier * game.bet);
   clearTimeout(game.timeout);
   games.delete(game.playerName);
}

// finds the first ace of value 11 in the given hand of cards, reduces it to 1, then returns it
// returns null if none found
function reduceAce(cards) {
   for (let i = 0; i < cards.length; i++) {
      if (cards[i].name === "A" && cards[i].value === 11) {
         cards[i].value = 1;
         return cards[i];
      }
   }
   return null;
}
 
// Represents a 52 card deck
function Deck() {
   this.cards = [];
   this.totalValue = 340;
 
   let suits = ["♠", "♥", "♦", "♣"];
   
   for (let i = 0; i < 4; i++) {
      for (let j = 2; j <= 10; j++) {
         this.cards.push({"suit": suits[i], "name": j, "value": j});
      }
      this.cards.push({"suit": suits[i], "name": "A", "value": 1});
      this.cards.push({"suit": suits[i], "name": "K", "value": 10});
      this.cards.push({"suit": suits[i], "name": "Q", "value": 10});
      this.cards.push({"suit": suits[i], "name": "J", "value": 10});
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
   blackjackInfo: function(data) {
      if (data.msg.trim() === "!blackjack") {
         if (games.has(data.username)) {
            let game = games.get(data.username);
            bot.chat(data.username + ": " + game.summary());
         } else {
            bot.chat("Play me in a game of blackjack by typing `!blackjack [amount]`. If you "
                     + "win, you earn that amount. If you lose, I yoink it AlizeeTriHard");
         } 
      }
   },
   
   startBlackjack: function(data) { // Chat command - Starts a game of blackjack
      if (data.tokens[0] === "!blackjack" && data.tokens.length > 1) {
         if (games.has(data.username)) {
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
            } else if (data.msg.trim() === "11") {
               game.currentAce.value = 11;
               game.hit(game.currentAce);
            } else if (data.msg.trim() === "!stay" || data.msg.trim() === "!hit") {
               bot.chat(data.username + ": Type `1` or `11` to choose your ace value."); 
            }
         }
         else if (game.hitting) {
            if (data.msg.trim() === "!stay") {
               game.hitting = false;
               game.dealerFinish(data.username + ":");
            } else if (data.msg.trim() === "!hit") {
               let card = game.deck.drawCard();
               if (card.name === "A") {
                  game.activity();
                  game.currentAce = card;
                  let message = data.username + ": you got an A" + card.suit +
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