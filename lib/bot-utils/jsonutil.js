// ********************* JSON UTIL *********************
// Utility functions for parsing/traversing JSON objects
// *****************************************************

// Returns the value associated with the first occurrence of key
// in the given object tree
function getKey(obj, key) {
   if (typeof obj == "object" && obj !== null) {
      if (key in obj) {
         return obj[key];
      } else {
         for (let i in obj) {
            let result = getKey(obj[i], key);
            if (result !== undefined) {
               return result;
            }
         }
      }
   }
}

module.exports = {
   getKey: getKey
}
