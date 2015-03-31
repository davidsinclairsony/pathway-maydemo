(function($) {
	$(function() {
		
		// Functionality for testing
		(function() {
			var jqxhr = $.getJSON("js/people.js", function() {
				console.log("People files loaded.");
			}).fail(function() {
				console.log("Could not load people files.");
			});
			
			$("#frame button.refresh").on("click", function() {
				location.reload();
			});
			
			$("#frame .view.main.selecting .questions ul li").on("click", function() {
				$("#frame .view.main.selecting").removeClass("selecting").addClass("digesting");
				$(this).addClass("active");
			});
			
			$("#frame .lower button.ask").on("click", function() {
				$("#frame .view.main.digesting").removeClass("digesting").addClass("selecting");
				$("#frame .view.main .questions ul li.active").removeClass("active");
			});
		})();
		
		// Randomly set sources to available after 2s
		(function() {
			var randomSources = function() {
				$("#frame .view.main .people .person .sources ul li").each(function() {
					var $this = $(this);
					
					if(Math.round(Math.random())) {
						$(this).addClass("available");
					}
					
					$this.removeClass("waiting").addClass("done");
				});
			};
			
			setTimeout(randomSources, 1000);
		})();
		
		// Allow swiping between people
		(function() {
			var $list = $("#frame .view.main .people > ul");
			var originalLeft = $list.position().left;
			var edges = {
				"left": 84,
				"right": ($list.find("> li").length - 1) * -640 + 84
			};
			var startingX;

			$list.swipe({
				swipeStatus: function(event, phase, direction, distance) {
					// Swipe initials
					if(phase == "start") {
						startingX = event.pageX;
					}
					
					// Swipe in motion, move objects accordingly
					if(phase == "move") {
						var newPosition = event.pageX - startingX + originalLeft;
						$("#frame .view.main .people > ul").offset({left: newPosition});
					}
					
					// Swipe over threshhold
					if(phase == "end") {
						// Check if at bounds and update the original position
						if(
							originalLeft < edges.left &&
							originalLeft > edges.right
						) {
							if(direction == "left") {
								originalLeft -= 640;
							} else if(direction == "right") {
								originalLeft += 640;
							}
						} else if(
							originalLeft == edges.left &&
							direction == "left"
						) {
							originalLeft -= 640;
						} else if(
							originalLeft == edges.right &&
							direction == "right"
						) {
							originalLeft += 640;
						}
						
						$list.animate({left: originalLeft}, "fast", "easeOutBounce");
					}
					
					// Swipe under threshhold
					if(phase == "cancel") {
						$list.animate({left: originalLeft}, "fast", "easeOutBounce");
					}
				},
				triggerOnTouchEnd: false,
				threshold: 250
			});
		})();
		
	});
})(jQuery);