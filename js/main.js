var $ = require("jquery");
var _ = require("underscore");
var attachFastClick = require("./libraries/fastclick");
var AppView = require("./app");

// Mustache style templating
_.templateSettings = {
	evaluate: /\{\{#([\s\S]+?)\}\}/g,
	interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,
	escape: /\{\{\{([\s\S]+?)\}\}\}/g,
};

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

//	Initiation
$(window).load(function() {
	$(document).on("touchstart mousedown", function(e) {
		// Prevent scrolling on any touches to screen
		// $(this).preventScrolling(e);
		
		// Reset time
		refreshTime = 0;
	});
	
	// Fast clicks for touch users
	attachFastClick(document.body);
	
	// Start timer
	// refreshTimer();
			
	// Start!
	
	window.app = new AppView();
});