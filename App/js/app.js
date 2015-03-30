(function($) {
	$(function() {
		
		var jqxhr = $.getJSON("js/people.js", function() {
			console.log("People files loaded.");
		}).fail(function() {
			console.log("Could not load people files.");
		});
		
		$("#frame button.refresh").on("click", function() {
			location.reload();
		});
		
		// Randomly set sources to available after 2s
		(function() {
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
		})();
		
		// Allow swiping between people
		(function() {
			var $peopleList = $("#frame .view.main .people > ul");
			var peopleListOriginalPositionLeft = $peopleList.position().left;
			var peopleListEdges = {
				"left": 84,
				"right": ($peopleList.find("> li").length - 1) * -640 + 84
			};
			var startingX;

			$("#frame .view.main").swipe({
				swipeStatus: function(event, phase, direction, distance) {
					// Swipe initials
					if(phase == "start") {
						startingX = event.pageX;
					}
					
					// Swipe in motion, move objects accordingly
					if(phase == "move") {
						var newPositionLeft = event.pageX - startingX + peopleListOriginalPositionLeft;
						$("#frame .view.main .people > ul").offset({left: newPositionLeft});
					}
					
					// Swipe over threshhold
					if(phase == "end") {
						// Check if at bounds and update the original position
						
						console.log(peopleListOriginalPositionLeft);
						console.log(peopleListEdges.left);
						console.log(peopleListEdges.right);
						console.log("---");
						
						var setNewPosition = function() {
							if(direction == "left") {
								peopleListOriginalPositionLeft -= 640;
							} else if(direction == "right") {
								newPositionLeft = peopleListOriginalPositionLeft += 640;
							}
						}
						
						if(
							peopleListOriginalPositionLeft < peopleListEdges.left &&
							peopleListOriginalPositionLeft > peopleListEdges.right
						) {
							setNewPosition();
						} else if(
							peopleListOriginalPositionLeft == peopleListEdges.left &&
							direction == "left"
						) {
							setNewPosition();
						} else if(
							peopleListOriginalPositionLeft == peopleListEdges.right &&
							direction == "right"
						) {
							setNewPosition();
						}
						
						$peopleList.animate({left: peopleListOriginalPositionLeft}, "fast", "easeOutBounce");
					}
					
					// Swipe under threshhold
					if(phase == "cancel") {
						$peopleList.animate({left: peopleListOriginalPositionLeft}, "fast", "easeOutBounce");
					}
				},
				triggerOnTouchEnd: false,
				threshold: 300
			});
		})();
		
	});
})(jQuery);