// *****************************************************************************
// This module manages the AjocBot store, where users can buy things with points
// *****************************************************************************
const config = require('./../config');
const callbacks = require('./callbacks');
const axios = require('axios');
const bot = require('./bot');
const points = require('./pointsdata');

const storeData = {
   currLeader: null,
   buyers: new Map(), // maps users to their purchasing status (buying/choice)
   secretEmotes: [] // array of secret emote names
}

// Prices for the point store
const store = {
   testing: false,
   SOUND_PRICE: 84,
   LEAD_PRICE: 400,
   EMOTE_PRICE: 2500,
   SECRET_PRICE: 17500,
   MOD_PRICE: 50000
}

// Gets the list of secret emote names from a pastebin containing a json in format:
// {"secretEmotes": [ "abc", "def" ]}
function getSecretEmotes() {
   storeData.secretEmotes.splice(0, storeData.secretEmotes.length);
   axios.get("https://pastebin.com/raw/" + config.pastes.secret)
   .then(function(response) {
      if (response.data.secretEmotes !== undefined) {
         storeData.secretEmotes.push.apply(storeData.secretEmotes, response.data.secretEmotes);
      }
   });
}
getSecretEmotes();

// Adds user to the buyers map, putting their purchasing status to true
// the purchaseTimeout field is a timeout which resets a buyer's status if they have
// not bought a secret emote choice in a certain amount of time
function addBuyer(username) {
   username = username.toLowerCase();
   resetBuyerStatus(username); 
   storeData.buyers.set(username, {"choice": -1, "purchaseTimeout": null});
}

// Clears the given user from the buyers map
function resetBuyerStatus(username) {
   if (storeData.buyers.has(username)) {
      clearTimeout(storeData.buyers.get(username.toLowerCase()).purchaseTimeout);
      storeData.buyers.delete(username.toLowerCase());
   }
}

// Clears any current timeout for automatically cancelling a purchase and then
// sets a new one for the given user
function setPurchaseTimeout(username) {
   clearTimeout(storeData.buyers.get(username).purchaseTimeout);
   
   storeData.buyers.get(username).purchaseTimeout = setTimeout(function() {
      resetBuyerStatus(username);
      bot.pm(username, "Your purchase timed out after 60 seconds. Go agane" +
             " if you still wish to purchase a secret emote");
   }, 60000);
}

// Takes a string (one with html tags) and returns a url if there is one contained in the string
// otherwise returns null
function parseUrl(string) {
   const urls = string.match(/\bhttps?:\/\/\S+/gi);
   return ((urls !== null) ? urls[0].substring(0, urls[0].length - 1) : null); // remove " at end
}

// Takes tokens of a chat message, a desired emoteName, and the url
// Returns true if the format of the message and the message is properly formatted/ok to be added
function validAddEmote(tokens, emoteName, url) {
   if (tokens.length !== 7 || emoteName.indexOf("<a") !== -1 || url === null ||
       url.indexOf("imgur") !== -1) { // checks for valid input
      bot.chat("Invalid input. Format as `!addemote [name] [link]` (imgur not allowed)");
      return false;
   }
   if (bot.hasEmote(emoteName)) { // checks if name available
      bot.chat("That emote name already exists: " + emoteName);
      return false;
   }
   return true;
}

// Param: username = name of the user who is adding emote
//        emoteName = the name of the emote that user is adding
//        url = the link to the emote
// Adds valid images only (jpg, png, gif, etc), error message from bot otherwise
function addValidImage(username, emoteName, url) {
   axios.head(url).then(function(response) { // checks if url is an actual image
      if (response.headers["content-type"].indexOf("image") !== -1) {
         // Adds the emote and takes away the appropriate points from user
         bot.updateEmote(emoteName, url);
         points.adjustPoints(username, -(store.EMOTE_PRICE));
         bot.chat(`${username}: you added an emote for ${store.EMOTE_PRICE} ${points.CURRENCY}!`);
      } else {
         bot.chat("That link is not a valid image AlizeeWeird");
      }
   }).catch(function(error) {
      bot.chat("That link is not a valid image AlizeeWeird");
   });
}

// Returns the space separated emote code associated with the given index
function getEmoteCode(choiceIndex) {
   let emoteCode = storeData.secretEmotes[choiceIndex - 1];
   let result = emoteCode.charAt(0);
   for (let i = 1; i < emoteCode.length; i++) {
      result += " " + emoteCode.charAt(i);
   }
   return result;
}

callbacks.addChatEvents({
   // Command to view things that can be purchased with points
   store: function(data) {
      if (data.msg.indexOf("!store") !== -1) {
         bot.chat(`*Redeem stuff with ${points.CURRENCY}:* /br/` +
            store.SOUND_PRICE + ": Play a sound `!sound`/br/" +
            store.LEAD_PRICE + ": Playlist/video control for 1 min `!leader`/br/" +
            store.EMOTE_PRICE + ": Add emote `!addemote [name] [link]`/br/" +
            store.SECRET_PRICE + ": Buy an AlizeeSecret `!secretemote`/br/" +
            store.MOD_PRICE + ": Moderator Rank");
      }
   },
   
   // Command to play a sound through ajoc - requires the channel's javascript to 
   // be able to detect when a person has successfully redeemed a sound, then plays it through
   // the DOM
   sound: function(data) {
      if (data.tokens[0] === "!sound" || data.tokens[0] === "!sounds") {
         const username = data.username.toLowerCase();
         axios.get("https://pastebin.com/raw/JnLq6m7K").then(function(res) { // sounds from pastebin
            const soundNames = [];
            soundNames.push.apply(soundNames, res.data.sounds);
            const soundRequest = data.tokens[1];
          
            if (data.msg.trim() === "!sound" || data.msg.trim() === "!sounds") { // A help command
               let result = "Type `!sound [name]` to play a sound for everyone with" +
                            " the channel script enabled/br//br/";
               result += `*Names*: ${soundNames[0]}`;
               for (let i = 1; i < soundNames.length; i++) 
                  result += `, ${soundNames[i]}`;
               bot.chat(result);
            } else if (soundNames.indexOf(soundRequest) === -1) { // they typed an invalid name
               bot.chat("Invalid sound. Type `!sound` for a list of sound names");
            } else {
               const price = store.testing ? 0 : store.SOUND_PRICE;
               if (points.hasPoints(username) && points.getPoints(username) >= price) {
                  bot.chat(`${username} redeemed the sound ${soundRequest} for ${price} ${points.CURRENCY}!`);
                  points.adjustPoints(username, -(price));
               } else {
                  bot.chat(`${username}: you don't have enough points (need ${price}) AlizeeWeird`);
               }
            }
         });
      }
   },
   
   // Command to get leader permissions in Cytube for 1 minute.
   leader: function(data) {
      if (data.msg.indexOf("!leader") !== -1) {
         const username = data.username.toLowerCase();
         const price = store.testing ? 0 : store.LEAD_PRICE;
         if (!points.hasPoints(username) || points.getPoints(username) < price) {
            bot.chat(`${username}: you do not have enough ${points.CURRENCY} (need ${price})`);
            return
         }
         if (storeData.currLeader !== null) { 
            bot.chat("There is currently someone buying leader. AlizeeWeird");
            return
         }
         if (bot.assignLeader(data.username)) { // successful assign
            storeData.currLeader = username;
            bot.chat(`${username}: you spent ${price} ${points.CURRENCY} to have leader permissions for the`
                     + ` next minute (add/bump your videos to next, pause/control video)`);
    
            setTimeout(function() {
               bot.assignLeader("");
               storeData.currLeader = null;
            }, 60000);
            points.adjustPoints(username, -(price));
         } else {
            bot.chat("Unable to set leader. AlizeeS");
         }
      }
   },
   
   // Command to add an emote to the channel with points ("!addemote [name] [image link]")
   addEmote: function(data) {
      if (data.tokens[0] === "!addemote") {
         const username = data.username.toLowerCase();
         if (points.hasPoints(username) && points.getPoints(username) >= store.EMOTE_PRICE) { 
            const emoteName = data.tokens[1];
            const url = parseUrl(data.msg);
            if (validAddEmote(data.tokens, emoteName, url)) { // checks if valid emote
               addValidImage(username, emoteName, url);
            }
         } else {
            bot.chat(`${username}: you don't have enough points (need ${store.EMOTE_PRICE})`);
         }
      }
   }, 
   
   // Admin command to toggle testing on and off. When tests are on, selected store items are free
   toggleTest: function(data) {
      if (data.msg.indexOf("!toggletest") !== -1) {
         if (bot.isAdmin(data.username)) {
            store.testing = !store.testing;
            store.testing 
               ? bot.chat("Testing is now enabled (selected store items will not deduct points)")
               : bot.chat("Testing mode is now disabled.");
         } else {
            bot.chat(data.username + ": you do not have this permission AlizeeWeird");
         }
      }
   }
});
   
callbacks.addWhisperEvents({
   // After a user has called !secretemote command, they must choose a number. 
   buySecretEmote: function(data) {
      const username = data.username.toLowerCase();
      if (storeData.buyers.has(username)) { 
         const choice = parseInt(data.msg);
         if (!isNaN(choice) && choice > 0 && choice <= storeData.secretEmotes.length) {
            // Saves the user's choice in buyers map
            bot.pm(username, `You are purchasing ${storeData.secretEmotes[choice - 1]} for ${store.SECRET_PRICE}` + 
                   ` ${points.CURRENCY} (type 'y' to confirm, 'n' to cancel, or a different number)`);
            storeData.buyers.get(username).choice = choice;
            setPurchaseTimeout(username);
         }
      }
   },
   
   // After choosing a number, they must type y/n to confirm or cancel purchase
   // Bot PM's them the emote code and deducts apprpriate amount of points.
   confirmSecretEmote: function(data) {
      const username = data.username.toLowerCase();
      if (storeData.buyers.has(username) && storeData.buyers.get(username).choice !== -1) { //made choice
         if (data.msg === "y") { // chose yes (confirmed purchase)
            const choice = storeData.buyers.get(username).choice;
            resetBuyerStatus(username);
            if (points.hasPoints(username) && points.getPoints(username) >= store.SECRET_PRICE) {
               const result = getEmoteCode(choice);
               bot.pm(username, `You have purchased the secret emote: \`${result}\`` +
                      ` (It is your responsibility to remember the code and keep it a secret.` +
                      ` ${store.SECRET_PRICE} ${points.CURRENCY} have been deducted from your total)`);
               points.adjustPoints(username, -(store.SECRET_PRICE));
            } else {
               bot.pm(username, `You don't have enough ${points.CURRENCY} (need ${store.SECRET_PRICE})`);
            }
         } else if (data.msg === "n") { // chose no 
            resetBuyerStatus(username);
            bot.pm(username, "You have cancelled your purchase.");
         }
      }
   }
});

callbacks.addChatAndWhispers({ // special case: can be called in chat as well
   // Command to purchase a secret emote. PMs the user with a prompt to choose an emote.
   secretEmote: function(data) {
      if (data.msg.startsWith("!secretemote")) {
         getSecretEmotes();
         const username = data.username.toLowerCase();
         bot.pm(username, "Type the number corresponding to the emote you wish to purchase: " + 
            "https://imgur.com/a/BGebN0Y");
         addBuyer(username);
         setPurchaseTimeout(username);
      }
   }
});