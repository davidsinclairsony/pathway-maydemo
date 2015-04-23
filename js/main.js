var AppView = require("ome/app");

//	Initiation
$(window).load(function() {
	// Timer code
	var refreshTime = 0;
	var refreshTimer = function() {
		if(refreshTime > 90) {
			window.location.replace("/");
		} else {
			refreshTime++;
			setTimeout(function() {refreshTimer();}, 1000);
		}
	};
	
	// Start timer
	// refreshTimer();
	
	$(document).on("touchstart mousedown", function(e) {
		// Prevent scrolling on any touches to screen
		$(this).preventScrolling(e);
		
		// Reset time
		refreshTime = 0;
	});
	
	// Fast clicks for touch users
	FastClick.attach(document.body);
	
	// Start!
	window.app = new AppView();
});