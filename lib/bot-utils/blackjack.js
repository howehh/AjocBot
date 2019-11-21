const points = require('./../pointsdata');
const bot = require('./../bot');
const Deck = require('./deck').Deck;
 
// Represents a blackjack game for a given player
// username = the player
// bet = what they wagered
class BlackjackGame {
   constructor(username, bet) {
      this.deck = new Deck();
      this.playerName = username;
      this.bet = bet;
      this.currentAce = null;
      this.gameStarted = false;
      this.dealerCards = [];
      this.playerCards = [];
      
      this.dealerLow = 0;
      this.dealerHigh = 0;
      
      this.playerLow = 0;
      this.playerHigh = 0;
   }
   
   getPlayerName() {
      return this.playerName;
   }
   
   getBet() {
      return this.bet;
   }
   
   // Get and return a new card from the game's deck
   drawNewCard() {
      return this.deck.drawCard();
   }
   
   // Returns a summary of the current game in string format
   summary() {
      if (!this.gameStarted) {
         throw new Error("startGame should be completed before requesting summary");
      }
      let message = "My face-up card is " + this.dealerCards[1].getName() + 
                     this.dealerCards[1].getSuit() + ".";
      if (this.playerCards.length === 0) {
         message += " Your hand is currently empty.";
      } else {
         message += " Your hand is " + this.playerCards[0].getName() + this.playerCards[0].getSuit();
         for (let i = 1; i < this.playerCards.length; i++) {
            message += ", " + this.playerCards[i].getName() + this.playerCards[i].getSuit();
         }
      }
      message += " (your total: " + ((this.playerLow === this.playerHigh) ? 
                  (this.playerLow) : (this.playerLow + "/" + this.playerHigh)) + ")";
      message += " Type `!hit` to go agane, `!stay` to end turn, or `!surrender` (lose half your bet)";
      return message;
   }
   
   // Simulates the first draws of the game: dealer gives two cards to the player
   // and draws two cards for themselves (one facing up)
   // Returns true if the game is to be continued, false if the player wins right away
   startGame() {
      this.gameStarted = true;
      
      let firstCard = this.drawNewCard();
      let secondCard = this.drawNewCard();
      
      this.playerCards.push(firstCard,secondCard);
      this.dealerCards.push(this.drawNewCard(), this.drawNewCard());

      updateDealerPoints.call(this);
      updatePlayerPoints.call(this);
      
      let message = this.playerName + ": You got a " + firstCard.getName() + firstCard.getSuit() +
                    " and a " + secondCard.getName() + secondCard.getSuit();
                    
      if (this.playerHigh === 21) {
         this.dealerFinish(message + " (blackjack)/br//br/", true);
         return false;
      } else {
         bot.chat(message + "/br//br/" + this.summary());
         return true;
      }
   }
   
   // Called when a player hits (param card = the card they got from the hit)
   // Returns true if the player can continue playing, false if they hit 21 or bust
   hit(card) {
      if (!this.gameStarted) {
         throw new Error("startGame should be completed before doing a hit");
      }
      this.playerCards.push(card);
      updatePlayerPoints.call(this);
      
      let message = this.playerName + ": you got a " + card.getName() + card.getSuit() + "./br//br/";
      
      if (this.playerHigh < 21) { // continue playing
         message += this.summary();
         bot.chat(message);
         return true;
      } else { // player's turns are over
         message += " You now have a total of " + this.playerHigh + ".";
         this.dealerFinish(message, false);
         return false;
      }
   }
   
   // Called when the player stays. Dealer will draw cards until they reach a score >= 17
   // initial message is a string that will precede the final game summary, blackjack is boolean
   // indicating whether player got a natural
   dealerFinish(initialMessage, blackjack) {
      if (!this.gameStarted) {
         throw new Error("startGame should be completed before a game is finished");
      }
      if (this.playerLow > 21) { // player loses automatically if they bust
         endGame.call(this, initialMessage, -1);
         return;
      }
      while ((this.dealerLow === this.dealerHigh && this.dealerLow < 17) ||
             (this.dealerLow !== this.dealerHigh && this.dealerHigh <= 17)) {
         let card = this.drawNewCard();
         this.dealerCards.push(card);
         updateDealerPoints.call(this);
      }
      if (this.dealerLow > 21 || this.dealerHigh < this.playerHigh) {
         blackjack ? endGame.call(this, initialMessage, 1.5) : endGame.call(this, initialMessage, 1);
      } else if (this.dealerHigh === this.playerHigh) {
         endGame.call(this, initialMessage, 0);
      } else {
         endGame.call(this, initialMessage, -1);
      }
   }
}

function updateDealerPoints() {
   this.dealerLow = this.dealerCards.reduce((total, card) => {
      return total + card.getValue();
   }, 0);
   
   let high = 0;
   let firstAce = true; // turn first ace into 11
   for (let i = 0; i < this.dealerCards.length; i++) {
      if (firstAce && this.dealerCards[i].isAce()) {
         firstAce = false;
         high += 11;
      } else {
         high += this.dealerCards[i].getValue();
      }
   }
   this.dealerHigh = (high > 21) ? this.dealerLow : high;
}
 
function updatePlayerPoints() {
   this.playerLow = this.playerCards.reduce((total, card) => {
      return card.getValue() + total;
   }, 0);
   
   let high = 0;
   let firstAce = true; // turn first ace into 11
   for (let i = 0; i < this.playerCards.length; i++) {
      if (firstAce && this.playerCards[i].isAce()) {
         firstAce = false;
         high += 11;
      } else {
         high += this.playerCards[i].getValue();
      }
   }
   this.playerHigh = (high > 21) ? this.playerLow : high;
}
 
// Ends the given game with either a victory, tie, or loss (for the player)
//
// Initial message: A summary will be appended to this given string
// Point multiplier: the multiplier for the user's points. This will be used
// to determine how much the user gained/lost
function endGame(initialMessage, pointMultiplier) {
   let message = initialMessage + " I drew the " + this.dealerCards[0].getName() +
                 this.dealerCards[0].getSuit();
   for (let i = 1; i < this.dealerCards.length; i++) {
      message += ", " + this.dealerCards[i].getName() + this.dealerCards[i].getSuit();
   }
   message += " (my total: " + this.dealerHigh + ", your total: " + this.playerHigh + ")";
   
   if (pointMultiplier > 0) {
      bot.chat(message + " Congratulations, you won " + Math.round(this.bet * pointMultiplier) + 
               " pts! AlizeePog");
   } else if (pointMultiplier < 0) {
      bot.chat(message + " Sorry, you lost " + Math.abs(Math.round(this.bet * pointMultiplier))
               + " pts! AlizeeSad");
   } else { // point multiplier is 0
      bot.chat(message + " It's a tie! AlizeeOP");
   }
   points.adjustPoints(this.playerName, Math.round(pointMultiplier * this.bet));
}

module.exports.BlackjackGame = BlackjackGame;