(function($) {
	$(function() {
		
		var jqxhr = $.getJSON("library/js/people.js", function() {
			
		}).fail(function() {
			console.log("Could not load people files.");
		});
		
	});
})(jQuery);