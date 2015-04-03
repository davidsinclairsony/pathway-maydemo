(function() {
	// ------------------------------------
	//	Models
	
	var Question = Backbone.Model.extend({
		
	});
	
	var Questions = Backbone.Collection.extend({
		model: Question
	});
	
	// ------------------------------------
	//	Views
	
	var AppView = Backbone.View.extend({
		el: "#app",
		initialize: function() {
			var self = this;
			
			// Make templating look cooler
			_.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
			
			// Start router with predefined routes
			this.router = new Router();
			
			// Route actions
			this.router.on("route:intro", function() {
				var view = new IntroView();
				
				self.goTo(view);
				
				// Listen for end of view
				self.listenTo(view, "end", function() {
					self.router.navigate("hello", {trigger: true});
				});
			});
			
			this.router.on("route:hello", function() {
				var view = new HelloView();
				
				self.goTo(view);
				
				// Listen for end of view
				self.listenTo(view, "end", function() {
					self.router.navigate("conversation", {trigger: true});
				});
			});
			
			this.router.on("route:conversation", function() {
				var view = new ConversationView();
				
				self.goTo(view);
			});
			
			// Start tracking
			Backbone.history.start({pushState: true});
		},
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

			this.$el.append(next.el);
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

			$.get("/templates/intro.html", function(data) {
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
			
			// Button to end
			self.$el.one("click", "button", function() {
				self.trigger("end");
			});
		},
		render: function() {
			var self = this;

			$.get("/templates/hello.html", function(data) {
				self.$el.html(data);
			}, 'html');
			
			return self;
		}
	});
	
	var ConversationView = Backbone.View.extend({
		className: "view conversation selecting",
		initialize: function() {
			this.render();
			
			// Child views
			this.questions = new QuestionsView();
			this.$el.append(this.questions.el);
			
		},
		render: function() {
			var self = this;

			$.get("/templates/conversation.html", function(data) {
				self.$el.append(data);
			}, 'html');
			
			return self;
		},
		events: {
			"click .ask": "showQuestions",
			"click .how, footer .close": "howToggler"
		},
		howToggler: function() {
			var $know = this.$(".know");
			
			$know.toggleClass("off", $know.hasClass("on"));
			$know.toggleClass("on", !$know.hasClass("on"));
		}
	});
	
	var QuestionsView = Backbone.View.extend({
		className: "questions",
		initialize: function() {
			var self = this;
			
			$.getJSON("/js/json/questions.js", function(data) {
				self.questions = new Questions(data);
				this.render();
			});
		},
		render: function() {
			Todos.each(this.addOne, this);
			
			return self;
		},
	});
	
	var QuestionView = Backbone.View.extend({
		tag: "li",
		template: _.template("{{text}}"),
		initialize: function() {
			this.render();
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
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