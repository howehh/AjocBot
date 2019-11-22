// Represents a 52 card deck
class Card {
   #suit;
   #name;
   #value;
   
   static #ACE_NAME = "A";
   
   constructor(suit, name, value) {
      this.#suit = suit;
      this.#name = name;
      this.#value = value;
   }
   
   getSuit() {
      return this.#suit;
   }
   getName() {
      return this.#name;
   }
   getValue() {
      return this.#value;
   }
   
   // Returns true iff the card is an ace
   isAce() {
      return this.#name === Card.#ACE_NAME;
   }

   toString() {
      return this.getName() + this.getSuit();
   }
}

class Deck {
   #cards;
   #index;
   
   static #suits = ["♠", "♥", "♦", "♣"];
 
   constructor() {
      this.#cards = [];
      this.#index = 0;
      
      for (let i = 0; i < 4; i++) {
         for (let j = 2; j <= 10; j++) {
            this.#cards.push(new Card(Deck.#suits[i], j, j));
         }
         this.#cards.push(new Card(Deck.#suits[i], "A", 1));
         this.#cards.push(new Card(Deck.#suits[i], "K", 10));
         this.#cards.push(new Card(Deck.#suits[i], "Q", 10));
         this.#cards.push(new Card(Deck.#suits[i], "J", 10));
      }
      this.shuffle();
   }
   
   shuffle() {
      for (let i = 0; i < 3; i++) { // shuffle three times
         
         for (let i = 0; i < this.#cards.length; i++) {
            let otherIndex = Math.floor(Math.random() * this.#cards.length);
            let temp = this.#cards[otherIndex];
            this.#cards[otherIndex] = this.#cards[i];
            this.#cards[i] = temp;
         }
         
      }
   }
   
   // Removes a random card from the deck and returns it
   drawCard() {
      if (this.#index === this.#cards.length) {
         return null;
      }
      let card = this.#cards[this.#index];
      this.#index++;
      return card;
   }
}

module.exports.Deck = Deck;