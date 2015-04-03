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
			// For resetting everything
			window.location.replace("/");
		},
		
		goTo: function(view) {
			// Transition from current view to new
			var previous = this.currentView || null;
			var next = view;

			// Hide the current view
			if(previous) {
				this.cssAnimate.call(previous, "fadeOut", function () {
					previous.remove();
				});
			}

			this.$el.append(next.$el);
			this.cssAnimate.call(next, "fadeIn", function() {
				next.$el.removeClass("fadeIn");
			});
			this.currentView = next;
		},
		
		cssAnimate: function(cssClass, callback) {
			// Add class for animating and executes callback
			var self = this;
			
			// Sets a new listener
			var setAnimationListener = function() {
				self.$el.one(
					"webkitAnimationEnd oanimationend msAnimationEnd animationend",
					function(e) {
						// Check if event is significant
						if(
							e.originalEvent.animationName == cssClass &&
							e.target === e.currentTarget
						) {
							if (_.isFunction(callback)) {
								callback();
							}
						} else {
							setAnimationListener();
						}
					}
				);
			}
			
			self.$el.addClass(cssClass);
			setAnimationListener();
		}
	});
	
	var IntroView = Backbone.View.extend({
		className: "view intro",
		initialize: function() {
			var self = this;
			
			self.render();
			
			// Fire event when last animation ends
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
	
	$(".testing").on(
		"webkitAnimationEnd oanimationend msAnimationEnd animationend",
		function () {
			console.log("some other element");
		}
	);
} ());