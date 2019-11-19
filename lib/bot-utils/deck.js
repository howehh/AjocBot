// Represents a 52 card deck
function Deck() {
   this.cards = [];
 
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

module.exports.Deck = Deck;