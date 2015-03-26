(function($) {
	$(function() {
		
		var jqxhr = $.getJSON("library/js/people.js", function() {
			
		}).fail(function() {
			console.log("Could not load people files.");
		});
		
		$("#frame .view.personas ul.people").on("click", "li", function() {
			var $this = $(this);
			
			$this.addClass("selected");
			$("#frame .view.personas").removeClass("select").addClass("conversation");
		});
		
		$("#frame .view.personas .side .back").on("click", function() {
			$("#frame .view.personas ul.people li").removeClass("selected");
			$("#frame .view.personas").removeClass("conversation").addClass("select");
		})
		
	});
})(jQuery);