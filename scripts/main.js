var AppView = require("./app");
var config = require("./config");

//	Initiation
$(window).load(function() {
	// Timer code
	var resetTimer = function(t) {
		if(t === 0) {
			clearTimeout(timer);
		}
		if(t > 90) {
			window.location.replace("/");
		} else {
			t++;
			timer = setTimeout(function() {resetTimer(t);}, 1000);
		}
	};
	
	// Start timer
	if(config.timer) {
		var timer = setTimeout(function() {resetTimer(0);}, 1000);
	}
	
	$(document).on("touchstart mousedown", function(e) {
		// Prevent scrolling on any touches to screen
		$(this).preventScrolling(e);
		
		// Reset timer
		resetTimer(0);
	});
	
	// Fast clicks for touch users
	FastClick.attach(document.body);
	
	// Start!
	window.app = new AppView();
});