/*jshint -W008 */

(function($) {
	// Mustache style templating
	_.templateSettings = {
		evaluate: /\{\{#([\s\S]+?)\}\}/g,
		interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,
		escape: /\{\{\{([\s\S]+?)\}\}\}/g,
	};
	
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
				var conversationView = new ConversationView();
				
				self.goTo(conversationView);
			});
			
			// Set default to be waiting
			self.$el.addClass("spinner");
			
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
			
			self.listenTo(next, "loaded", function() {
				// Wait for images and reveal
				next.$el.waitForImages(function() {
					self.$el.removeClass("spinner").addClass("spinOut");
					next.$el.show();
					TweenMax.from(next.$el, .5, {opacity: 0});
				});
			});
		},
	});
	
	var IntroView = Backbone.View.extend({
		className: "view intro",
		initialize: function() {
			var self = this;
			
			self.render();
			
			setTimeout(function() {self.trigger("end");}, 7000);
		},
		render: function() {
			var self = this;

			self.$el.load("/templates/intro.html", function() {
				// Signal to parent
				self.trigger("loaded");
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

			self.$el.load("/templates/hello.html", function() {
				// Signal to parent
				self.trigger("loaded");
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
				self.$el.hammer({domEvents: true});
				self.trigger("loaded");
			});
			
			return self;
		},
		events: {
			"click .ask": "askAnotherQuestion",
			"click .how, footer .close": "howToggler",
			"requestToRevealSelectedQuestion": "askAnotherQuestion",
			"hidAllExceptSelectedQuestion": "prepareForResponse",
			"revealedAllQuestions": "hideResponse",
			"dataSourced": "getAndShowResponse",
			"panstart": "panHandler",
			"pan": "panHandler",
			"swiped": "swipeHandler",
		},
		panHandler: function(e) {
			// Prevent pan/swipe on response view
			if(
				e.originalEvent &&
				!$(e.target).parents(".response").length &&
				!$(e.target).hasClass("response")
			) {
				this.peopleView.panHandler(e);
			}
		},
		swipeHandler: function(event, objects) {
			this.peopleView.swipeHandler(objects.event);
			
			if(this.questionsView.selectedQuestion) {
				// Reset response view
				this.responseView.setToLoading();
				
				// Prepare for response
				this.prepareForResponse();
			}
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
			TweenMax.to(this.$(".lower"), .5, {opacity: 1});
			
			// This will start the chiclets loading
			this.peopleView.selectedPerson.obtainData();
		},
		getAndShowResponse: function() {
			this.responseView.get(
				this.peopleView.selectedPerson,
				this.questionsView.selectedQuestion
			);
		},
		hideResponse: function() {
			this.responseView.hide();
			TweenMax.to(this.$(".lower"), .5, {opacity: 0});
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
				
				// Add in custom question
				self.views.push(new CustomQuestionView({
					model: new QuestionModel()
				}));
				
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
				this.$el.trigger("requestToRevealSelectedQuestion");
			}
		},
		hideAllExceptSelectedQuestion: function() {
			var self = this;
			
			// Bubble up the event
			self.$el.trigger("hidAllExceptSelectedQuestion");
			
			_.each(this.views, function(view) {
				if(view == self.selectedQuestion) {
					// Save current offset
					var currentOffset = view.$el.offset();
					
					view.$el.css("position", "absolute");
					
					// Save desired offset
					var desiredOffset = view.$el.offset();
					
					// Reset positioning and move question
					TweenMax.to(view.$el, .5, {
						position: "relative",
						top: desiredOffset.top - currentOffset.top
					});
				} else {
					// Hide all other questions
					TweenMax.to(view.$el, .5, {autoAlpha: 0});
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
						self.selectedQuestion = null;
						
						// Animate back to position, if needed
						if(!view.$el.is(":first-child")) {
							TweenMax.to(view.$el, .5, {
								top: 0,
								onComplete: function() {
									if(view instanceof CustomQuestionView) {
										self.regenerateCustomQuestion();
									}
								}
							});
						}
					} else {
						// Reveal other questions
						TweenMax.to(view.$el, .5, {autoAlpha: 1});
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
				self.$input = self.$("input");
				self.$button = self.$("button");
				self.$button.css("display", "none");
			});
			
			return this;
		},
		events: {
			"click": "router",
			"keyup input": "keyHandler"
		},
		router: function(e) {
			if($(e.target).is(this.$button) && this.$input.val() !== "") {
				this.selected();
			} else if(this.status == "selected") {
				this.$el.trigger("questionClicked", {selectedQuestion: this});
			} else {
				this.editing();
			}
		},
		keyHandler: function(e) {
			if(e.keyCode == 13){
				this.$button.click();
			}
		},
		editing: function() {
			var self = this;
			
			self.status = "editing";
			
			// Allow editing
			self.$input.prop("readonly", false).focus();
			
			// Animate height if not already done
			if(!self.$el.hasClass("focused")) {
				self.$el.addClass("focused").css("transition", ".5s");
				
				// Remove transition
				self.$el.one("transitionend", function() {
					self.$el.css("transition", 0);
				});
				
				TweenMax.fromTo(self.$button, .5,
					{opacity: 0, display: "block"},
					{opacity: 1}
				);
			}
		},
		selected: function() {
			var self = this;
			
			self.status = "selected";
			
			// Save data to moodel
			self.model.set({"text": self.$input.val()});
			
			// Disable editing and shrink
			self.$input.blur().prop("readonly", true);
			self.shrink();

			// Fire event to parent
			self.$el.trigger("questionClicked", {selectedQuestion: self});
		},
		stale: function() {
			this.$input.val("");
			
			if(this.status == "editing") {
				this.shrink();
			}
			
			this.status = "stale";
		},
		shrink: function() {
			var self = this;
			
			self.$el.removeClass("focused");
			
			TweenMax.to(self.$button, .5, {
				opacity: 0,
				display: "none"
			});
		}
	});
	
	var ResponseView = Backbone.View.extend({
		className: "response",
		initialize: function() {
			var self = this;
			
			// Get stored responses and setup
			$.getJSON("/js/json/answers.js", function(data) {
				self.answers = data;
				self.render();
				self.setToLoading();
			});
		},
		render: function() {
			this.setToLoading();
			this.$el.hide();
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
				.addClass("spinner")
				.removeClass("spinOut")
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
			
			// Fade in response
			TweenMax.fromTo(self.$el, .5, {opacity: 0}, {opacity: 1});
		},
		get: function(person, question) {
			var self = this;
			var questionID = question.model.get("id");
			var personID = person.model.get("id");
			
			// Check if stored response
			if(question.model.get("id") < 4) {
				var html = "<p>Sorry, there was an error.</p>";
				
				switch(question.model.get("id")) {
					case 1:
						html =
							person.model.get("name") +
							self.answers[0].parts[0] +
							"500" +
							self.answers[0].parts[1] +
							person.model.get("goals") +
							self.answers[0].parts[2] +
							self.answers[0].responses[Math.floor(Math.random() * 6)]
						;
						break;
					case 2:
						html = 0;
						break;
					case 3:
						html = self.answers[2][personID - 1];
						break;
				}
				
				setTimeout(function() {self.show(html);}, 3);
			} else {
				// To be sent to API
				var requestData = {
					"userId": 1, // personID,
					"question": {
						"questionText": question.model.get("text")
					}
				};
				
				// Get the answer
				$.ajax({
					url: "http://" + window.location.host + ":3000/ask",
					data: requestData,
					dataType: "jsonp",
					timeout: 15000
				}).always(function(data, status, jqxhr) {
					self.show(data, status);
				});
			}
		},
		show: function(data, status) {
			var self = this;
			
			// Gracefully hide spinner
			self.$el.removeClass("spinner").addClass("spinOut");
			
			var showError = function(error) {
				self.$el.append("<main><p>Sorry, there was an error: " + error + "</p></main>");
			};
			
			if(status) {
				if(status == "success") {
					if(data.answer.answers[0]) {
						self.$el.append("<main>" + data.answer.answers[0].formattedText + "</main>");
					} else {
						showError("no answer");
					}
				} else {
					showError(status);
				}
			} else {
				self.$el.append("<main>" + data + "</main>");
			}
			
			// Add in all text
/*
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
							};
						})(marker, i));
					}
					
					map.fitBounds(bounds);
				});
			}
*/
			// Add in thumbs up and down
			$.get("/templates/conversation/response/footer.html", function(data) {
				self.$el.append(data);
			});
		},
		hide: function() {
			var self = this;
			
			TweenMax.fromTo(self.$el, .5, {opacity: 1}, {
				opacity: 0,
				display: "none",
				onComplete: function() {
					self.setToLoading();
				}
			});
		}
	});
	
	var PeopleView = Backbone.View.extend({
		className: "people",
		tagName: "ul",
		swipeThreshold: 125,
		initialize: function() {
			var self = this;
			
			$.getJSON("/js/json/people.js", function(data) {
				self.peopleCollection = new PeopleCollection(data);
				self.views = [];
				
				// Create current selected person view
				self.views.push(new PersonView({model: self.peopleCollection.first()}));
				
				// Set selected person to center
				self.setSelectedPerson(self.views[0]);
				
				// Draw people
				self.render();
			});
		},
		render: function() {
			// Add selected person
			this.$el.html(this.views[0].el);

			// Add the others around
			this.pad();
			
			// Set ending position
			this.positionLeft = this.$el.position().left;

			return self;
		},
		setSelectedPerson: function(view) {
			// Turn off current selected person
			if(this.selectedPerson) {
				this.selectedPerson.selected = false;
			}
			
			this.selectedPerson = view;
			view.selected = true;
		},
		pad: function() {
			// Pads to 5 elements total, around the selected person
			
			// Get location in views of selected person
			var indexOfSelectedPerson = this.views.indexOf(this.selectedPerson);
			var i, modelIndex, model, view;
			
			// Generate and add views before the selected person
			while(indexOfSelectedPerson < 2) {
				// Get index of first view
				modelIndex = this.peopleCollection.indexOf(this.views[0].model);
				
				// Determine which model to use
				if(modelIndex === 0) {
					model =  this.peopleCollection.last();
				} else {
					model = this.peopleCollection.at(modelIndex - 1);
				}

				view = new PersonView({model: model});
				this.views.unshift(view);
				this.$el.prepend(view.el);
				
				indexOfSelectedPerson = this.views.indexOf(this.selectedPerson);
			}
			
			
			// Add views for after the selected person
			while(this.views.length < 5) {
				// Get index of last view
				modelIndex = this.peopleCollection.indexOf(_.last(this.views).model);
				
				// Determine which model to use
				if(modelIndex == _.size(this.peopleCollection) - 1) {
					model =  this.peopleCollection.first();
				} else {
					model = this.peopleCollection.at(modelIndex + 1);
				}

				view = new PersonView({model: model});
				this.views.push(view);
				this.$el.append(view.el);
			}
		},
		panHandler: function(e) {
			var self = this;

			if(e.originalEvent.gesture.isFinal) {
				// Fire event to parent if swipe, otherwise snap back
				if(
					e.originalEvent.gesture.deltaX < -self.swipeThreshold ||
					e.originalEvent.gesture.deltaX > self.swipeThreshold)
				{
					self.$el.trigger("swiped", {event: e});
				} else {
					TweenMax.to(self.$el, .1, {left: self.positionLeft});
				}
			} else {
				// Find new position and move
				var left = self.positionLeft + e.originalEvent.gesture.deltaX;
				self.$el.css({left: left});
			}
		},
		swipeHandler: function(e) {
			var self = this;
			var currentIndex = self.views.indexOf(self.selectedPerson);
			
			// Determine swipe direction
			if(e.originalEvent.gesture.deltaX < 0) {
				// Set to forward one
				self.setSelectedPerson(self.views[currentIndex + 1]);
				
				// Animate to correct position
				TweenMax.to(self.$el, .1, {
					left: self.positionLeft - 640,
					onComplete: function() {
						// Remove all aspects of edge view
						_.first(self.views).remove();
						self.views.shift();
						
						// Add in new
						self.pad();
						
						// Reset margins
						self.$("> li:first-child").css({marginLeft: 0});
						self.$("> li:nth-child(n + 2)").css({marginLeft: "40px"});
						
						// Adjust positioning
						self.$el.css({left: self.positionLeft});
					}
				});
			} else {
				// Set to back one
				self.setSelectedPerson(self.views[currentIndex - 1]);
				
				// Animate to correct position
				TweenMax.to(self.$el, .1, {
					left: self.positionLeft + 640,
					onComplete: function() {
							// Remove all aspects of edge view
						_.last(self.views).remove();
						self.views.pop();
						
						// Add in new
						self.pad();
						
						// Reset margins
						self.$("> li:first-child").css({marginLeft: 0});
						self.$("> li:nth-child(n + 2)").css({marginLeft: "40px"});
						
						// Adjust positioning
						self.$el.css({left: self.positionLeft});
					}
				});
			}
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
			"click .picture": "popupHandler",
			"click .sources li": "popupHandler"
		},
		obtainData: function() {
			var self = this;
			
			self.$("li.available").each(function() {
				var $this = $(this);
				
				$this.removeClass("spinOut").addClass("spinner");

				// Data obtained after random time
				setTimeout(function() {
					$this.removeClass("spinner").addClass("spinOut");
				}, Math.floor(Math.random() * 2000 + 1000));
			});
			
			// Signal to parent data is ready
			self.$el.trigger("dataSourced");
		},
		popupHandler: function(e) {
			// Check if current person being clicked on
			if(this.selected) {
				e.stopImmediatePropagation();
				var self = this;
				var $newPopup = $(e.target).siblings(".popup");
				
				if(!self.$popup) {
					this.popupShower($newPopup);
				} else {
					var isSameAsCurrent = self.$popup.is($newPopup);

					// Hide current popup
					this.popupRemover(self.$popup);
					
					if(!isSameAsCurrent) {
						// Show new
						self.$popup = $newPopup;
						this.popupShower(self.$popup);
					}
				}
			}
		},
		popupRemover: function($p) {
			this.$popup = null;
			
			// Fade and hide popup
			TweenMax.to($p, .5, {
				opacity: 0,
				display: "none",
				overwrite: "all"
			});

			// Turn off listener
			$("body").off("touchend click");
		},
		popupShower: function($p) {
			var self = this;
			
			self.$popup = $p;
			
			// Show and fade in
			TweenMax.fromTo($p, .5,
				{opacity: 0, display: "block"},
				{opacity: 1, overwrite: "all"}
			);
			
			// Listen for anything to turn off
			$("body").one("touchend click", function() {
				self.popupRemover($p);
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
	
	$(window).load(function() {
		// Timer code
		var refreshTime = 0;
		var refreshTimer = function() {
			if(refreshTime > 90) {
				window.location.replace("/");
			} else {
				refreshTime++;
				setTimeout(function() {refreshTimer();}, 1000);
			}
		};
//		refreshTimer();
		
		$(document).on("touchstart mousedown", function(e) {
			// Prevent scrolling on any touches to screen
			$(this).preventScrolling(e);
			
			// Reset time
			refreshTime = 0;
		});
		
		// Fast clicks for touch users
		FastClick.attach(document.body);
				
		// Pretty much the controller
		window.app = new AppView();
	});
})(jQuery);