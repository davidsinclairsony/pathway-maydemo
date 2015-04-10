(function($) {
	// Mustache style templating
	_.templateSettings = {
		evaluate: /\{\{#([\s\S]+?)\}\}/g,
		interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,
		escape: /\{\{\{([\s\S]+?)\}\}\}/g,
	}
	
	// ------------------------------------
	//	Models
	
	var QuestionModel = Backbone.Model.extend({});
	
	var PersonModel = Backbone.Model.extend({});
	
	// ------------------------------------
	//	Collections
	
	var QuestionsCollection = Backbone.Collection.extend({
		model: QuestionModel
	});
	
	var PeopleCollection = Backbone.Collection.extend({
		model: PersonModel
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
				var introView = new IntroView();
				
				self.goTo(introView);
				
				// Listen for end of view
				self.listenTo(introView, "end", function() {
					self.router.navigate("hello", {trigger: true});
				});
			});
			
			this.router.on("route:hello", function() {
				var helloView = new HelloView();
				
				self.goTo(helloView);
				
				// Listen for end of view
				self.listenTo(helloView, "end", function() {
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
			});
			
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
			});
			
			return self;
		}
	});
	
	var ConversationView = Backbone.View.extend({
		className: "view conversation",
		initialize: function() {
			this.render();
			
			// Child views
			this.peopleView = new PeopleView();
			this.$el.append(this.peopleView.el);
			
			this.questionsView = new QuestionsView();
			this.$el.append(this.questionsView.el);
			
			this.responseView = new ResponseView();
			this.$el.append(this.responseView.el);
		},
		render: function() {
			var self = this;

			$.get("/templates/conversation.html", function(data) {
				self.$el.append(data);
			});
			
			return self;
		},
		events: {
			"click .ask": "askAnotherQuestion",
			"click .how, footer .close": "howToggler",
			"hidAllExceptSelectedQuestion": "prepareForResponse",
			"revealedAllQuestions": "hideResponse",
			"dataSourced": "getAndShowResponse"
		},
		howToggler: function() {
			var $know = this.$(".know");
			
			$know.toggleClass("off", $know.hasClass("on"));
			$know.toggleClass("on", !$know.hasClass("on"));
		},
		askAnotherQuestion: function() {
			this.questionsView.revealAllQuestions();
		},
		prepareForResponse: function() {
			this.responseView.prepare(this.questionsView.selectedQuestion);
			
			// This will start the chiclets loading
			//this.peeople.selectedPerson.obtainData();
			// ...but for now/testing purposes...
			var self = this;
			setTimeout(function() {
				self.getAndShowResponse();
			}, 500);
		},
		getAndShowResponse: function() {
			this.responseView.get(
				this.peopleView.selectedPerson,
				this.questionsView.selectedQuestion
			);
		},
		hideResponse: function() {
			this.responseView.hide();
		}
	});
	
	var QuestionsView = Backbone.View.extend({
		className: "questions",
		tagName: "ul",
		initialize: function() {
			var self = this;
			
			$.getJSON("/js/json/questions.js", function(data) {
				self.questionsCollection = new QuestionsCollection(data);
				self.views = [];
				
				// Create question views
				self.questionsCollection.each(function(model) {
					self.views.push(new QuestionView({model: model}));
				});
				
				// Add in custom view
				var customQuestionView = new CustomQuestionView({model: new QuestionModel()});
				
				self.views.push(customQuestionView);
				
				self.render();
			});
		},
		render: function() {
			var self = this;
			
			self.$el.empty();
			
			var container = document.createDocumentFragment();
			
			// Render each question and add at end
			_.each(self.views, function(view) {
				container.appendChild(view.el);
			});
			
			self.$el.append(container);
			
			return self;
		},
		events: {
			"questionClicked": "questionClicked",
			"regenerateCustomQuestion": "regenerateCustomQuestion"
		},
		questionClicked: function(event, objects) {
			if(!this.selectedQuestion) {
				// Save view and hide others
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
					self.selectedQuestion.$el.css({
						position: "relative",
						transition: ".5s",
						top: desiredOffset.top - currentOffset.top
					});
				} else {
					// Hide all other questions
					window.app.cssAnimate.call(view.$el, "fadeOut", function () {
						view.$el.css("visibility", "hidden");
						view.$el.removeClass("fadeOut");
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
					// Reset custom question
					if(view instanceof CustomQuestionView) {
						view.stale();
					}
					
					if(view == self.selectedQuestion) {
						// Animate back to position, if needed
						if(!self.selectedQuestion.$el.is(":first-child")) {
							// Catch next animation and reset duration
							self.selectedQuestion.$el.one("transitionend", function() {
								if(view instanceof CustomQuestionView) {
									self.regenerateCustomQuestion();
								}
								
								self.selectedQuestion.$el.css("transition", 0);
								self.selectedQuestion = null;
							});

							// Move question
							self.selectedQuestion.$el.css("top", 0);
						} else {
							self.selectedQuestion.$el.css("transition", 0);
							self.selectedQuestion = null;
						}
					} else {
						// Reveal other questions
						view.$el.css("visibility", "visible");
						
						window.app.cssAnimate.call(view.$el, "fadeIn", function () {
							view.$el.removeClass("fadeIn");
						});
					}
				});
			}
		},
		regenerateCustomQuestion: function() {
			var self = this;
			
			// Bring current out of position
			var current = self.views.slice(-1)[0];
			current.$el.css({
				position: "absolute",
				top: current.$el.position().top,
				left: current.$el.position().left,
				width: current.$el.outerWidth(),
				zIndex: 10
			});
			
			// Add in new one
			var view = new CustomQuestionView({model: new QuestionModel()});
			self.$el.append(view.el);
			
			// Remove old when new present
			var i = setInterval(function() {
				if(jQuery.contains(self.el, view.el)) {
					clearInterval(i);
					
					current.remove();
					
					// Cleanup array
					self.views.pop();
					self.views.push(view);
				}
			}, 1);
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
	
	var CustomQuestionView = Backbone.View.extend({
		tagName: "li",
		className: "custom",
		status: "stale",
		initialize: function() {
			this.render();
		},
		render: function() {
			var self = this;
			
			$.get("/templates/conversation/questions/custom.html", function(data) {
				self.$el.append(data);
				self.input = self.$("input");
				self.button = self.$("button");
				self.button.css("display", "none");
			});
			
			return this;
		},
		events: {
			"click": "router"
		},
		router: function(e) {
			if($(e.target).is(this.button) && this.input.val() != "") {
				this.selected();
			} else if(this.status == "selected") {
				this.$el.trigger("questionClicked", {selectedQuestion: this});
			} else {
				this.editing();
			}
		},
		editing: function() {
			var self = this;
			
			self.status = "editing";
			
			// Allow editing
			self.input.prop("readonly", false).focus();
			
			// Animate height if not already done
			if(!self.$el.hasClass("focused")) {
				self.$el.addClass("focused");
				self.$el.css("transition", ".5s");
				
				// Remove transition
				self.$el.one("transitionend", function() {
					self.$el.css("transition", 0);
				});
				
				self.button.fadeIn(500);
			}
		},
		selected: function() {
			var self = this;
			
			self.status = "selected";
			
			// Save data to moodel
			self.model.set({"text": self.input.val()});
			
			// Disable editing and shrink
			self.input.prop("readonly", true);
			self.shrink();

			// Fire event to parent
			self.$el.trigger("questionClicked", {selectedQuestion: self});
		},
		stale: function() {
			this.input.val("");
			
			if(this.status == "editing") {
				this.shrink();
			}
			
			this.status = "stale";
		},
		shrink: function() {
			var self = this;
			
			self.$el.removeClass("focused");
			window.app.cssAnimate.call(self.button, "fadeOut", function () {
				self.button.removeClass("fadeOut").css("display", "none");
			});
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
		events: {
			"click footer div": "markRated"
		},
		markRated: function(e) {
			$(e.currentTarget).parent().find("div").removeClass("clicked");
			$(e.currentTarget).addClass("clicked");
		},
		setToLoading: function() {
			this.$el
				.empty()
				.addClass("waiting")
				.removeClass("done")
				.removeClass("map")
			;
		},
		prepare: function(answer) {
			var self = this;

			// Adjust size of answer area based on question size
			var top = answer.$el.parent().offset().top + answer.$el.outerHeight() + 10;
			var height = 520 - answer.$el.outerHeight();
			
			self.$el.css({
				display: "block",
				top: top,
				height: height
			});
			
			window.app.cssAnimate.call(self.$el, "fadeIn", function () {
				self.$el.removeClass("fadeIn");
			});
		},
		get: function(person, question) {
			var self = this;

			// To be sent to API
			var requestData = {
//				"personID": person.model.get("id"),
				"personID": 1,
				"questionID": question.model.get("id"),
				"questionText": question.model.get("text")
			};
			
			// Get the answer
			var ajax = $.getJSON(
				"/js/json/answer-1.js",
				requestData,
				function(data) {
					self.show(data);
				}
			).fail(function(data) {
				var error = {
					"text": [
						"Sorry, the server is currently unreachable."
					]
				};
				
				self.show(error)
			});
		},
		show: function(data) {
			var self = this;
			
			// Gracefully hide spinner
			self.$el.removeClass("waiting");
			
			window.app.cssAnimate.call(self.$el, "done", function () {
				self.$(".spinner").removeClass("spinOut");
			});
			
			// Add in all text
			if(data.text) {
				var container = document.createDocumentFragment();
			
				container.appendChild(document.createElement("main"));
				
				_.each(data.text, function(text) {
					var p = document.createElement("p");
					p.innerHTML = text;
					
					container.childNodes[0].appendChild(p);
				});
				
				self.$el.append(container);
				
				// This div is used for fade effect on scrolling text
				var overlay = document.createElement("div");
				overlay.className = "overlay";
				self.$el.append(overlay);
			} else {
				self.$el.append("<main><p>Sorry, data is unavailable at this time.</p></main>");
			}
			
			// Show map if locations are available
			if(data.locations) {
				self.$el.addClass("map");
				self.$el.append("<div class='container'><div id='map'></div></div>");
				
				$.getJSON("/js/json/map.js", function(styles) {
					var styledMap = new google.maps.StyledMapType(
						styles,
						{name: "Styled"}
					);
					
					var mapOptions = {
						mapTypeControlOptions: {
							mapTypeIds: [google.maps.MapTypeId.ROADMAP, "map_style"]
						},
						mapTypeControl: false,
						streetViewControl: false,
						zoomControl: true,
						zoomControlOptions: {
							style: google.maps.ZoomControlStyle.LARGE,
							position: google.maps.ControlPosition.LEFT_TOP
						}
					};
					
					var map = new google.maps.Map(document.getElementById("map"), mapOptions);
					
					map.mapTypes.set("map_style", styledMap);
					map.setMapTypeId("map_style");
					
					var bounds = new google.maps.LatLngBounds();
					var infowindow = new google.maps.InfoWindow();  
					
					// Add markers
					for (i = 0; i < data.locations.length; i++) {
						// Format title
						var content = "";
						
						if(data.locations[i].title) {
							content = "<div class='title'>" + data.locations[i].title + "</div>";
						}
						if(data.locations[i].description) {
							content += "<div class='description'>" + data.locations[i].description + "</div>";
						}
						
						var marker = new google.maps.Marker({
							position: new google.maps.LatLng(
								data.locations[i].coordinates.lattitude,
								data.locations[i].coordinates.longitude
							),
							map: map,
							title: content,
							visible: true
						});
						
						//extend the bounds to include each marker's position
						bounds.extend(marker.position);
						
						google.maps.event.addListener(marker, "click", (function(marker, i) {
							return function() {
								infowindow.setContent(marker.title);
								infowindow.open(map, marker);
							}
						})(marker, i));
					}
					
					map.fitBounds(bounds);
				});
			}
			
			// Add in thumbs up and down
			$.get("/templates/conversation/response/footer.html", function(data) {
				self.$el.append(data);
			});
		},
		hide: function() {
			var self = this;
			
			window.app.cssAnimate.call(self.$el, "fadeOut", function () {
				self.$el.removeClass("fadeOut").css("display", "none");
				self.setToLoading();
			});
		}
	});
	
	var PeopleView = Backbone.View.extend({
		className: "people",
		tagName: "ul",
		initialize: function() {
			var self = this;
			
			$.getJSON("/js/json/people.js", function(data) {
				self.peopleCollection = new PeopleCollection(data);
				self.views = [];
				
				// Create person views
				self.peopleCollection.each(function(model) {
					self.views.push(new PersonView({model: model}));
				});
				
				self.render();
			});
		},
		render: function() {
			this.$el.empty();
			
			var container = document.createDocumentFragment();

			// Render each person and add at end
			_.each(this.views, function(view) {
				container.appendChild(view.el);
			});
			
			this.$el.append(container);
			
			return self;
		}
	});
	
	var PersonView = Backbone.View.extend({
		tagName: "li",
		initialize: function() {
			var self = this;
			
			$.get("/templates/conversation/people/person.html", function(data) {
				self.template = _.template(data);
				self.render();
			});
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		events: {
			"click": "clicked"
		},
		clicked: function() {
			console.log("yow!!");
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
})(jQuery);