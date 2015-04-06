(function() {
	// Mustache style templating
	_.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
	
	// ------------------------------------
	//	Models
	
	var Question = Backbone.Model.extend({});
	
	// ------------------------------------
	//	Collections
	
	var Questions = Backbone.Collection.extend({
		model: Question
	});
	
	// ------------------------------------
	//	Views
	
	var AppView = Backbone.View.extend({
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
				this.cssAnimate.call(previous.$el, "fadeOut", function () {
					previous.remove();
				});
			}

			this.$el.append(next.el);
			this.cssAnimate.call(next.$el, "fadeIn", function() {
				next.$el.removeClass("fadeIn");
			});
			this.currentView = next;
		},
		cssAnimate: function(cssClass, callback) {
			// Add class for animating and executes callback
			var $self = this;
			
			// Sets a new listener
			var setAnimationListener = function() {
				$self.one(
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
			};
			
			$self.addClass(cssClass);
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
			
			this.response = new ResponseView();
			this.$el.append(this.response.el);
		},
		render: function() {
			var self = this;

			$.get("/templates/conversation.html", function(data) {
				self.$el.append(data);
			}, 'html');
			
			return self;
		},
		events: {
			"click .ask": "askAnotherQuestion",
			"click .how, footer .close": "howToggler",
			"hidAllExceptSelectedQuestion": "prepareResponse",
			"revealedAllQuestions": "hideResponse"
		},
		howToggler: function() {
			var $know = this.$(".know");
			
			$know.toggleClass("off", $know.hasClass("on"));
			$know.toggleClass("on", !$know.hasClass("on"));
		},
		askAnotherQuestion: function() {
			this.questions.revealAllQuestions();
		},
		prepareResponse: function() {
			this.response.revealResponse(this.questions.selectedQuestion);
		},
		hideResponse: function() {
			this.response.hideResponse(this.questions.selectedQuestion);
		}
	});
	
	var QuestionsView = Backbone.View.extend({
		className: "questions",
		tagName: "ul",
		initialize: function() {
			var self = this;
			
			$.getJSON("/js/json/questions.js", function(data) {
				self.questions = new Questions(data);
				self.views = [];
				
				// Create question views
				self.questions.each(function(model) {
					self.views.push(new QuestionView({model: model}));
				});
				
				self.render();
			});
		},
		render: function() {
			this.$el.empty();
			
			var container = document.createDocumentFragment();
			
			// Render each question and add at end
			_.each(this.views, function(view) {
				container.appendChild(view.el);
			});
			
			this.$el.append(container);
			
			return self;
		},
		events: {
			"questionClicked": "questionClicked"
		},
		questionClicked: function(event, objects) {
			if(!this.selectedQuestion) {
				// Save view that was selected
				this.selectedQuestion = objects.selectedQuestion;
				
				this.hideAllExceptSelectedQuestion();
			} else {
				this.revealAllQuestions();
			}
		},
		hideAllExceptSelectedQuestion: function() {
			var self = this;
			
			// Bubble up the event
			self.$el.trigger("hidAllExceptSelectedQuestion");
			
			_.each(this.views, function(view) {
				if(view == self.selectedQuestion) {
					// Save current offset
					var currentOffset = self.selectedQuestion.$el.offset();
					
					self.selectedQuestion.$el.css("position", "absolute");
					
					// Save desired offset
					var desiredOffset = self.selectedQuestion.$el.offset();
					
					// Reset positioning and move question
					self.selectedQuestion.$el
						.css("position", "relative")
						.animate({top: desiredOffset.top - currentOffset.top}, 500, "linear")
					;
				} else {
					// Hide all other questions
					window.app.cssAnimate.call(view.$el, "fadeOut", function () {
						view.$el.removeClass("fadeOut");
						view.$el.css("visibility", "hidden");
					});
				}
			});
		},
		revealAllQuestions: function() {
			var self = this;
			
			if(self.selectedQuestion) {
				// Bubble up the event
				self.$el.trigger("revealedAllQuestions");
				
				_.each(this.views, function(view) {
					if(view == self.selectedQuestion) {
						// Move question back
						self.selectedQuestion.$el.animate({top: 0}, 500, "linear");
	
						// Clear out the selected quetion
						self.selectedQuestion = null;
					} else {
						view.$el.css("visibility", "visible");
						
						// Reveal other questions
						window.app.cssAnimate.call(view.$el, "fadeIn", function () {
							view.$el.removeClass("fadeIn");
						});
					}
				});
			}
		}
	});
	
	var QuestionView = Backbone.View.extend({
		tagName: "li",
		template: _.template("{{ text }}"),
		initialize: function() {
			this.render();
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		events: {
			"click": "clicked"
		},
		clicked: function() {
			this.$el.trigger("questionClicked", {selectedQuestion: this});
		}
	});
	
	var ResponseView = Backbone.View.extend({
		className: "response",
		initialize: function() {
			this.render();
			this.setToLoading();
		},
		render: function() {
			this.setToLoading();
			this.$el.css("display", "none");
			return this;
		},
		setToLoading: function() {
			this.$el.html('<div class="spinner loading"><div></div></div>');
		},
		revealResponse: function(answer) {
			var self = this;
			
			// Adjust size of answer area based on question size
			var top = answer.$el.parent().offset().top + answer.$el.outerHeight() + 10;
			var height = 550 - answer.$el.outerHeight() 
			
			self.$el.css({
				display: "block",
				top: top,
				height: height
			});
			
			window.app.cssAnimate.call(self.$el, "fadeIn", function () {
				self.$el.removeClass("fadeIn");
			});
			
			// Get the answer
			var ajax = $.getJSON(
				"/js/json/answers.js",
				answer.model.attributes,
				function(data) {
					// Add in answer
					self.$el.append(data[0].people[0]);
				}
			).fail(function() {
				self.$el.append("Sorry, Watson is currently unreachable.");
			})
			.always(function() {
				// Gracefully hide spinner
				self.$(".spinner").toggleClass("loading");
				
				window.app.cssAnimate.call(self.$(".spinner"), "done", function () {
					self.$(".spinner").removeClass("spinOut");
				});
			});
		},
		hideResponse: function() {
			var self = this;
			
			window.app.cssAnimate.call(self.$el, "fadeOut", function () {
				self.$el.removeClass("fadeOut").css("display", "none");
				self.setToLoading();
			});
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