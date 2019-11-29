// *********** CONVERT METRIC/IMPERIAL ***********
// Converts quantities between metric and imperial
// ***********************************************
const convert = require('convert-units');
const callbacks = require('./callbacks');
const bot = require('./bot');

const conversions = [{"metric": "cm", "imperial": "in"},
   {"metric": "m", "imperial": "ft"},
   {"metric": "km", "imperial": "mi"},
   {"metric": "g", "imperial": "oz"},
   {"metric": "kg", "imperial": "lb"},
   {"metric": "ml", "imperial": "fl-oz"},
   {"metric": "l", "imperial": "gal"},
   {"metric": "C", "imperial": "F"}];

// Takes a numerical amount, a String representing the original unit, and a String denoting
// the unit to convert to. Then calculates the result and returns it as a string.
// If converting from cm to in, it will return a string in a ft + in format (e.g. 5 ft 9 in)
function calculateConversion(amount, currentUnit, unitToConvertTo) {
   if (unitToConvertTo === "in") {
      let inches = convert(amount).from(currentUnit).to(unitToConvertTo).toFixed(2);
      const feet = parseInt(inches / 12, 10);
      // If feet is 0, then just returns inches. Otherwise returns ft + in
      return (feet === 0 ? `${inches} in` : `${feet} ft ${(inches % 12).toFixed(1)} in`);
   } else {
      return convert(amount).from(currentUnit).to(unitToConvertTo).toFixed(2) + 
           " " + unitToConvertTo;
   }
}

callbacks.addChatEvents({
   // Command to convert a quantity to the opposite unit. Message should be in format
   // "!convert [amount] [unit]"
   convertUnits: function(data) {
      if (data.tokens[0] === "!convert") { 
         const amount = parseInt(data.tokens[1]);
         const unit = data.tokens[2];
         if (data.tokens.length >= 3 && !isNaN(amount)) {
            for (let i = 0; i < conversions.length; i++) { // traverse through conversions array
               // if the user's given unit is one of the two current units, converts it to the
               // opposite current unit and chats it.
               const metric = conversions[i].metric;
               const imperial = conversions[i].imperial;
               if (unit === metric) {
                  bot.chat(calculateConversion(amount, metric, imperial));
                  return;
               } else if (unit === imperial) {
                  bot.chat(calculateConversion(amount, imperial, metric));
                  return;
               }
            }
         }
         bot.chat("Invalid input. Format as one number followed by one valid unit keyword " +
              "listed under `!units` AlizeeNo");
      } 
   },

   // Command that informs user of the valid units that can be converted.
   units: function(data) {
      if (data.msg.indexOf("!units") !== -1) {
         let unitList = `Valid units: ${conversions[0].metric}, ${conversions[0].imperial}`;
         for (let i = 1; i < conversions.length; i++) {
            unitList += `, ${conversions[i].metric}, ${conversions[i].imperial}`; 
         }
         bot.chat(unitList);
      }
   }
});
