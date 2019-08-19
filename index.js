// ***************** AJOCBOT MAIN ******************
// The main file for AjocBot that is ran in Node. It 
// determines which modules are enabled for AjocBot
// *************************************************

require('./lib/bot').connect(loadModules);

// After connecting to cytube, modules are loaded up
function loadModules() {
   require('./lib/shutdown');

   // Optional Modules
   require('./lib/count');
   require('./lib/pointsinterface');
   require('./lib/trivia');
   require('./lib/alarm');
   require('./lib/basiccommands');
   require('./lib/convertunits');
   require('./lib/dates');
   require('./lib/define');
   require('./lib/store');
   require('./lib/notifications');
   require('./lib/locations');
   require('./lib/songs');
   require('./lib/jinx');
}
