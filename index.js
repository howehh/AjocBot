// ***************** AJOCBOT MAIN ******************
// The main file for AjocBot that is ran in Node. It 
// determines which modules are enabled for AjocBot
// *************************************************
const bot = require('./lib/bot');

// Modules
const shutdown = require('./lib/shutdown');
const count = require('./lib/count');
const points = require('./lib/points');
const trivia = require('./lib/trivia');
require('./lib/alarm');
require('./lib/basiccommands');
require('./lib/convertunits');
require('./lib/dates');
require('./lib/define');
require('./lib/store');
require('./lib/notifications');
require('./lib/weather');
require('./lib/songs');
require('./lib/jinx');
