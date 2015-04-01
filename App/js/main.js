// Require.js allows us to configure shortcut alias
// There usage will become more apparent further along in the tutorial.
require.config({
	paths: {
		jquery: "js/libraries/jquery-1.11.0.min.js",
		underscore: "js/libraries/underscore-min.js",
		backbone: "js/libraries/backbone-min.js",
		localStorage: "js/libraries/backbone.localStorage-min.js",
		hammer: "js/libraries/hammer.min.js"
	}

});

require([

  // Load our app module and pass it to our definition function
  'app',
], function(App){
  // The "app" dependency is passed in as "App"
  App.initialize();
});