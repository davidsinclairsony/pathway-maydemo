(function() {
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
		initialize: function() {
			var self = this;
			
			// Make templating look cooler
			_.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
			
			// Start router with predefined routes
			this.router = new Router();
			
			// Route actions
			this.router.on('route:intro', function() {
				var view = new IntroView();
				self.goTo(view);
				
				// Listen for end of view
				this.listenTo(view, "end", function() {
					var view = new HelloView();
					self.goTo(view);
				});
			});
			
			this.router.on('route:hello', function() {
				var view = new HelloView();
				self.goTo(view);
			});
			
			// Start tracking
			Backbone.history.start({pushState: true});
		},
		el: "#app",
		events: {
			"click .refresh": "refresh"
		},
		refresh: function() {
			window.location.replace("/");
		},
		goTo: function(view) {
			var previous = this.currentView || null;
			var next = view;

			if(previous) {
				this.transitionOut.call(previous, function () {
					previous.remove();
				});
			}
			
			this.$el.append(next.$el);
			this.transitionIn.call(next);
			this.currentView = next;
		},
		transitionIn: function(callback) {
			this.$el.addClass("fadeIn");
			this.$el.one('transitionend', function () {
				if (_.isFunction(callback)) {
					callback();
				}
			});
		},
		transitionOut: function(callback) {
			var view = this;
			
			view.$el.removeClass("fadeIn").addClass("fadeOut");
			view.$el.one(
				"webkitAnimationEnd oanimationend msAnimationEnd animationend",
				function () {
					console.log("ended");
					if (_.isFunction(callback)) {
						callback();
					}
				}
			);
		}
	});
	
	var IntroView = Backbone.View.extend({
		className: "view intro",
		initialize: function() {
			var self = this;
			
			self.render();
			
			// Fire event when animations end
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
		}
	});
	
	// ------------------------------------
	//	Initiation
	
	$(function() {
		// Pretty much the controller
		window.app = new AppView();
	});
} ());