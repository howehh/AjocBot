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
}

class Deck {
   #cards;
   
   static #suits = ["♠", "♥", "♦", "♣"];
 
   constructor() {
      this.#cards = [];
      
      for (let i = 0; i < 4; i++) {
         for (let j = 2; j <= 10; j++) {
            this.#cards.push(new Card(Deck.#suits[i], j, j));
         }
         this.#cards.push(new Card(Deck.#suits[i], "A", 1));
         this.#cards.push(new Card(Deck.#suits[i], "K", 10));
         this.#cards.push(new Card(Deck.#suits[i], "Q", 10));
         this.#cards.push(new Card(Deck.#suits[i], "J", 10));
      }
   }
   
   // Removes a random card from the deck and returns it
   drawCard() {
      let roll = Math.floor(Math.random() * this.#cards.length);
      let card = this.#cards[roll];
      this.#cards.splice(roll, 1);
      return card;
   }
}

module.exports.Deck = Deck;