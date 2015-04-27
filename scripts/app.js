var IntroView = require("./app/views/intro");
var HelloView = require("./app/views/hello");
var ConversationView = require("./app/views/conversation");
var Router = require("./app/router");

module.exports = Backbone.View.extend({
	el: "#app",
	initialize: function() {
		var self = this;
		
		// Start router with predefined routes
		this.router = new Router();
		
		// Route actions
		this.router.on("route:intro", function() {
			var view = new IntroView();
			
			self.goTo(view);
			
			// Listen for end of view
			self.listenToOnce(view, "end", function() {
				self.router.navigate("hello", {trigger: true});
			});
		});
		
		this.router.on("route:hello", function() {
			var view = new HelloView();
			
			self.goTo(view);
			
			// Listen for end of view
			self.listenToOnce(view, "end", function() {
				self.router.navigate("conversation", {trigger: true});
			});
		});
		
		this.router.on("route:conversation", function() {
			var conversationView = new ConversationView();
			
			self.goTo(conversationView);
		});
		
		// Start tracking
		Backbone.history.start({pushState: true});
	},
	events: {
		"click .refresh": "refresh"
	},
	refresh: function() {
		window.location.replace("/");
	},
	goTo: function(view) {
		var self = this;
		var previous = this.currentView || null;
		var next = view;
		
		// Hide the current view
		if(previous) {
			TweenMax.to(previous.$el, .5, {
				opacity: 0,
				onComplete: function() {previous.remove();}
			});
		}
		
		// Add , hide, and wait until loaded
		self.currentView = next;
		self.$el.append(next.el);
		next.$el.hide();
		
		self.listenToOnce(next, "loaded", function() {
			// Wait for images and reveal
			next.$el.waitForImages(function() {
				self.$el.removeClass("spinner").addClass("spinOut");
				next.$el.show();
				TweenMax.from(next.$el, .5, {opacity: 0});
			});
		});
	},
});