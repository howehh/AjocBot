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
      this.dealerPoints = 0;
      this.playerPoints = 0;
   }
   
   getPlayerName() {
      return this.playerName;
   }
   
   getBet() {
      return this.bet;
   }
   
   // Returns true iff an ace was just drawn
   drewAce() {
      return this.currentAce !== null;
   }
   
   // Return the current ace that was drawn. Throws error if !drewAce()
   getCurrentAce() {
      if (!this.drewAce()) {
         throw new Error("there is no current ace");
      }
      return this.currentAce;
   }
   
   // Get and return a new card from the game's deck
   drawNewCard() {
      return this.deck.drawCard();
   }
   
   // Set the current ace to the given card. Throws error if card is not an ace
   setCurrentAce(card) {
      if (!card.isAce()) {
         throw new Error("Tried setting current ace to non-ace card");
      }
      this.currentAce = card;
   }
   
   // Reset the current ace status to not having drawn one
   clearCurrentAce() {
      this.currentAce = null;
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
      message += " (your total: " + this.playerPoints + ")";
      if (this.drewAce()) {
         message += " Type `1` or `11` to choose your ace value. "; 
      } else {
         message += " Type `!hit` to request another card or `!stay` to stop.";
      }
      return message;
   }
   
   // Simulates the first draws of the game: dealer gives two cards to the player
   // and draws two cards for themselves (one facing up)
   startGame() {
      let firstCard = this.drawNewCard();
      let secondCard = this.drawNewCard();
      
      let firstDealerCard = this.drawNewCard();
      let secondDealerCard = this.drawNewCard();
      this.dealerCards.push(firstDealerCard, secondDealerCard);
      
      // Determine initial points for the dealer and update accordingly
      if (firstDealerCard.isAce() && secondDealerCard.isAce()) {
         firstDealerCard.setValue(1);
         secondDealerCard.setValue(11);
      } else if (firstDealerCard.isAce()) {
         firstDealerCard.setValue((secondDealerCard.getValue() === 6) ? 1 : 11);
      } else if (secondDealerCard.isAce()) {
         secondDealerCard.setValue((firstDealerCard.getValue() === 6) ? 1 : 11);
      }
      updateDealerPoints.call(this)
      
      let message = this.playerName;
      
      if (firstCard.isAce() && secondCard.isAce()) {
         message += ": You got two aces for your first two cards (The first is valued at 1).";
         this.playerCards.push(firstCard);
         this.setCurrentAce(secondCard);
      } else if (firstCard.isAce()) {
         message += ": You got a " + secondCard.getName() + secondCard.getSuit() + " and an Ace."
         this.playerCards.push(secondCard);
         this.setCurrentAce(firstCard);
      } else if (secondCard.isAce()) {
         message += ": You got a " + firstCard.getName() + firstCard.getSuit() + " and an Ace.";
         this.playerCards.push(firstCard);
         this.setCurrentAce(secondCard);  
      } else {
         message += ": You got a " + firstCard.getName() + firstCard.getSuit() + " and a "
                    + secondCard.getName() + secondCard.getSuit() + ".";
         this.playerCards.push(firstCard,secondCard);
      }
      this.gameStarted = true;
      updatePlayerPoints.call(this);
      
      message += "/br//br/" + this.summary();
      bot.chat(message);
   }
   
   // Called when a player hits (param card = the card they got from the hit)
   // Returns true if the player can continue playing, false if they hit 21 or bust
   hit(card) {
      if (!this.gameStarted) {
         throw new Error("startGame should be completed before doing a hit");
      }
      this.playerCards.push(card);
      if (card.isAce()) this.clearCurrentAce();
      updatePlayerPoints.call(this);
      
      let message = this.playerName + ": you got a " + card.getName() + card.getSuit() + ". ";
      
      if (this.playerPoints > 21) { // attempt to turn an 11 ace into a 1
         let reducedAce = reduceAce(this.playerCards);
         if (reducedAce) {
            updatePlayerPoints.call(this);
            message += "Since you busted, your A" + reducedAce.getSuit() +
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
   dealerFinish(initialMessage) {
      if (!this.gameStarted) {
         throw new Error("startGame should be completed before a game is finished");
      }
      if (this.playerPoints > 21) { // player loses automatically if they bust
         endGame.call(this, initialMessage, -1);
         return;
      }
      while (this.dealerPoints < 17) {
         let card = this.drawNewCard();
         if (card.isAce()) {
            card.setValue((this.dealerPoints + 11 <= 21) ? 11 : 1);
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
}

function updateDealerPoints() {
   this.dealerPoints = this.dealerCards.reduce((total, card) => {
      return total + card.getValue();
   }, 0);
   return this.dealerPoints;
}
 
function updatePlayerPoints() {
   this.playerPoints = this.playerCards.reduce((total, card) => {
      return total + card.getValue();
   }, 0);
   return this.playerPoints;
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
      if (cards[i].isAce() && cards[i].getValue() === 11) {
         cards[i].setValue(1);
         return cards[i];
      }
   }
   return null;
}

module.exports.BlackjackGame = BlackjackGame;