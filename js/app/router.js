var Backbone = require("backbone");

module.exports = Backbone.Router.extend({
	routes: {
		"": "intro",
		"hello": "hello",
		"conversation": "conversation",
		'*error': 'error'
	}
});