(function($) {
	
	$(document).ready(function() {
		if($("body").hasClass("page")) {
			console.log(1);
			
			if($(window).width() < 480) {
				console.log(2);
			}
		}
	});
	
	$(window).load(function() {
		
	});
	
})(jQuery);


