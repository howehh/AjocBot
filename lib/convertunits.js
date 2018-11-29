// *********** CONVERT METRIC/IMPERIAL ***********
// Converts quantities between metric and imperial
// ***********************************************
const convert = require('convert-units');
const bot = require('./bot');

const conversions = [{"metric": "cm", "imperial": "in"},
   {"metric": "m", "imperial": "ft"},
   {"metric": "km", "imperial": "mi"},
   {"metric": "g", "imperial": "oz"},
   {"metric": "kg", "imperial": "lb"},
   {"metric": "ml", "imperial": "fl-oz"},
   {"metric": "l", "imperial": "gal"},
   {"metric": "C", "imperial": "F"}];

function calculateConversion(amount, currentUnit, unitToConvertTo) {
   if (unitToConvertTo === "in") {
      let inches = convert(amount).from(currentUnit).to(unitToConvertTo).toFixed(2);
      const feet = parseInt(inches / 12, 10);
      if (feet === 0) {
         return inches + " in";
      } else {
         inches = (inches % 12).toFixed(1);
         return feet + "ft " + inches + " in";
      }
   } else {
      return convert(amount).from(currentUnit).to(unitToConvertTo).toFixed(2) + 
           " " + unitToConvertTo;
   }
}

module.exports = {
   
   convertUnits: function(data) {
      if (data.msg.startsWith("!convert ")) {
         const tokens = data.msg.split(/\s+/g);
         const amount = tokens[1];
         const unit = tokens[2];
         if (tokens.length >= 3 && !isNaN(amount)) {
            for (let i = 0; i < conversions.length; i++) { // traverse through conversions array
               for (let j = 0; j < 2; j++) { // traverse through the 2 units in each element in array
                  // currentUnit = the jth key in the ith element of the conversions array
                  let currentUnit = conversions[i][Object.keys(conversions[i])[j]];
                  let otherUnit = conversions[i][Object.keys(conversions[i])[Math.abs(j-1)]];
                  if (unit.toUpperCase() === currentUnit.toUpperCase()) {
                     bot.chat(calculateConversion(amount, currentUnit, otherUnit));
                     return;
                  }
               }             
            }
         }
         bot.chat("Invalid input. Format as one number followed by one valid unit keyword " +
              "listed under `!units` AlizeeNo");
      } 
   },

   units: function(data) {
      if (data.msg.startsWith("!units")) {
         let unitList = "Valid units: " + conversions[0].metric + ", " + conversions[0].imperial;
         for (let i = 1; i < conversions.length; i++) {
            unitList += ", " + conversions[i].metric + ", " + conversions[i].imperial; 
         }
         bot.chat(unitList);
      }
   }
};