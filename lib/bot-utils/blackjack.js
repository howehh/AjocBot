const Deck = require('./deck').Deck;
 
// Represents a blackjack game for a given player
// username = the player
// bet = what they wagered
class BlackjackGame {
   #deck;
   #playerName;
   #bet;
   #pointMultiplier;
   #dealerCards;
   #playerCards;
   #dealerLow;
   #dealerHigh;
   #playerLow;
   #playerHigh;
   #gameStarted;
   #gameOver;
   #playerTurnsOver;
   #gotBlackjack;
   
   constructor(username, bet) {
      this.#deck = new Deck();
      this.#playerName = username;
      this.#bet = bet;
      this.#pointMultiplier = 0;
      this.#dealerCards = [];
      this.#playerCards = [];
      this.#dealerLow = this.#dealerHigh = this.#playerLow = this.#playerHigh = 0;
      this.#gameStarted = this.#gameOver = this.#playerTurnsOver = this.#gotBlackjack = false;
   }
   
   isOver() { // returns true if the game is complete
      return this.#gameOver;
   }
   
   getPlayerHand() { // returns copy of the player hand array
      return this.#playerCards.slice(0);
   }
   
   getDealerHand() { // returns copy of the dealer hand array 
      return this.#dealerCards.slice(0);
   }
   
   getPlayerName() { // returns the player's name
      return this.#playerName;
   }
   
   getPlayerLow() { // returns the player's low score
      return this.#playerLow;
   }
   
   getPlayerHigh() { // returns the player's high score
      return this.#playerHigh;
   }
   
   getDealerLow() { // returns the dealer's low score
      return this.#dealerLow;
   }
   
   getDealerHigh() { // returns the dealer's high score
      return this.#dealerHigh;
   }
   
   getBet() { // returns the bet that user originally wagered
      return this.#bet;
   }
   
   // returns the appropriate multiplier for adjusting player pts based on win/loss/tie
   getPointMultiplier() {
      return this.#pointMultiplier;
   }
   
   // Get and return a new card from the game's deck
   drawNewCard() {
      return this.#deck.drawCard();
   }
   
   // Simulates the first draws of the game: dealer gives two cards to the player
   // and draws two cards for themselves (one facing up)
   // Returns true if the game is to be continued, false if the player wins right away
   startGame() {
      if (this.#gameStarted) {
         throw new Error("Game was already started");
      }
      this.#gameStarted = true;
      
      let firstCard = this.drawNewCard(); // player's
      let secondCard = this.drawNewCard(); // dealer's (face down)
      let thirdCard = this.drawNewCard(); // player's
      let fourthCard = this.drawNewCard(); // dealer's
      
      this.#playerCards.push(firstCard,thirdCard);
      this.#dealerCards.push(secondCard, fourthCard);

      this.updateDealerPoints();
      this.updatePlayerPoints();
      
      if (this.#playerHigh === 21) {
         this.#playerTurnsOver = true;
         this.#gotBlackjack = true;
         this.dealerFinish();
      }
      return !this.#gotBlackjack;
   }
   
   // Called when a player hits
   // Returns the card the player got from hitting
   hit() {
      if (!this.#gameStarted) {
         throw new Error("startGame should be completed before doing a hit");
      }
      if (this.#playerTurnsOver) {
         throw new Error("Player's turns are over");
      }
      let card = this.drawNewCard();
      this.#playerCards.push(card);
      this.updatePlayerPoints();
      
      if (this.#playerHigh >= 21) {
         this.#playerTurnsOver = true;
         this.dealerFinish();
      }
      return card;
   }
   
   // Called when the player stays. Dealer will draw cards until they reach a score >= 17
   // initial message is a string that will precede the final game summary, blackjack is boolean
   // indicating whether player got a natural
   dealerFinish() {
      if (!this.#gameStarted) {
         throw new Error("startGame should be completed before a game is finished");
      }
      if (this.#gameOver) {
         throw new Error("Game is already over");
      }
      if (this.#playerLow > 21) { // player loses automatically if they bust
         this.#pointMultiplier = -1;
         this.#gameOver = true;
         return;
      }
      while ((this.#dealerLow === this.#dealerHigh && this.#dealerLow < 17) ||
             (this.#dealerLow !== this.#dealerHigh && this.#dealerHigh <= 17)) {
         let card = this.drawNewCard();
         this.#dealerCards.push(card);
         this.updateDealerPoints();
      }
      if (this.#dealerLow > 21 || this.#dealerHigh < this.#playerHigh) {
         this.#pointMultiplier = this.#gotBlackjack ? 1.5 : 1;
      } else if (this.#dealerHigh === this.#playerHigh) {
         this.#pointMultiplier = 0;
      } else {
         this.#pointMultiplier = -1;
      }
      this.#gameOver = true;
   }
   
   // Surrender a game and lose half the bet
   surrender() {
      if (!this.#gameStarted) {
         throw new Error("startGame should be completed before any surrender");
      }
      if (this.#gameOver) {
         throw new Error("Game is already over");
      }
      this.#pointMultiplier = -0.5;
      this.#gameOver = true;
   }
   
   stay() {
      if (!this.#gameStarted) {
         throw new Error("startGame should be completed before staying");
      }
      if (this.#playerTurnsOver) {
         throw new Error("Player turns are already over");
      }
      this.#playerTurnsOver = true;
      this.dealerFinish();
   }
   
   updateDealerPoints() {
      this.#dealerLow = this.#dealerCards.reduce((total, card) => {
         return total + card.getValue();
      }, 0);
      
      let high = 0;
      let firstAce = true; // turn first ace into 11
      for (let i = 0; i < this.#dealerCards.length; i++) {
         if (firstAce && this.#dealerCards[i].isAce()) {
            firstAce = false;
            high += 11;
         } else {
            high += this.#dealerCards[i].getValue();
         }
      }
      this.#dealerHigh = (high > 21) ? this.#dealerLow : high;
   }
 
   updatePlayerPoints() {
      this.#playerLow = this.#playerCards.reduce((total, card) => {
         return card.getValue() + total;
      }, 0);
      
      let high = 0;
      let firstAce = true; // turn first ace into 11
      for (let i = 0; i < this.#playerCards.length; i++) {
         if (firstAce && this.#playerCards[i].isAce()) {
            firstAce = false;
            high += 11;
         } else {
            high += this.#playerCards[i].getValue();
         }
      }
      this.#playerHigh = (high > 21) ? this.#playerLow : high;
   }
}

module.exports.BlackjackGame = BlackjackGame;