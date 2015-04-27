// Prevent scrolling on an object
$.fn.preventScrolling = function(e) {
	var $target = $(e.target);
	var hasScrollBar = function($this) {
		return $this.get(0).scrollHeight > $this.outerHeight();
	};

	// Get which element could have scroll bars
	if(!hasScrollBar($target)) {
		$target = $target
			.parents()
			.filter(function() {return hasScrollBar($(this));})
			.first()
		;
	}
	
	// Prevent if nothing is scrollable
	if(!$target.length) {
		e.preventDefault();
	} else {
		var top = $target[0].scrollTop;
		var totalScroll = $target[0].scrollHeight;
		var currentScroll = top + $target[0].offsetHeight;
		
		// If at container edge, add a pixel to prevent outer scrolling
		if(top === 0) {
			$target[0].scrollTop = 1;
		} else if(currentScroll === totalScroll) {
			$target[0].scrollTop = top - 1;
		}
	}
};