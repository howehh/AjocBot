// ************************** LOCATIONS **************************
// Informs user of the time, weather, etc of a given location
// ***************************************************************
const config = require('./../config');
const callbacks = require('./callbacks');
const bot = require('./bot');
const axios = require('axios');

// Returns a time/date String in the format "DAY hh:mm AM/PM TIME_ZONE"
// given the timezone object from opencagedata
function getFormattedTime(opencageObj) {
   const locationMs = Date.now() + (opencageObj.offset_sec * 1000); // UTC time + offset
   const date = new Date(locationMs);
   
   const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
   const day = days[date.getUTCDay()];
   
   let hour = date.getUTCHours();
   const amPm = hour < 12 ? "AM" : "PM";
   hour = (hour % 12 == 0) ? 12 : hour % 12;
   const minutes = date.getUTCMinutes();
   
   let result = day + " " + (hour) + ":";
   result += (minutes < 10) ? ("0" + minutes) : minutes;
   result += " " + amPm + " " + opencageObj.short_name;
   return result;
}

// Searches the given location through opencage API. Chats error message if
// location not found, and calls the given callback if it is found, passing the response data
function searchLocation(loc, callback) {
   axios.get("https://api.opencagedata.com/geocode/v1/json?q=" +
                    encodeURI(loc) + "&key=" + config.geocodeKey + "&language=en&pretty=1")
   .then(function(response) {
      if (response.data.total_results === 0) {
         bot.chat("Invalid location. AlizeeFail");
      } else {
         callback(response.data);
      }
   });
}

module.exports = {
   getWeather: function(data) {
      if (data.msg.startsWith("!weather ")) { 
         const city = data.msg.substring(9).trim();
         searchLocation(city, function(locData) {
            const topResult = locData.results[0];
            const coords = topResult.geometry; // object with lat key and lng key
            
            axios.get("http://api.openweathermap.org/data/2.5/weather?lat=" + parseInt(coords.lat) 
                      + "&lon=" + parseInt(coords.lng) + "&APPID=" + config.openweathermapKey)
            .then(function(response) {
               const temperatureF = Math.round(1.8 * (response.data.main.temp - 273) + 32);
               const temperatureC = Math.round(response.data.main.temp - 273);
               const weather = response.data.weather[0].description;
               const humidity = response.data.main.humidity;
               bot.chat(topResult.formatted + " is currently " + temperatureF + 
                        " F (" + temperatureC + " C) with " + weather + " and " +
                        humidity + "% humidity AlizeeOP");
            });
         });
         callbacks.cooldown(module.exports.getWeather, 7000);
      }
   },
   
   getTime: function(data) {
      if (data.msg.startsWith("!time ")) {
         const loc = data.msg.substring(6).trim();
         searchLocation(loc, function(responseData) {
            const topResult = responseData.results[0];
            const timeObject = topResult.annotations.timezone;
            const time = getFormattedTime(timeObject);
            bot.chat("Time in " + topResult.formatted + ": " + time + " deteAlizee");
         });
         callbacks.cooldown(module.exports.getTime, 7000);
      }
   }
}

callbacks.addChatEvents(module.exports);