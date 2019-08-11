// *************************** WEATHER ***************************
// Informs user of the temperature and weather in a given location
// ***************************************************************
const config = require('./../config');
const callbacks = require('./callbacks');
const bot = require('./bot');
const axios = require('axios');

module.exports = {
   getWeather: function(data) {
      if (data.msg.startsWith("!weather ")) { 
         const city = data.msg.substring(9);
         axios.get("http://api.openweathermap.org/data/2.5/weather?q=" + city + 
                   "&APPID=" + config.openweathermapKey)
         .then(function(response) {
            const place = response.data.name + ", " + response.data.sys.country;
            const temperatureF = Math.round(1.8 * (response.data.main.temp - 273) + 32);
            const temperatureC = Math.round(response.data.main.temp - 273);
            const weather = response.data.weather[0].description;
            bot.chat(place + ", is currently " + temperatureF + 
                     " F (" + temperatureC + " C) with " + weather + " AlizeeOP");
         })
         .catch(function(error) { // error message if location isn't readable.
            if (error.response.status === 404) {
               bot.chat("Invalid city name. AlizeeFail");
            }
         });
         callbacks.cooldown(module.exports.getWeather, 5000);
      }
   }
}

callbacks.addMultipleChatEvents(module.exports);