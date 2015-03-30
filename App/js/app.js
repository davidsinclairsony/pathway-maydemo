(function($) {
	$(function() {
		
		var jqxhr = $.getJSON("js/people.js", function() {
			console.log("People files loaded.");
		}).fail(function() {
			console.log("Could not load people files.");
		});
		
		// Randomly set sources to available after 2s
		var findRandomSources = function() {
			$("#frame .view.main.selecting .people .person .sources ul li").each(function() {
				var $this = $(this);
				
				if(Math.round(Math.random())) {
					$(this).addClass("available");
				}
				
				$this.removeClass("waiting").addClass("done");
			});
		};
		
		setTimeout(findRandomSources, 1000);
		
		// Allow swiping between people
		$("#frame .view.main").swipe({
			swipeStatus: function(event, phase, direction, distance) {
				if(phase == "move") {
					// Move all people with the swipe
					$("#frame .view.main .people > ul").offset(0, distance);
				}
				
				if(phase == "end") {
					str="Handler fired, you swiped " + direction;
				}
			},
			triggerOnTouchEnd: false,
			threshold: 200
		});
		
	});
})(jQuery);