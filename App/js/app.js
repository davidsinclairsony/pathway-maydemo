$(function() {
	console.log("-");
	
	// ------------------------------------
	//	Models
	
	// Person model
	var Person = Backbone.Model.extend({});
	
	// People collection
	var People = Backbone.Collection.extend({
		model: Person,
		localStorage: new Backbone.LocalStorage("maydemo-backbone")
	});
	
	var people = new People();

	// ------------------------------------
	//	Views
	
	var AppView = Backbone.View.extend({
		el: $("#app"),
		events: {
			"click .refresh": "refresh"
		},
		refresh: function() {
			window.location.replace("/");
		}
	});
	
	var IntroView = Backbone.View.extend({
		className: "view intro",
		initialize: function() {
			var self = this;
			
			self.render();
			
			// When the last element finishes animating
			self.$el.one(
				"webkitAnimationEnd oanimationend msAnimationEnd animationend",
				"p",
				function() {self.trigger("end");}
			);
		},
		render: function() {
			var self = this;

			$.get("templates/intro.html", function(data) {
				self.$el.html(data);
			}, 'html');
			
			return self;
		}
	});
	
	var HelloView = Backbone.View.extend({
		className: "view hello",
		initialize: function() {
			var self = this;
			
			self.render();
		},
		render: function() {
			var self = this;

			$.get("templates/hello.html", function(data) {
				self.$el.html(data);
			}, 'html');
			
			return self;
		},
		events: {
			"click button": "end"
		},
		end: function() {
			this.trigger("end");
		}
	});
	
	// ------------------------------------
	//	Router
	
	var Router = Backbone.Router.extend({
		routes: {
			"": "intro",
			"hello": "hello",
			"conversation": "conversation",
			'*error': 'error'
		},
		intro: function() {
			console.log("home");
		},
		hello: function() {
			console.log("hello");
		},
		conversation: function() {
			console.log("conversation");
		},
		error: function() {
			console.log("error");
		}
	});
	
	var app = new AppView();
	var router = new Router();
	Backbone.history.start({pushState: true});
	
	
	
});