const points = require('./../pointsdata');
const bot = require('./../bot');
const Deck = require('./deck').Deck;
 
// Represents a blackjack game for a given player
// username = the player
// bet = what they wagered
function Game(username, bet) {
   this.playerName = username;
   this.bet = bet;
   this.deck = new Deck();
   
   this.dealerCards = []; // first is hidden
   this.playerCards = [];
   this.dealerPoints = 0;
   this.playerPoints = 0;
   
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
   updatePlayerPoints.call(this);
   calculateInitialDealerPoints.call(this);
   message += "/br//br/" + this.summary();
   bot.chat(message);
}
 
function updateDealerPoints() {
   this.dealerPoints = this.dealerCards.reduce((total, obj) => {
      return total + obj.value;
   }, 0);
   return this.dealerPoints;
}
 
function updatePlayerPoints() {
   this.playerPoints = this.playerCards.reduce((total, obj) => {
      return total + obj.value;
   }, 0);
   return this.playerPoints;
}
 
// Called when a player hits (param card = the card they got from the hit)
// Returns true if the player can continue playing, false if they hit 21 or bust
Game.prototype.hit = function(card) {
   if (!this.firstDrawsComplete) 
      throw "firstDraws should be completed before doing a hit";
   
   this.playerCards.push(card);
   if (card.name === "A") this.currentAce = null;
   updatePlayerPoints.call(this);
   
   let message = this.playerName + ": you got a " + card.name + card.suit + ". ";
   
   if (this.playerPoints > 21) { // attempt to turn an 11 ace into a 1
      let reducedAce = reduceAce(this.playerCards);
      if (reducedAce) {
         updatePlayerPoints.call(this);
         message += "Since you busted, your A" + reducedAce.suit +
                    "'s value went down to 1.";
      }
   }
   message += "/br//br/";
   
   if (this.playerPoints < 21) { // continue playing
      message += this.summary();
      bot.chat(message);
      return true;
   } else { // player's turns are over
      message += " You now have a total of " + this.playerPoints + ".";
      this.dealerFinish(message);
      return false;
   }
}
 
// Called when the player stays. Dealer will draw cards until they reach a score >= 17
// initial message is a string that will precede the final game summary
Game.prototype.dealerFinish = function(initialMessage) {
   if (!this.firstDrawsComplete) {
      throw "firstDraws should be completed before a game is finished";
   }
   if (this.playerPoints > 21) { // player loses automatically if they bust
      endGame.call(this, initialMessage, -1);
      return;
   }
   while (this.dealerPoints < 17) {
      let card = this.deck.drawCard();
      if (card.name === "A") {
         card.value = (this.dealerPoints + 11 <= 21) ? 11 : 1;
      }
      this.dealerCards.push(card);
      updateDealerPoints.call(this);
      if ((this.dealerPoints === 17 || this.dealerPoints > 21) && reduceAce(this.dealerCards)) {
         updateDealerPoints.call(this);
      }
   }
   if (this.dealerPoints > 21 || this.dealerPoints < this.playerPoints) {
      endGame.call(this, initialMessage, 1);
   } else if (this.dealerPoints === this.playerPoints) {
      endGame.call(this, initialMessage, 0);
   } else {
      endGame.call(this, initialMessage, -1);
   }
}

// Calculates and sets the dealer's initial points in the given game. Their initial 
// points are the points they got from the first two cards they drew.
function calculateInitialDealerPoints() {
   let firstCard = this.dealerCards[0];
   let secondCard = this.dealerCards[1];
   if (firstCard.name === "A" && secondCard.name === "A") {
      firstCard.value = 1;
      secondCard.value = 11;
   } else if (firstCard.name === "A") {
      firstCard.value = (secondCard.value === 6) ? 1 : 11;
   } else if (secondCard.name === "A") {
      secondCard.value = (firstCard.value === 6) ? 1 : 11;
   }
   return updateDealerPoints.call(this);
}
 
// Ends the given game with either a victory, tie, or loss (for the player)
//
// Initial message: A summary will be appended to this given string
// Point multiplier: the multiplier for the user's points. This will be used
// to determine how much the user gained/lost
function endGame(initialMessage, pointMultiplier) {
   let message = initialMessage + " I drew the " + this.dealerCards[0].name +
                 this.dealerCards[0].suit;
   for (let i = 1; i < this.dealerCards.length; i++) {
      message += ", " + this.dealerCards[i].name + this.dealerCards[i].suit;
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

module.exports.Game = Game;