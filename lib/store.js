// *****************************************************************************
// This module manages the AjocBot store, where users can buy things with points
// *****************************************************************************
const config = require('./../config');
const callbacks = require('./callbacks');
const axios = require('axios');
const bot = require('./bot');
const points = require('./points');

const buyers = new Map(); // maps users to their purchasing status (buying/choice)
const secretEmotes = []; // array of secret emote names

// Prices for the point store
const store = {
   SOUND_PRICE: 100,
   LEAD_PRICE: 400,
   EMOTE_PRICE: 2500,
   SECRET_PRICE: 15000,
   MOD_PRICE: 45000
}

// Gets the list of secret emote names from a pastebin containing a json in format:
// {"secretEmotes": [ "abc", "def" ]}
function getSecretEmotes() {
   secretEmotes.splice(0, secretEmotes.length);
   axios.get("https://pastebin.com/raw/" + config.pastes.secret)
   .then(function(response) {
      secretEmotes.push.apply(secretEmotes, response.data.secretEmotes);
   });
}
getSecretEmotes();

// Adds user to the buyers map, putting their purchasing status to true
// the confirmTimeout field is a timeout which resets a buyer's status if they have
// not confirmed their secret emote choice in a certain amount of time
function addBuyer(username) {
   username = username.toLowerCase();
   buyers.set(username, {"purchasing": true, "choice": -1, "confirmTimeout": null});
}

// Resets the given user's buying status, setting them as not purchasing, not having
// made a choice, and not having a confirmTimeout
function resetBuyerStatus(username) {
   clearTimeout(buyers.get(username.toLowerCase()).confirmTimeout);
   buyers.get(username.toLowerCase()).purchasing = false;
   buyers.get(username.toLowerCase()).choice = -1;
}

// Takes a string (one with html tags) and returns a url if there is one contained in the string
// otherwise returns null
function parseUrl(string) {
   const urls = string.match(/\bhttps?:\/\/\S+/gi);
   return ((urls !== null) ? urls[0].substring(0, urls[0].length - 1) : null);
}

// Takes tokens of a chat message, a desired emoteName, and the url
// Returns true if the format of the message and the message is properly formatted/ok to be added
function validAddEmote(tokens, emoteName, url) {
   if (tokens.length !== 7 || emoteName.indexOf("<a") !== -1 || url === null ||
       url.indexOf("imgur") !== -1) { // checks for valid input
      bot.chat("Invalid input. Format as `!addemote [name] [link]` (imgur not allowed)");
      return false;
   }
   if (bot.emotes.indexOf(emoteName.toLowerCase()) !== -1) { // checks if name available
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
         bot.chat(username + ": you added an emote for " + store.EMOTE_PRICE + " pts!");
      } else {
         bot.chat("That link is not a valid image AlizeeWeird");
      }
   }).catch(function(error) {
      bot.chat("That link is not a valid image AlizeeWeird");
   });
}

// Returns the space separated emote code associated with the given index
function getEmoteCode(choiceIndex) {
   let emoteCode = secretEmotes[choiceIndex - 1];
   let result = emoteCode.charAt(0);
   for (let i = 1; i < emoteCode.length; i++) {
      result += " " + emoteCode.charAt(i);
   }
   return result;
}

// Clears any current timeout for automatically cancelling a purchase and then
// sets a new one for the given user
function setConfirmTimeout(username) {
   clearTimeout(buyers.get(username).confirmTimeout);
   
   buyers.get(username).confirmTimeout = setTimeout(function() {
      resetBuyerStatus(username);
      bot.pm(username, "Your purchase timed out.");
   }, 60000);
}

const chatFunctions = {
   // Command to view things that can be purchased with points
   store: function(data) {
      if (data.msg.indexOf("!store") !== -1) {
         bot.chat("*Buy things with your points:* /br/" +
                  store.SOUND_PRICE + " pts: Play a sound `!sound`/br/" +
                  store.LEAD_PRICE + " pts: Leader permissions for 1 min `!leader`/br/" +
                  store.EMOTE_PRICE + " pts: Add emote `!addemote [name] [link]`/br/" +
                  store.SECRET_PRICE + " pts: Buy an AlizeeSecret `!secretemote`/br/" +
                  store.MOD_PRICE + " pts: Moderator Rank");
      }
   },
   
   // Command to play a sound through ajoc - requires the channel's javascript to 
   // be able to detect when a person has successfully redeemed a sound, then plays it through
   // the DOM
   sound: function(data) {
      if (data.msg.indexOf("!sound") !== -1) {
         const username = data.username.toLowerCase();
         axios.get("https://pastebin.com/raw/JnLq6m7K").then(function(res) { // sounds from pastebin
            const soundNames = [];
            soundNames.push.apply(soundNames, res.data.sounds);
            const soundRequest = data.msg.trim().split(/\s+/g)[1];
          
            if (data.msg.trim() === "!sound") { // A help command
               let result = "Type `!sound [name]` to play a sound (only plays for those with" +
                            " the channel script enabled) /br/ /br/";
               result += "List of names: " + soundNames[0];
               for (let i = 1; i < soundNames.length; i++)
                  result += ", " + soundNames[i];
               bot.chat(result);
            } else if (soundNames.indexOf(soundRequest) === -1) { // they typed an invalid name
               bot.chat("Invalid sound. Type `!sound` for a list of sound names");
            } else { // they typed a valid name
               if (points.hasPoints(username) && points.getPoints(username) >= store.SOUND_PRICE) {
                  bot.chat(username + " redeemed the sound " + soundRequest + " for " + 
                           store.SOUND_PRICE + " pts!");
                  points.adjustPoints(username, -(store.SOUND_PRICE));
               } else {
                  bot.chat(username + ": you don't have enough points (need " + store.SOUND_PRICE
                           + ") AlizeeWeird");
               }
            }
         });
      }
   },
   
   // Command to get leader permissions in Cytube for 1 minute.
   leader: function(data) {
      if (data.msg.indexOf("!leader") !== -1) {
         const username = data.username.toLowerCase();
         if (points.hasPoints(username) && points.getPoints(username) >= store.LEAD_PRICE) {
            bot.chat(username + ": you spent " + store.LEAD_PRICE + " pts to have leader permissions"
                     + " for the next minute (add/bump your videos to next, pause/control video)");
            
            // Gives the user leader permissions and takes away appropriate number of points
            // After a timeout, the bot removes the current leader
            bot.socket.emit("assignLeader", {name: data.username});
            setTimeout(function() {
               bot.socket.emit("assignLeader", {name: ""});
            }, 60000);
            points.adjustPoints(username, -(store.LEAD_PRICE));
         } else {
            bot.chat(username + ": you do not have enough points (need " + store.LEAD_PRICE + ")");
         }
      }
   },
   
   // Command to add an emote to the channel with points ("!addemote [name] [image link]")
   addEmote: function(data) {
      if (data.msg.startsWith("!addemote")) {
         const username = data.username.toLowerCase();
         if (points.hasPoints(username) && points.getPoints(username) >= store.EMOTE_PRICE) { 
            const tokens = data.msg.trim().split(/\s+/g);
            const emoteName = tokens[1];
            const url = parseUrl(data.msg);
            if (validAddEmote(tokens, emoteName, url)) { // checks if valid emote
               addValidImage(username, emoteName, url);
            }
         } else {
            bot.chat(username + ": you don't have enough points (need " + store.EMOTE_PRICE + ")");
         }
      }
   }
}
   
const pmFunctions = {
   // Command to purchase a secret emote. PMs the user with a prompt to choose an emote.
   secretEmote: function(data) {
      if (data.msg.startsWith("!secretemote")) {
         getSecretEmotes();
         const username = data.username.toLowerCase();
         bot.pm(username, "Type the number corresponding to the emote you wish to purchase: " + 
            "https://imgur.com/a/BGebN0Y");
         addBuyer(username);
      }
   },
   
   // After a user has called !secretemote command, they must choose a number. 
   buySecretEmote: function(data) {
      const username = data.username.toLowerCase();
      if (buyers.has(username) && buyers.get(username).purchasing) { 
         const choice = parseInt(data.msg);
         if (!isNaN(choice) && choice > 0 && choice <= secretEmotes.length) {
            // Saves the user's choice in buyers map
            bot.pm(username, "You are purchasing " + secretEmotes[choice - 1] + " for " +
                   store.SECRET_PRICE + " pts (type 'y' to confirm, 'n' to cancel," +
                   " or a different number)");
            buyers.get(username).choice = choice;
            setConfirmTimeout(username);
         }
      }
   },
   
   // After choosing a number, they must type y/n to confirm or cancel purchase
   // Bot PM's them the emote code and deducts apprpriate amount of points.
   confirmSecretEmote: function(data) {
      const username = data.username.toLowerCase();
      if (buyers.has(username) && buyers.get(username).choice !== -1) { // if made choice
         if (data.msg === "y") { // chose yes (confirmed purchase)
            const choice = buyers.get(username).choice;
            resetBuyerStatus(username);
            if (points.hasPoints(username) && points.getPoints(username) >= store.SECRET_PRICE) {
               const result = getEmoteCode(choice);
               bot.pm(username, "You have purchased the secret emote: " + "`" + result + "`" +
                      " (It is your responsibility to remember the code and keep it a secret. "
                      + store.SECRET_PRICE + " pts have been deducted from your total)");
               points.adjustPoints(username, -(store.SECRET_PRICE));
            } else {
               bot.pm(username, "You don't have enough points (need " + store.SECRET_PRICE + ")");
            }
         } else if (data.msg === "n") { // chose no 
            resetBuyerStatus(username);
            bot.pm(username, "You have cancelled your purchase.");
         }
      }
   }
};

callbacks.addMultipleChatEvents(chatFunctions);
callbacks.addMultipleWhisperEvents(pmFunctions);
callbacks.addChatEvent(pmFunctions.secretEmote); // special case: can be called in chat as well