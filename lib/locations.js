// ************************** LOCATIONS **************************
// Informs user of the time, weather, etc of a given location
// ***************************************************************
const config = require('./../config');
const jsonUtil = require('./bot-utils/jsonutil');
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
   
   let result = `${day} ${hour}:`;
   result += (minutes < 10) ? ("0" + minutes) : minutes;
   result += ` ${amPm} ${opencageObj.short_name}`;
   return result;
}

// Searches the given location through opencage API. Chats error message if
// location not found, and calls the given callback if it is found, passing the response data
function searchLocation(loc, callback) {
   axios.get(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURI(loc)}&key=${config.geocodeKey}` +
             `&language=en&pretty=1`)
   .then(function(response) {
      if (response.data.total_results === 0) {
         bot.chat("Invalid location. AlizeeFail");
      } else {
         callback(response.data);
      }
   }).catch(function(error) {
      bot.chat("Invalid location. AlizeeFail");
   });
}

const chatEvents = {
   getWeather: function(data) {
      if (data.tokens[0] === "!weather" && data.tokens.length > 1) { 
         const city = data.msg.substring(9).trim();
         searchLocation(city, function(locData) {
            const topResult = locData.results[0];
            const coords = topResult.geometry; // object with lat key and lng key
            
            axios.get(`http://api.openweathermap.org/data/2.5/weather?lat=${ parseInt(coords.lat) }` 
                      + `&lon=${ parseInt(coords.lng) }&APPID=${ config.openweathermapKey }`)
            .then(function(response) {
               const tempK = jsonUtil.getKey(response.data, "temp");
               const temperatureF = Math.round(1.8 * (tempK - 273) + 32);
               const temperatureC = Math.round(tempK - 273);
               const weather = jsonUtil.getKey(response.data, "description");
               const humidity = jsonUtil.getKey(response.data, "humidity");
               bot.chat(`${topResult.formatted} is currently ${temperatureF} F (${temperatureC} C) with `
                        + `${weather} and ${humidity}% humidity AlizeeOP`);
            });
         });
         callbacks.cooldown(chatEvents.getWeather, 7000);
      }
   },
   
   getTime: function(data) {
      if (data.tokens[0] === "!time" && data.tokens.length > 1) {
         const loc = data.msg.substring(data.tokens[0].length + 1).trim();
         searchLocation(loc, function(responseData) {
            const timeObject = jsonUtil.getKey(responseData, "timezone");
            const formattedName = jsonUtil.getKey(responseData, "formatted");
            const time = getFormattedTime(timeObject);
            bot.chat(`Time in ${formattedName}: ${time} deteAlizee`);
         });
         callbacks.cooldown(chatEvents.getTime, 7000);
      }
   }
}
callbacks.addChatEvents(chatEvents);