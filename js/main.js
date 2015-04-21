requirejs.config({
	"baseUrl": "/",
	"paths": {
		// "maps": "https://maps.googleapis.com/maps/api/js?key=AIzaSyCAUtCOOD50R0La_672qtmDS0HPz985yE4",
		"jquery": "js/libraries/jquery-1.11.0.min",
		"underscore": "js/libraries/underscore-min",
		"backbone": "js/libraries/backbone-min",
		/*"localstorage": "js/libraries/backbone.localStorage-min",
		"waitForImages": "js/libraries/jquery.waitforimages.min",
		"hammer": "js/libraries/hammer.min",
		"hammerJquery": "js/libraries/jquery.hammer",
		"fastclick": "js/libraries/fastclick",
		"preventScrolling": "js/libraries/jquery.preventScrolling",
		"tweenMax": "js/libraries/TweenMax.min",*/
		
		"router": "js/router",
		"models": "js/models",
		"collections": "js/collections",
		"intro": "js/views/intro",
		/*"hello": "js/views/hello",
		"people": "js/views/conversation/people",
		"questions": "js/views/conversation/questions",
		"response": "js/views/conversation/response",
		"conversation": "js/views/conversation",*/
		"app": "js/app"
	},
	"shim": {
		"underscore": {
			"exports": "_"
		},
		"backbone": {
			"deps": ["jquery", "underscore"],
			"exports": "Backbone"
		}
	}
});