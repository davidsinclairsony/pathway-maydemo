(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
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
},{"./app/router":6,"./app/views/conversation":7,"./app/views/hello":14,"./app/views/intro":15}],2:[function(require,module,exports){
"use strict";
var PersonModel = require("../models/person");

module.exports = Backbone.Collection.extend({
	model: PersonModel
});
},{"../models/person":4}],3:[function(require,module,exports){
"use strict";
var QuestionModel = require("../models/question");

module.exports = Backbone.Collection.extend({
	model: QuestionModel
});
},{"../models/question":5}],4:[function(require,module,exports){
"use strict";
module.exports = Backbone.Model.extend({});
},{}],5:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],6:[function(require,module,exports){
"use strict";
module.exports = Backbone.Router.extend({
	routes: {
		"": "intro",
		"hello": "hello",
		"conversation": "conversation",
		'*error': 'error'
	}
});
},{}],7:[function(require,module,exports){
"use strict";
var PeopleView = require("./conversation/people");
var QuestionsView = require("./conversation/questions");
var ResponseView = require("./conversation/response");

module.exports = Backbone.View.extend({
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
		"revealAllQuestions": "askAnotherQuestion",
		"hidAllExceptSelectedQuestion": "prepareForResponse",
		"revealedAllQuestions": "hideResponse",
		"dataSourced": "getAndShowResponse",
		"panstart": "panHandler",
		"pan": "panHandler",
		"swiped": "swipeHandler",
	},
	panHandler: function(e) {
		// Prevent pan/swipe on response view and modal
		if(
			e.originalEvent &&
			!$(e.target).parents(".response").length &&
			!$(e.target).hasClass("response") &&
			!$(e.target).parents(".modal").length &&
			!$(e.target).hasClass("modal")
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
		// Clear previous listens
		this.stopListening(this.responseView, "answerReady");
		
		// Clear old timeouts and requests
		if(this.responseView.jqxhr) {
			this.responseView.jqxhr.abort();
		}
		if(this.responseView.timeout) {
			clearTimeout(this.responseView.timeout);
		}
		
		// Listen for when the answer is ready to display
		this.listenToOnce(this.responseView, "answerReady", function() {
			// Check if still the current question and person
			if(
				this.peopleView.selectedPerson &&
				this.questionsView.selectedQuestion &&
				this.peopleView.selectedPerson.cid == this.responseView.answer.cid &&
				this.questionsView.selectedQuestion.model.get("id") == this.responseView.answer.questionID
			) {
				this.responseView.show();
			}
		});
		
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
},{"./conversation/people":8,"./conversation/questions":10,"./conversation/response":13}],8:[function(require,module,exports){
"use strict";
var PeopleCollection = require("../../collections/people");
var PersonView = require("./people/person");

module.exports = Backbone.View.extend({
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
		this.positionLeft = -1196;

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
},{"../../collections/people":2,"./people/person":9}],9:[function(require,module,exports){
"use strict";
module.exports = Backbone.View.extend({
	tagName: "li",
	initialize: function() {
		var self = this;
		
		$.get("/templates/conversation/people/person.html", function(data) {
			self.template = _.template(data);
			self.render();
		});
		
		$.get("/templates/conversation/people/person/modal.html", function(data) {
			self.modalTemplate = _.template(data);
		});
	},
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},
	events: {
		"click .picture": "popupHandler",
		"click .sources li": "popupHandler",
		"click .popup button": "reportToggler",
		"click .modal button": "reportToggler"
	},
	reportToggler: function() {
		var $modal = this.$el.find(".modal");
		
		// Create modal if needed, otherwise remove
		if(!$modal.length) {
			this.$el.append(this.modalTemplate(this.model.toJSON()));
			$modal = this.$(".modal");
			
			$modal.waitForImages(function() {
				$modal.removeClass("spinner").addClass("spinOut");
				TweenMax.fromTo($modal.find("> div"), .5,
					{opacity: 0, visibility: "visible"},
					{opacity: 1, onComplete: function() {
						$modal.removeClass("spinOut");
					}}
				);
			});

			// Prevent background clicks
			$modal.on("touchstart mousedown click", function(e) {
				if(!$(e.target).is($modal.find("button"))) {
					e.stopImmediatePropagation();
				}
			});
		} else {
			TweenMax.to($modal, .5, {opacity: 0, onComplete: function() {
				$modal.remove();
			}});
		}
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
},{}],10:[function(require,module,exports){
"use strict";
var QuestionModel = require("../../models/question");
var QuestionsCollection = require("../../collections/questions");
var QuestionView = require("./questions/question");
var CustomQuestionView = require("./questions/customQuestion");

module.exports = Backbone.View.extend({
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
			this.$el.trigger("revealAllQuestions");
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
				
				view.$el.css("position", "relative");
				
				// Reset positioning and move question
				TweenMax.to(view.$el, .5, {
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
},{"../../collections/questions":3,"../../models/question":5,"./questions/customQuestion":11,"./questions/question":12}],11:[function(require,module,exports){
"use strict";
module.exports = Backbone.View.extend({
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
		
		// Animate if not already done
		if(!self.$el.hasClass("focused")) {
			TweenMax.to(self.$el, .5, {className: "+=focused"});
			
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
		
		TweenMax.to(self.$el, .5, {className: "-=focused"});
		
		TweenMax.to(self.$button, .5, {
			opacity: 0,
			display: "none"
		});
	}
});
},{}],12:[function(require,module,exports){
"use strict";
module.exports = Backbone.View.extend({
	tagName: "li",
	template: _.template("<%= text %>"),
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
},{}],13:[function(require,module,exports){
"use strict";
module.exports = Backbone.View.extend({
	//url: "http://" + window.location.host + "/ask",
	url: "http://atldev.pathway.com:3000/ask",
	//url: "http://ome-demo.pathway.com:8080/ask",
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
		"click footer div:nth-last-child(-n + 2)": "markRated"
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
		var top = answer.$el.parent().offset().top + 58 + 10;
		var height = 520 - 58;
		
		self.$el.css({
			display: "block",
			top: top,
			height: height
		});
		
		// Fade in response
		TweenMax.fromTo(self.$el, .5, {opacity: 0}, {opacity: 1, overwrite: "all"});
	},
	get: function(person, question) {
		var self = this;
		var requestData;
		self.answer = {};
		self.answer.cid = person.cid;
		self.answer.personID = person.model.get("id");
		self.answer.questionID = question.model.get("id");
		self.answer.html = "";
		
		var numberWithCommas = function(x) {
			return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		};
		
		// Check if stored response
		if(self.answer.questionID < 4) {
			var html = "";
			
			switch(self.answer.questionID) {
				case 1:
					// Get fitness data about person
					requestData = {
						"userId": self.answer.personID,
						"fitness": "true"
					};
					
					// Get the answer
					self.jqxhr = $.ajax({
						url: self.url,
						data: requestData,
						dataType: "jsonp",
						timeout: 3000
					}).always(function(data, status, jqxhr) {
						if(status == "success" && data.fitness.code === 0) {
							var randomNumber = Math.floor(Math.random() * 6);
							var randomResponse;
							
							// Generate random response
							if(randomNumber != 4) {
								randomResponse = self.answers[0].responses[randomNumber];
							} else {
								randomResponse =
									self.answers[0].responses[randomNumber][0] +
									self.answers[0].locations[self.answer.personID - 1].title +
									self.answers[0].responses[randomNumber][1] +
									self.answers[0].locations[self.answer.personID - 1].address +
									self.answers[0].responses[randomNumber][2]
								;
								
								// Assign single location
								self.answer.locations = [self.answers[0].locations[self.answer.personID - 1]];
							}
							
							html =
								person.model.get("name") +
								self.answers[0].parts[0] +
								"<span class='highlight'>" + numberWithCommas(data.fitness.summary.caloriesOut) + "</span>" +
								self.answers[0].parts[1] +
								person.model.get("goals") +
								self.answers[0].parts[2] +
								randomResponse
							;
							self.answer.html = html;
						} else {
							self.answer.html = "<p>Sorry, please try again.</p>";
						}

						self.timeout = setTimeout(function() {self.trigger("answerReady");}, 2500);
					});
					
					
					break;
				case 2:
					self.answer.html = self.answers[1][self.answer.personID - 1].html;
					
					var locations = self.answers[1][self.answer.personID - 1].locations;
					
					// Add location names to html
					self.answer.html += "<ul>";
					
					for(var i = 0; i < locations.length; i++) {
						self.answer.html += "<li>" + locations[i].title + "</li>";
					}
					
					self.answer.html += "</ul>";
					
					self.answer.locations = locations;
					self.timeout = setTimeout(function() {self.trigger("answerReady");}, 3000);
					break;
				case 3:
					self.answer.html = self.answers[2][self.answer.personID - 1];
					self.timeout = setTimeout(function() {self.trigger("answerReady");}, 3000);
					break;
			}
		} else {
			// To be sent to API
			requestData = {
				"userId": 1, // self.answer.personID,
				"question": {
					"questionText": question.model.get("text")
				}
			};
			
			// Get the answer
			self.jqxhr = $.ajax({
				url: self.url,
				data: requestData,
				dataType: "jsonp",
				timeout: 15000
			}).always(function(data, status, jqxhr) {
				if(status == "success" && data.answer.answers[0]) {
					if(self.answer.questionID == 5 && self.answer.personID == 2) {
						self.answer.html += self.answers[3];
					}
					
					self.answer.html += data.answer.answers[0].formattedText;
				} else {
					self.answer.html = "<p>Sorry, please try again.</p>";
				}
				
				self.trigger("answerReady");
			});
		}
	},
	show: function() {
		var self = this;

		// Gracefully hide spinner
		self.$el.removeClass("spinner").addClass("spinOut");
		
		if(self.answer.html) {
			self.$el.append("<main>" + self.answer.html + "</main>");
		} else {
			self.$el.append("<main><p>Sorry, please try again later.</p></main>");
		}
		
		// Show map if locations are available
		if(self.answer.locations) {
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
				for (var i = 0; i < self.answer.locations.length; i++) {
					// Format title
					var content = "";
					
					if(self.answer.locations[i].title) {
						content = "<div class='title'>" + self.answer.locations[i].title + "</div>";
					}
					if(self.answer.locations[i].description) {
						content += "<div class='description'>" + self.answer.locations[i].description + "</div>";
					}
					
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(
							self.answer.locations[i].coordinates.lattitude,
							self.answer.locations[i].coordinates.longitude
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

				// Zoom out for single destination maps
				if(self.answer.locations.length < 2) {
					var listener = google.maps.event.addListener(map, "idle", function () {
						map.setZoom(11);
						google.maps.event.removeListener(listener);
					});
				}
			});
		}

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
},{}],14:[function(require,module,exports){
"use strict";
module.exports = Backbone.View.extend({
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
},{}],15:[function(require,module,exports){
"use strict";
module.exports = Backbone.View.extend({
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
},{}],16:[function(require,module,exports){
"use strict";
var AppView = require("./app");

//	Initiation
$(window).load(function() {
	// Timer code
	var resetTimer = function(t) {
		if(t === 0) {
			clearTimeout(timer);
		}
		if(t > 90) {
			// window.location.replace("/");
		} else {
			t++;
			timer = setTimeout(function() {resetTimer(t);}, 1000);
		}
	};
	
	// Start timer
	var timer = setTimeout(function() {resetTimer(0);}, 1000);
	
	$(document).on("touchstart mousedown", function(e) {
		// Prevent scrolling on any touches to screen
		$(this).preventScrolling(e);
		
		// Reset timer
		resetTimer(0);
	});
	
	// Fast clicks for touch users
	FastClick.attach(document.body);
	
	// Start!
	window.app = new AppView();
});
},{"./app":1}]},{},[16])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hcHAuanMiLCJqcy9hcHAvY29sbGVjdGlvbnMvcGVvcGxlLmpzIiwianMvYXBwL2NvbGxlY3Rpb25zL3F1ZXN0aW9ucy5qcyIsImpzL2FwcC9tb2RlbHMvcGVyc29uLmpzIiwianMvYXBwL3JvdXRlci5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24uanMiLCJqcy9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZS5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcGVvcGxlL3BlcnNvbi5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zLmpzIiwianMvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvY3VzdG9tUXVlc3Rpb24uanMiLCJqcy9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9xdWVzdGlvbi5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcmVzcG9uc2UuanMiLCJqcy9hcHAvdmlld3MvaGVsbG8uanMiLCJqcy9hcHAvdmlld3MvaW50cm8uanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBJbnRyb1ZpZXcgPSByZXF1aXJlKFwiLi9hcHAvdmlld3MvaW50cm9cIik7XG52YXIgSGVsbG9WaWV3ID0gcmVxdWlyZShcIi4vYXBwL3ZpZXdzL2hlbGxvXCIpO1xudmFyIENvbnZlcnNhdGlvblZpZXcgPSByZXF1aXJlKFwiLi9hcHAvdmlld3MvY29udmVyc2F0aW9uXCIpO1xudmFyIFJvdXRlciA9IHJlcXVpcmUoXCIuL2FwcC9yb3V0ZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRlbDogXCIjYXBwXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBTdGFydCByb3V0ZXIgd2l0aCBwcmVkZWZpbmVkIHJvdXRlc1xuXHRcdHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuXHRcdFxuXHRcdC8vIFJvdXRlIGFjdGlvbnNcblx0XHR0aGlzLnJvdXRlci5vbihcInJvdXRlOmludHJvXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHZpZXcgPSBuZXcgSW50cm9WaWV3KCk7XG5cdFx0XHRcblx0XHRcdHNlbGYuZ29Ubyh2aWV3KTtcblx0XHRcdFxuXHRcdFx0Ly8gTGlzdGVuIGZvciBlbmQgb2Ygdmlld1xuXHRcdFx0c2VsZi5saXN0ZW5Ub09uY2UodmlldywgXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYucm91dGVyLm5hdmlnYXRlKFwiaGVsbG9cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHRoaXMucm91dGVyLm9uKFwicm91dGU6aGVsbG9cIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdmlldyA9IG5ldyBIZWxsb1ZpZXcoKTtcblx0XHRcdFxuXHRcdFx0c2VsZi5nb1RvKHZpZXcpO1xuXHRcdFx0XG5cdFx0XHQvLyBMaXN0ZW4gZm9yIGVuZCBvZiB2aWV3XG5cdFx0XHRzZWxmLmxpc3RlblRvT25jZSh2aWV3LCBcImVuZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5yb3V0ZXIubmF2aWdhdGUoXCJjb252ZXJzYXRpb25cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHRoaXMucm91dGVyLm9uKFwicm91dGU6Y29udmVyc2F0aW9uXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNvbnZlcnNhdGlvblZpZXcgPSBuZXcgQ29udmVyc2F0aW9uVmlldygpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLmdvVG8oY29udmVyc2F0aW9uVmlldyk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gU3RhcnQgdHJhY2tpbmdcblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWV9KTtcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayAucmVmcmVzaFwiOiBcInJlZnJlc2hcIlxuXHR9LFxuXHRyZWZyZXNoOiBmdW5jdGlvbigpIHtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZShcIi9cIik7XG5cdH0sXG5cdGdvVG86IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIHByZXZpb3VzID0gdGhpcy5jdXJyZW50VmlldyB8fCBudWxsO1xuXHRcdHZhciBuZXh0ID0gdmlldztcblx0XHRcblx0XHQvLyBIaWRlIHRoZSBjdXJyZW50IHZpZXdcblx0XHRpZihwcmV2aW91cykge1xuXHRcdFx0VHdlZW5NYXgudG8ocHJldmlvdXMuJGVsLCAuNSwge1xuXHRcdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtwcmV2aW91cy5yZW1vdmUoKTt9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0Ly8gQWRkICwgaGlkZSwgYW5kIHdhaXQgdW50aWwgbG9hZGVkXG5cdFx0c2VsZi5jdXJyZW50VmlldyA9IG5leHQ7XG5cdFx0c2VsZi4kZWwuYXBwZW5kKG5leHQuZWwpO1xuXHRcdG5leHQuJGVsLmhpZGUoKTtcblx0XHRcblx0XHRzZWxmLmxpc3RlblRvT25jZShuZXh0LCBcImxvYWRlZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFdhaXQgZm9yIGltYWdlcyBhbmQgcmV2ZWFsXG5cdFx0XHRuZXh0LiRlbC53YWl0Rm9ySW1hZ2VzKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLiRlbC5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0XHRuZXh0LiRlbC5zaG93KCk7XG5cdFx0XHRcdFR3ZWVuTWF4LmZyb20obmV4dC4kZWwsIC41LCB7b3BhY2l0eTogMH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBQZXJzb25Nb2RlbCA9IHJlcXVpcmUoXCIuLi9tb2RlbHMvcGVyc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0bW9kZWw6IFBlcnNvbk1vZGVsXG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBRdWVzdGlvbk1vZGVsID0gcmVxdWlyZShcIi4uL21vZGVscy9xdWVzdGlvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdG1vZGVsOiBRdWVzdGlvbk1vZGVsXG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHt9KTsiLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuUm91dGVyLmV4dGVuZCh7XG5cdHJvdXRlczoge1xuXHRcdFwiXCI6IFwiaW50cm9cIixcblx0XHRcImhlbGxvXCI6IFwiaGVsbG9cIixcblx0XHRcImNvbnZlcnNhdGlvblwiOiBcImNvbnZlcnNhdGlvblwiLFxuXHRcdCcqZXJyb3InOiAnZXJyb3InXG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFBlb3BsZVZpZXcgPSByZXF1aXJlKFwiLi9jb252ZXJzYXRpb24vcGVvcGxlXCIpO1xudmFyIFF1ZXN0aW9uc1ZpZXcgPSByZXF1aXJlKFwiLi9jb252ZXJzYXRpb24vcXVlc3Rpb25zXCIpO1xudmFyIFJlc3BvbnNlVmlldyA9IHJlcXVpcmUoXCIuL2NvbnZlcnNhdGlvbi9yZXNwb25zZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJ2aWV3IGNvbnZlcnNhdGlvblwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdFxuXHRcdC8vIENoaWxkIHZpZXdzXG5cdFx0dGhpcy5wZW9wbGVWaWV3ID0gbmV3IFBlb3BsZVZpZXcoKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5wZW9wbGVWaWV3LmVsKTtcblx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcgPSBuZXcgUXVlc3Rpb25zVmlldygpO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCh0aGlzLnF1ZXN0aW9uc1ZpZXcuZWwpO1xuXHRcdHRoaXMucmVzcG9uc2VWaWV3ID0gbmV3IFJlc3BvbnNlVmlldygpO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCh0aGlzLnJlc3BvbnNlVmlldy5lbCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHRcdHNlbGYuJGVsLmhhbW1lcih7ZG9tRXZlbnRzOiB0cnVlfSk7XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2sgLmFza1wiOiBcImFza0Fub3RoZXJRdWVzdGlvblwiLFxuXHRcdFwiY2xpY2sgLmhvdywgZm9vdGVyIC5jbG9zZVwiOiBcImhvd1RvZ2dsZXJcIixcblx0XHRcInJldmVhbEFsbFF1ZXN0aW9uc1wiOiBcImFza0Fub3RoZXJRdWVzdGlvblwiLFxuXHRcdFwiaGlkQWxsRXhjZXB0U2VsZWN0ZWRRdWVzdGlvblwiOiBcInByZXBhcmVGb3JSZXNwb25zZVwiLFxuXHRcdFwicmV2ZWFsZWRBbGxRdWVzdGlvbnNcIjogXCJoaWRlUmVzcG9uc2VcIixcblx0XHRcImRhdGFTb3VyY2VkXCI6IFwiZ2V0QW5kU2hvd1Jlc3BvbnNlXCIsXG5cdFx0XCJwYW5zdGFydFwiOiBcInBhbkhhbmRsZXJcIixcblx0XHRcInBhblwiOiBcInBhbkhhbmRsZXJcIixcblx0XHRcInN3aXBlZFwiOiBcInN3aXBlSGFuZGxlclwiLFxuXHR9LFxuXHRwYW5IYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0Ly8gUHJldmVudCBwYW4vc3dpcGUgb24gcmVzcG9uc2UgdmlldyBhbmQgbW9kYWxcblx0XHRpZihcblx0XHRcdGUub3JpZ2luYWxFdmVudCAmJlxuXHRcdFx0ISQoZS50YXJnZXQpLnBhcmVudHMoXCIucmVzcG9uc2VcIikubGVuZ3RoICYmXG5cdFx0XHQhJChlLnRhcmdldCkuaGFzQ2xhc3MoXCJyZXNwb25zZVwiKSAmJlxuXHRcdFx0ISQoZS50YXJnZXQpLnBhcmVudHMoXCIubW9kYWxcIikubGVuZ3RoICYmXG5cdFx0XHQhJChlLnRhcmdldCkuaGFzQ2xhc3MoXCJtb2RhbFwiKVxuXHRcdCkge1xuXHRcdFx0dGhpcy5wZW9wbGVWaWV3LnBhbkhhbmRsZXIoZSk7XG5cdFx0fVxuXHR9LFxuXHRzd2lwZUhhbmRsZXI6IGZ1bmN0aW9uKGV2ZW50LCBvYmplY3RzKSB7XG5cdFx0dGhpcy5wZW9wbGVWaWV3LnN3aXBlSGFuZGxlcihvYmplY3RzLmV2ZW50KTtcblx0XHRcblx0XHRpZih0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0Ly8gUmVzZXQgcmVzcG9uc2Ugdmlld1xuXHRcdFx0dGhpcy5yZXNwb25zZVZpZXcuc2V0VG9Mb2FkaW5nKCk7XG5cdFx0XHRcblx0XHRcdC8vIFByZXBhcmUgZm9yIHJlc3BvbnNlXG5cdFx0XHR0aGlzLnByZXBhcmVGb3JSZXNwb25zZSgpO1xuXHRcdH1cblx0fSxcblx0aG93VG9nZ2xlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyICRrbm93ID0gdGhpcy4kKFwiLmtub3dcIik7XG5cdFx0XG5cdFx0JGtub3cudG9nZ2xlQ2xhc3MoXCJvZmZcIiwgJGtub3cuaGFzQ2xhc3MoXCJvblwiKSk7XG5cdFx0JGtub3cudG9nZ2xlQ2xhc3MoXCJvblwiLCAhJGtub3cuaGFzQ2xhc3MoXCJvblwiKSk7XG5cdH0sXG5cdGFza0Fub3RoZXJRdWVzdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5xdWVzdGlvbnNWaWV3LnJldmVhbEFsbFF1ZXN0aW9ucygpO1xuXHR9LFxuXHRwcmVwYXJlRm9yUmVzcG9uc2U6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVzcG9uc2VWaWV3LnByZXBhcmUodGhpcy5xdWVzdGlvbnNWaWV3LnNlbGVjdGVkUXVlc3Rpb24pO1xuXHRcdFR3ZWVuTWF4LnRvKHRoaXMuJChcIi5sb3dlclwiKSwgLjUsIHtvcGFjaXR5OiAxfSk7XG5cdFx0XG5cdFx0Ly8gVGhpcyB3aWxsIHN0YXJ0IHRoZSBjaGljbGV0cyBsb2FkaW5nXG5cdFx0dGhpcy5wZW9wbGVWaWV3LnNlbGVjdGVkUGVyc29uLm9idGFpbkRhdGEoKTtcblx0fSxcblx0Z2V0QW5kU2hvd1Jlc3BvbnNlOiBmdW5jdGlvbigpIHtcblx0XHQvLyBDbGVhciBwcmV2aW91cyBsaXN0ZW5zXG5cdFx0dGhpcy5zdG9wTGlzdGVuaW5nKHRoaXMucmVzcG9uc2VWaWV3LCBcImFuc3dlclJlYWR5XCIpO1xuXHRcdFxuXHRcdC8vIENsZWFyIG9sZCB0aW1lb3V0cyBhbmQgcmVxdWVzdHNcblx0XHRpZih0aGlzLnJlc3BvbnNlVmlldy5qcXhocikge1xuXHRcdFx0dGhpcy5yZXNwb25zZVZpZXcuanF4aHIuYWJvcnQoKTtcblx0XHR9XG5cdFx0aWYodGhpcy5yZXNwb25zZVZpZXcudGltZW91dCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucmVzcG9uc2VWaWV3LnRpbWVvdXQpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBMaXN0ZW4gZm9yIHdoZW4gdGhlIGFuc3dlciBpcyByZWFkeSB0byBkaXNwbGF5XG5cdFx0dGhpcy5saXN0ZW5Ub09uY2UodGhpcy5yZXNwb25zZVZpZXcsIFwiYW5zd2VyUmVhZHlcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBDaGVjayBpZiBzdGlsbCB0aGUgY3VycmVudCBxdWVzdGlvbiBhbmQgcGVyc29uXG5cdFx0XHRpZihcblx0XHRcdFx0dGhpcy5wZW9wbGVWaWV3LnNlbGVjdGVkUGVyc29uICYmXG5cdFx0XHRcdHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uICYmXG5cdFx0XHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbi5jaWQgPT0gdGhpcy5yZXNwb25zZVZpZXcuYW5zd2VyLmNpZCAmJlxuXHRcdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbi5tb2RlbC5nZXQoXCJpZFwiKSA9PSB0aGlzLnJlc3BvbnNlVmlldy5hbnN3ZXIucXVlc3Rpb25JRFxuXHRcdFx0KSB7XG5cdFx0XHRcdHRoaXMucmVzcG9uc2VWaWV3LnNob3coKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJlc3BvbnNlVmlldy5nZXQoXG5cdFx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24sXG5cdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvblxuXHRcdCk7XG5cdH0sXG5cdGhpZGVSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcuaGlkZSgpO1xuXHRcdFR3ZWVuTWF4LnRvKHRoaXMuJChcIi5sb3dlclwiKSwgLjUsIHtvcGFjaXR5OiAwfSk7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFBlb3BsZUNvbGxlY3Rpb24gPSByZXF1aXJlKFwiLi4vLi4vY29sbGVjdGlvbnMvcGVvcGxlXCIpO1xudmFyIFBlcnNvblZpZXcgPSByZXF1aXJlKFwiLi9wZW9wbGUvcGVyc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInBlb3BsZVwiLFxuXHR0YWdOYW1lOiBcInVsXCIsXG5cdHN3aXBlVGhyZXNob2xkOiAxMjUsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldEpTT04oXCIvanMvanNvbi9wZW9wbGUuanNcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5wZW9wbGVDb2xsZWN0aW9uID0gbmV3IFBlb3BsZUNvbGxlY3Rpb24oZGF0YSk7XG5cdFx0XHRzZWxmLnZpZXdzID0gW107XG5cdFx0XHRcblx0XHRcdC8vIENyZWF0ZSBjdXJyZW50IHNlbGVjdGVkIHBlcnNvbiB2aWV3XG5cdFx0XHRzZWxmLnZpZXdzLnB1c2gobmV3IFBlcnNvblZpZXcoe21vZGVsOiBzZWxmLnBlb3BsZUNvbGxlY3Rpb24uZmlyc3QoKX0pKTtcblx0XHRcdFxuXHRcdFx0Ly8gU2V0IHNlbGVjdGVkIHBlcnNvbiB0byBjZW50ZXJcblx0XHRcdHNlbGYuc2V0U2VsZWN0ZWRQZXJzb24oc2VsZi52aWV3c1swXSk7XG5cdFx0XHRcblx0XHRcdC8vIERyYXcgcGVvcGxlXG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIEFkZCBzZWxlY3RlZCBwZXJzb25cblx0XHR0aGlzLiRlbC5odG1sKHRoaXMudmlld3NbMF0uZWwpO1xuXG5cdFx0Ly8gQWRkIHRoZSBvdGhlcnMgYXJvdW5kXG5cdFx0dGhpcy5wYWQoKTtcblx0XHRcblx0XHQvLyBTZXQgZW5kaW5nIHBvc2l0aW9uXG5cdFx0dGhpcy5wb3NpdGlvbkxlZnQgPSAtMTE5NjtcblxuXHRcdHJldHVybiBzZWxmO1xuXHR9LFxuXHRzZXRTZWxlY3RlZFBlcnNvbjogZnVuY3Rpb24odmlldykge1xuXHRcdC8vIFR1cm4gb2ZmIGN1cnJlbnQgc2VsZWN0ZWQgcGVyc29uXG5cdFx0aWYodGhpcy5zZWxlY3RlZFBlcnNvbikge1xuXHRcdFx0dGhpcy5zZWxlY3RlZFBlcnNvbi5zZWxlY3RlZCA9IGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHR0aGlzLnNlbGVjdGVkUGVyc29uID0gdmlldztcblx0XHR2aWV3LnNlbGVjdGVkID0gdHJ1ZTtcblx0fSxcblx0cGFkOiBmdW5jdGlvbigpIHtcblx0XHQvLyBQYWRzIHRvIDUgZWxlbWVudHMgdG90YWwsIGFyb3VuZCB0aGUgc2VsZWN0ZWQgcGVyc29uXG5cdFx0XG5cdFx0Ly8gR2V0IGxvY2F0aW9uIGluIHZpZXdzIG9mIHNlbGVjdGVkIHBlcnNvblxuXHRcdHZhciBpbmRleE9mU2VsZWN0ZWRQZXJzb24gPSB0aGlzLnZpZXdzLmluZGV4T2YodGhpcy5zZWxlY3RlZFBlcnNvbik7XG5cdFx0dmFyIGksIG1vZGVsSW5kZXgsIG1vZGVsLCB2aWV3O1xuXHRcdFxuXHRcdC8vIEdlbmVyYXRlIGFuZCBhZGQgdmlld3MgYmVmb3JlIHRoZSBzZWxlY3RlZCBwZXJzb25cblx0XHR3aGlsZShpbmRleE9mU2VsZWN0ZWRQZXJzb24gPCAyKSB7XG5cdFx0XHQvLyBHZXQgaW5kZXggb2YgZmlyc3Qgdmlld1xuXHRcdFx0bW9kZWxJbmRleCA9IHRoaXMucGVvcGxlQ29sbGVjdGlvbi5pbmRleE9mKHRoaXMudmlld3NbMF0ubW9kZWwpO1xuXHRcdFx0XG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggbW9kZWwgdG8gdXNlXG5cdFx0XHRpZihtb2RlbEluZGV4ID09PSAwKSB7XG5cdFx0XHRcdG1vZGVsID0gIHRoaXMucGVvcGxlQ29sbGVjdGlvbi5sYXN0KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb2RlbCA9IHRoaXMucGVvcGxlQ29sbGVjdGlvbi5hdChtb2RlbEluZGV4IC0gMSk7XG5cdFx0XHR9XG5cblx0XHRcdHZpZXcgPSBuZXcgUGVyc29uVmlldyh7bW9kZWw6IG1vZGVsfSk7XG5cdFx0XHR0aGlzLnZpZXdzLnVuc2hpZnQodmlldyk7XG5cdFx0XHR0aGlzLiRlbC5wcmVwZW5kKHZpZXcuZWwpO1xuXHRcdFx0XG5cdFx0XHRpbmRleE9mU2VsZWN0ZWRQZXJzb24gPSB0aGlzLnZpZXdzLmluZGV4T2YodGhpcy5zZWxlY3RlZFBlcnNvbik7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdC8vIEFkZCB2aWV3cyBmb3IgYWZ0ZXIgdGhlIHNlbGVjdGVkIHBlcnNvblxuXHRcdHdoaWxlKHRoaXMudmlld3MubGVuZ3RoIDwgNSkge1xuXHRcdFx0Ly8gR2V0IGluZGV4IG9mIGxhc3Qgdmlld1xuXHRcdFx0bW9kZWxJbmRleCA9IHRoaXMucGVvcGxlQ29sbGVjdGlvbi5pbmRleE9mKF8ubGFzdCh0aGlzLnZpZXdzKS5tb2RlbCk7XG5cdFx0XHRcblx0XHRcdC8vIERldGVybWluZSB3aGljaCBtb2RlbCB0byB1c2Vcblx0XHRcdGlmKG1vZGVsSW5kZXggPT0gXy5zaXplKHRoaXMucGVvcGxlQ29sbGVjdGlvbikgLSAxKSB7XG5cdFx0XHRcdG1vZGVsID0gIHRoaXMucGVvcGxlQ29sbGVjdGlvbi5maXJzdCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bW9kZWwgPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uYXQobW9kZWxJbmRleCArIDEpO1xuXHRcdFx0fVxuXG5cdFx0XHR2aWV3ID0gbmV3IFBlcnNvblZpZXcoe21vZGVsOiBtb2RlbH0pO1xuXHRcdFx0dGhpcy52aWV3cy5wdXNoKHZpZXcpO1xuXHRcdFx0dGhpcy4kZWwuYXBwZW5kKHZpZXcuZWwpO1xuXHRcdH1cblx0fSxcblx0cGFuSGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdGlmKGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmlzRmluYWwpIHtcblx0XHRcdC8vIEZpcmUgZXZlbnQgdG8gcGFyZW50IGlmIHN3aXBlLCBvdGhlcndpc2Ugc25hcCBiYWNrXG5cdFx0XHRpZihcblx0XHRcdFx0ZS5vcmlnaW5hbEV2ZW50Lmdlc3R1cmUuZGVsdGFYIDwgLXNlbGYuc3dpcGVUaHJlc2hvbGQgfHxcblx0XHRcdFx0ZS5vcmlnaW5hbEV2ZW50Lmdlc3R1cmUuZGVsdGFYID4gc2VsZi5zd2lwZVRocmVzaG9sZClcblx0XHRcdHtcblx0XHRcdFx0c2VsZi4kZWwudHJpZ2dlcihcInN3aXBlZFwiLCB7ZXZlbnQ6IGV9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGVsLCAuMSwge2xlZnQ6IHNlbGYucG9zaXRpb25MZWZ0fSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEZpbmQgbmV3IHBvc2l0aW9uIGFuZCBtb3ZlXG5cdFx0XHR2YXIgbGVmdCA9IHNlbGYucG9zaXRpb25MZWZ0ICsgZS5vcmlnaW5hbEV2ZW50Lmdlc3R1cmUuZGVsdGFYO1xuXHRcdFx0c2VsZi4kZWwuY3NzKHtsZWZ0OiBsZWZ0fSk7XG5cdFx0fVxuXHR9LFxuXHRzd2lwZUhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIGN1cnJlbnRJbmRleCA9IHNlbGYudmlld3MuaW5kZXhPZihzZWxmLnNlbGVjdGVkUGVyc29uKTtcblx0XHRcblx0XHQvLyBEZXRlcm1pbmUgc3dpcGUgZGlyZWN0aW9uXG5cdFx0aWYoZS5vcmlnaW5hbEV2ZW50Lmdlc3R1cmUuZGVsdGFYIDwgMCkge1xuXHRcdFx0Ly8gU2V0IHRvIGZvcndhcmQgb25lXG5cdFx0XHRzZWxmLnNldFNlbGVjdGVkUGVyc29uKHNlbGYudmlld3NbY3VycmVudEluZGV4ICsgMV0pO1xuXHRcdFx0XG5cdFx0XHQvLyBBbmltYXRlIHRvIGNvcnJlY3QgcG9zaXRpb25cblx0XHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGVsLCAuMSwge1xuXHRcdFx0XHRsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdCAtIDY0MCxcblx0XHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIGFsbCBhc3BlY3RzIG9mIGVkZ2Ugdmlld1xuXHRcdFx0XHRcdF8uZmlyc3Qoc2VsZi52aWV3cykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0c2VsZi52aWV3cy5zaGlmdCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkZCBpbiBuZXdcblx0XHRcdFx0XHRzZWxmLnBhZCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFJlc2V0IG1hcmdpbnNcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOmZpcnN0LWNoaWxkXCIpLmNzcyh7bWFyZ2luTGVmdDogMH0pO1xuXHRcdFx0XHRcdHNlbGYuJChcIj4gbGk6bnRoLWNoaWxkKG4gKyAyKVwiKS5jc3Moe21hcmdpbkxlZnQ6IFwiNDBweFwifSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRqdXN0IHBvc2l0aW9uaW5nXG5cdFx0XHRcdFx0c2VsZi4kZWwuY3NzKHtsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gU2V0IHRvIGJhY2sgb25lXG5cdFx0XHRzZWxmLnNldFNlbGVjdGVkUGVyc29uKHNlbGYudmlld3NbY3VycmVudEluZGV4IC0gMV0pO1xuXHRcdFx0XG5cdFx0XHQvLyBBbmltYXRlIHRvIGNvcnJlY3QgcG9zaXRpb25cblx0XHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGVsLCAuMSwge1xuXHRcdFx0XHRsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdCArIDY0MCxcblx0XHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQvLyBSZW1vdmUgYWxsIGFzcGVjdHMgb2YgZWRnZSB2aWV3XG5cdFx0XHRcdFx0Xy5sYXN0KHNlbGYudmlld3MpLnJlbW92ZSgpO1xuXHRcdFx0XHRcdHNlbGYudmlld3MucG9wKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRkIGluIG5ld1xuXHRcdFx0XHRcdHNlbGYucGFkKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gUmVzZXQgbWFyZ2luc1xuXHRcdFx0XHRcdHNlbGYuJChcIj4gbGk6Zmlyc3QtY2hpbGRcIikuY3NzKHttYXJnaW5MZWZ0OiAwfSk7XG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpudGgtY2hpbGQobiArIDIpXCIpLmNzcyh7bWFyZ2luTGVmdDogXCI0MHB4XCJ9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGp1c3QgcG9zaXRpb25pbmdcblx0XHRcdFx0XHRzZWxmLiRlbC5jc3Moe2xlZnQ6IHNlbGYucG9zaXRpb25MZWZ0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0dGFnTmFtZTogXCJsaVwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi50ZW1wbGF0ZSA9IF8udGVtcGxhdGUoZGF0YSk7XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24vcGVvcGxlL3BlcnNvbi9tb2RhbC5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYubW9kYWxUZW1wbGF0ZSA9IF8udGVtcGxhdGUoZGF0YSk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayAucGljdHVyZVwiOiBcInBvcHVwSGFuZGxlclwiLFxuXHRcdFwiY2xpY2sgLnNvdXJjZXMgbGlcIjogXCJwb3B1cEhhbmRsZXJcIixcblx0XHRcImNsaWNrIC5wb3B1cCBidXR0b25cIjogXCJyZXBvcnRUb2dnbGVyXCIsXG5cdFx0XCJjbGljayAubW9kYWwgYnV0dG9uXCI6IFwicmVwb3J0VG9nZ2xlclwiXG5cdH0sXG5cdHJlcG9ydFRvZ2dsZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciAkbW9kYWwgPSB0aGlzLiRlbC5maW5kKFwiLm1vZGFsXCIpO1xuXHRcdFxuXHRcdC8vIENyZWF0ZSBtb2RhbCBpZiBuZWVkZWQsIG90aGVyd2lzZSByZW1vdmVcblx0XHRpZighJG1vZGFsLmxlbmd0aCkge1xuXHRcdFx0dGhpcy4kZWwuYXBwZW5kKHRoaXMubW9kYWxUZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG5cdFx0XHQkbW9kYWwgPSB0aGlzLiQoXCIubW9kYWxcIik7XG5cdFx0XHRcblx0XHRcdCRtb2RhbC53YWl0Rm9ySW1hZ2VzKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkbW9kYWwucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdFx0VHdlZW5NYXguZnJvbVRvKCRtb2RhbC5maW5kKFwiPiBkaXZcIiksIC41LFxuXHRcdFx0XHRcdHtvcGFjaXR5OiAwLCB2aXNpYmlsaXR5OiBcInZpc2libGVcIn0sXG5cdFx0XHRcdFx0e29wYWNpdHk6IDEsIG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JG1vZGFsLnJlbW92ZUNsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdFx0XHR9fVxuXHRcdFx0XHQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIFByZXZlbnQgYmFja2dyb3VuZCBjbGlja3Ncblx0XHRcdCRtb2RhbC5vbihcInRvdWNoc3RhcnQgbW91c2Vkb3duIGNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0aWYoISQoZS50YXJnZXQpLmlzKCRtb2RhbC5maW5kKFwiYnV0dG9uXCIpKSkge1xuXHRcdFx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRUd2Vlbk1heC50bygkbW9kYWwsIC41LCB7b3BhY2l0eTogMCwgb25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCRtb2RhbC5yZW1vdmUoKTtcblx0XHRcdH19KTtcblx0XHR9XG5cdH0sXG5cdG9idGFpbkRhdGE6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLiQoXCJsaS5hdmFpbGFibGVcIikuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkdGhpcyA9ICQodGhpcyk7XG5cdFx0XHRcblx0XHRcdCR0aGlzLnJlbW92ZUNsYXNzKFwic3Bpbk91dFwiKS5hZGRDbGFzcyhcInNwaW5uZXJcIik7XG5cblx0XHRcdC8vIERhdGEgb2J0YWluZWQgYWZ0ZXIgcmFuZG9tIHRpbWVcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCR0aGlzLnJlbW92ZUNsYXNzKFwic3Bpbm5lclwiKS5hZGRDbGFzcyhcInNwaW5PdXRcIik7XG5cdFx0XHR9LCBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyMDAwICsgMTAwMCkpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIFNpZ25hbCB0byBwYXJlbnQgZGF0YSBpcyByZWFkeVxuXHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJkYXRhU291cmNlZFwiKTtcblx0fSxcblx0cG9wdXBIYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0Ly8gQ2hlY2sgaWYgY3VycmVudCBwZXJzb24gYmVpbmcgY2xpY2tlZCBvblxuXHRcdGlmKHRoaXMuc2VsZWN0ZWQpIHtcblx0XHRcdGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR2YXIgJG5ld1BvcHVwID0gJChlLnRhcmdldCkuc2libGluZ3MoXCIucG9wdXBcIik7XG5cdFx0XHRcblx0XHRcdGlmKCFzZWxmLiRwb3B1cCkge1xuXHRcdFx0XHR0aGlzLnBvcHVwU2hvd2VyKCRuZXdQb3B1cCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgaXNTYW1lQXNDdXJyZW50ID0gc2VsZi4kcG9wdXAuaXMoJG5ld1BvcHVwKTtcblxuXHRcdFx0XHQvLyBIaWRlIGN1cnJlbnQgcG9wdXBcblx0XHRcdFx0dGhpcy5wb3B1cFJlbW92ZXIoc2VsZi4kcG9wdXApO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYoIWlzU2FtZUFzQ3VycmVudCkge1xuXHRcdFx0XHRcdC8vIFNob3cgbmV3XG5cdFx0XHRcdFx0c2VsZi4kcG9wdXAgPSAkbmV3UG9wdXA7XG5cdFx0XHRcdFx0dGhpcy5wb3B1cFNob3dlcihzZWxmLiRwb3B1cCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHBvcHVwUmVtb3ZlcjogZnVuY3Rpb24oJHApIHtcblx0XHR0aGlzLiRwb3B1cCA9IG51bGw7XG5cdFx0XG5cdFx0Ly8gRmFkZSBhbmQgaGlkZSBwb3B1cFxuXHRcdFR3ZWVuTWF4LnRvKCRwLCAuNSwge1xuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdGRpc3BsYXk6IFwibm9uZVwiLFxuXHRcdFx0b3ZlcndyaXRlOiBcImFsbFwiXG5cdFx0fSk7XG5cblx0XHQvLyBUdXJuIG9mZiBsaXN0ZW5lclxuXHRcdCQoXCJib2R5XCIpLm9mZihcInRvdWNoZW5kIGNsaWNrXCIpO1xuXHR9LFxuXHRwb3B1cFNob3dlcjogZnVuY3Rpb24oJHApIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi4kcG9wdXAgPSAkcDtcblx0XHRcblx0XHQvLyBTaG93IGFuZCBmYWRlIGluXG5cdFx0VHdlZW5NYXguZnJvbVRvKCRwLCAuNSxcblx0XHRcdHtvcGFjaXR5OiAwLCBkaXNwbGF5OiBcImJsb2NrXCJ9LFxuXHRcdFx0e29wYWNpdHk6IDEsIG92ZXJ3cml0ZTogXCJhbGxcIn1cblx0XHQpO1xuXHRcdFxuXHRcdC8vIExpc3RlbiBmb3IgYW55dGhpbmcgdG8gdHVybiBvZmZcblx0XHQkKFwiYm9keVwiKS5vbmUoXCJ0b3VjaGVuZCBjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHNlbGYucG9wdXBSZW1vdmVyKCRwKTtcblx0XHR9KTtcblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUXVlc3Rpb25Nb2RlbCA9IHJlcXVpcmUoXCIuLi8uLi9tb2RlbHMvcXVlc3Rpb25cIik7XG52YXIgUXVlc3Rpb25zQ29sbGVjdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9jb2xsZWN0aW9ucy9xdWVzdGlvbnNcIik7XG52YXIgUXVlc3Rpb25WaWV3ID0gcmVxdWlyZShcIi4vcXVlc3Rpb25zL3F1ZXN0aW9uXCIpO1xudmFyIEN1c3RvbVF1ZXN0aW9uVmlldyA9IHJlcXVpcmUoXCIuL3F1ZXN0aW9ucy9jdXN0b21RdWVzdGlvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJxdWVzdGlvbnNcIixcblx0dGFnTmFtZTogXCJ1bFwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXRKU09OKFwiL2pzL2pzb24vcXVlc3Rpb25zLmpzXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYucXVlc3Rpb25zQ29sbGVjdGlvbiA9IG5ldyBRdWVzdGlvbnNDb2xsZWN0aW9uKGRhdGEpO1xuXHRcdFx0c2VsZi52aWV3cyA9IFtdO1xuXG5cdFx0XHQvLyBDcmVhdGUgcXVlc3Rpb24gdmlld3Ncblx0XHRcdHNlbGYucXVlc3Rpb25zQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsKSB7XG5cdFx0XHRcdHNlbGYudmlld3MucHVzaChuZXcgUXVlc3Rpb25WaWV3KHttb2RlbDogbW9kZWx9KSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Ly8gQWRkIGluIGN1c3RvbSBxdWVzdGlvblxuXHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBDdXN0b21RdWVzdGlvblZpZXcoe1xuXHRcdFx0XHRtb2RlbDogbmV3IFF1ZXN0aW9uTW9kZWwoKVxuXHRcdFx0fSkpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLiRlbC5lbXB0eSgpO1xuXHRcdFxuXHRcdHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0XG5cdFx0Ly8gUmVuZGVyIGVhY2ggcXVlc3Rpb24gYW5kIGFkZCBhdCBlbmRcblx0XHRfLmVhY2goc2VsZi52aWV3cywgZnVuY3Rpb24odmlldykge1xuXHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHZpZXcuZWwpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHNlbGYuJGVsLmFwcGVuZChjb250YWluZXIpO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcInF1ZXN0aW9uQ2xpY2tlZFwiOiBcInF1ZXN0aW9uQ2xpY2tlZFwiLFxuXHRcdFwicmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uXCI6IFwicmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uXCJcblx0fSxcblx0cXVlc3Rpb25DbGlja2VkOiBmdW5jdGlvbihldmVudCwgb2JqZWN0cykge1xuXHRcdGlmKCF0aGlzLnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdC8vIFNhdmUgdmlldyBhbmQgaGlkZSBvdGhlcnNcblx0XHRcdHRoaXMuc2VsZWN0ZWRRdWVzdGlvbiA9IG9iamVjdHMuc2VsZWN0ZWRRdWVzdGlvbjtcblx0XHRcdHRoaXMuaGlkZUFsbEV4Y2VwdFNlbGVjdGVkUXVlc3Rpb24oKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kZWwudHJpZ2dlcihcInJldmVhbEFsbFF1ZXN0aW9uc1wiKTtcblx0XHR9XG5cdH0sXG5cdGhpZGVBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gQnViYmxlIHVwIHRoZSBldmVudFxuXHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJoaWRBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uXCIpO1xuXHRcdFxuXHRcdF8uZWFjaCh0aGlzLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRpZih2aWV3ID09IHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0XHQvLyBTYXZlIGN1cnJlbnQgb2Zmc2V0XG5cdFx0XHRcdHZhciBjdXJyZW50T2Zmc2V0ID0gdmlldy4kZWwub2Zmc2V0KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2aWV3LiRlbC5jc3MoXCJwb3NpdGlvblwiLCBcImFic29sdXRlXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gU2F2ZSBkZXNpcmVkIG9mZnNldFxuXHRcdFx0XHR2YXIgZGVzaXJlZE9mZnNldCA9IHZpZXcuJGVsLm9mZnNldCgpO1xuXHRcdFx0XHRcblx0XHRcdFx0dmlldy4kZWwuY3NzKFwicG9zaXRpb25cIiwgXCJyZWxhdGl2ZVwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFJlc2V0IHBvc2l0aW9uaW5nIGFuZCBtb3ZlIHF1ZXN0aW9uXG5cdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge1xuXHRcdFx0XHRcdHRvcDogZGVzaXJlZE9mZnNldC50b3AgLSBjdXJyZW50T2Zmc2V0LnRvcFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEhpZGUgYWxsIG90aGVyIHF1ZXN0aW9uc1xuXHRcdFx0XHRUd2Vlbk1heC50byh2aWV3LiRlbCwgLjUsIHthdXRvQWxwaGE6IDB9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmV2ZWFsQWxsUXVlc3Rpb25zOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0aWYoc2VsZi5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHQvLyBCdWJibGUgdXAgdGhlIGV2ZW50XG5cdFx0XHRzZWxmLiRlbC50cmlnZ2VyKFwicmV2ZWFsZWRBbGxRdWVzdGlvbnNcIik7XG5cdFx0XHRcblx0XHRcdF8uZWFjaCh0aGlzLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRcdC8vIFJlc2V0IGN1c3RvbSBxdWVzdGlvblxuXHRcdFx0XHRpZih2aWV3IGluc3RhbmNlb2YgQ3VzdG9tUXVlc3Rpb25WaWV3KSB7XG5cdFx0XHRcdFx0dmlldy5zdGFsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZih2aWV3ID09IHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0ZWRRdWVzdGlvbiA9IG51bGw7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBiYWNrIHRvIHBvc2l0aW9uLCBpZiBuZWVkZWRcblx0XHRcdFx0XHRpZighdmlldy4kZWwuaXMoXCI6Zmlyc3QtY2hpbGRcIikpIHtcblx0XHRcdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge1xuXHRcdFx0XHRcdFx0XHR0b3A6IDAsXG5cdFx0XHRcdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmKHZpZXcgaW5zdGFuY2VvZiBDdXN0b21RdWVzdGlvblZpZXcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYucmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gUmV2ZWFsIG90aGVyIHF1ZXN0aW9uc1xuXHRcdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge2F1dG9BbHBoYTogMX0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHJlZ2VuZXJhdGVDdXN0b21RdWVzdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIEJyaW5nIGN1cnJlbnQgb3V0IG9mIHBvc2l0aW9uXG5cdFx0dmFyIGN1cnJlbnQgPSBzZWxmLnZpZXdzLnNsaWNlKC0xKVswXTtcblx0XHRjdXJyZW50LiRlbC5jc3Moe1xuXHRcdFx0cG9zaXRpb246IFwiYWJzb2x1dGVcIixcblx0XHRcdHRvcDogY3VycmVudC4kZWwucG9zaXRpb24oKS50b3AsXG5cdFx0XHRsZWZ0OiBjdXJyZW50LiRlbC5wb3NpdGlvbigpLmxlZnQsXG5cdFx0XHR3aWR0aDogY3VycmVudC4kZWwub3V0ZXJXaWR0aCgpLFxuXHRcdFx0ekluZGV4OiAxMFxuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIEFkZCBpbiBuZXcgb25lXG5cdFx0dmFyIHZpZXcgPSBuZXcgQ3VzdG9tUXVlc3Rpb25WaWV3KHttb2RlbDogbmV3IFF1ZXN0aW9uTW9kZWwoKX0pO1xuXHRcdHNlbGYuJGVsLmFwcGVuZCh2aWV3LmVsKTtcblx0XHRcblx0XHQvLyBSZW1vdmUgb2xkIHdoZW4gbmV3IHByZXNlbnRcblx0XHR2YXIgaSA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoalF1ZXJ5LmNvbnRhaW5zKHNlbGYuZWwsIHZpZXcuZWwpKSB7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwoaSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjdXJyZW50LnJlbW92ZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQ2xlYW51cCBhcnJheVxuXHRcdFx0XHRzZWxmLnZpZXdzLnBvcCgpO1xuXHRcdFx0XHRzZWxmLnZpZXdzLnB1c2godmlldyk7XG5cdFx0XHR9XG5cdFx0fSwgMSk7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdHRhZ05hbWU6IFwibGlcIixcblx0Y2xhc3NOYW1lOiBcImN1c3RvbVwiLFxuXHRzdGF0dXM6IFwic3RhbGVcIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvY3VzdG9tLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKGRhdGEpO1xuXHRcdFx0c2VsZi4kaW5wdXQgPSBzZWxmLiQoXCJpbnB1dFwiKTtcblx0XHRcdHNlbGYuJGJ1dHRvbiA9IHNlbGYuJChcImJ1dHRvblwiKTtcblx0XHRcdHNlbGYuJGJ1dHRvbi5jc3MoXCJkaXNwbGF5XCIsIFwibm9uZVwiKTtcblx0XHR9KTtcblx0XHRcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGlja1wiOiBcInJvdXRlclwiLFxuXHRcdFwia2V5dXAgaW5wdXRcIjogXCJrZXlIYW5kbGVyXCJcblx0fSxcblx0cm91dGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0aWYoJChlLnRhcmdldCkuaXModGhpcy4kYnV0dG9uKSAmJiB0aGlzLiRpbnB1dC52YWwoKSAhPT0gXCJcIikge1xuXHRcdFx0dGhpcy5zZWxlY3RlZCgpO1xuXHRcdH0gZWxzZSBpZih0aGlzLnN0YXR1cyA9PSBcInNlbGVjdGVkXCIpIHtcblx0XHRcdHRoaXMuJGVsLnRyaWdnZXIoXCJxdWVzdGlvbkNsaWNrZWRcIiwge3NlbGVjdGVkUXVlc3Rpb246IHRoaXN9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5lZGl0aW5nKCk7XG5cdFx0fVxuXHR9LFxuXHRrZXlIYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0aWYoZS5rZXlDb2RlID09IDEzKXtcblx0XHRcdHRoaXMuJGJ1dHRvbi5jbGljaygpO1xuXHRcdH1cblx0fSxcblx0ZWRpdGluZzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuc3RhdHVzID0gXCJlZGl0aW5nXCI7XG5cdFx0XG5cdFx0Ly8gQWxsb3cgZWRpdGluZ1xuXHRcdHNlbGYuJGlucHV0LnByb3AoXCJyZWFkb25seVwiLCBmYWxzZSkuZm9jdXMoKTtcblx0XHRcblx0XHQvLyBBbmltYXRlIGlmIG5vdCBhbHJlYWR5IGRvbmVcblx0XHRpZighc2VsZi4kZWwuaGFzQ2xhc3MoXCJmb2N1c2VkXCIpKSB7XG5cdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjUsIHtjbGFzc05hbWU6IFwiKz1mb2N1c2VkXCJ9KTtcblx0XHRcdFxuXHRcdFx0VHdlZW5NYXguZnJvbVRvKHNlbGYuJGJ1dHRvbiwgLjUsXG5cdFx0XHRcdHtvcGFjaXR5OiAwLCBkaXNwbGF5OiBcImJsb2NrXCJ9LFxuXHRcdFx0XHR7b3BhY2l0eTogMX1cblx0XHRcdCk7XG5cdFx0fVxuXHR9LFxuXHRzZWxlY3RlZDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuc3RhdHVzID0gXCJzZWxlY3RlZFwiO1xuXHRcdFxuXHRcdC8vIFNhdmUgZGF0YSB0byBtb29kZWxcblx0XHRzZWxmLm1vZGVsLnNldCh7XCJ0ZXh0XCI6IHNlbGYuJGlucHV0LnZhbCgpfSk7XG5cdFx0XG5cdFx0Ly8gRGlzYWJsZSBlZGl0aW5nIGFuZCBzaHJpbmtcblx0XHRzZWxmLiRpbnB1dC5ibHVyKCkucHJvcChcInJlYWRvbmx5XCIsIHRydWUpO1xuXHRcdHNlbGYuc2hyaW5rKCk7XG5cblx0XHQvLyBGaXJlIGV2ZW50IHRvIHBhcmVudFxuXHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJxdWVzdGlvbkNsaWNrZWRcIiwge3NlbGVjdGVkUXVlc3Rpb246IHNlbGZ9KTtcblx0fSxcblx0c3RhbGU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGlucHV0LnZhbChcIlwiKTtcblx0XHRcblx0XHRpZih0aGlzLnN0YXR1cyA9PSBcImVkaXRpbmdcIikge1xuXHRcdFx0dGhpcy5zaHJpbmsoKTtcblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5zdGF0dXMgPSBcInN0YWxlXCI7XG5cdH0sXG5cdHNocmluazogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGVsLCAuNSwge2NsYXNzTmFtZTogXCItPWZvY3VzZWRcIn0pO1xuXHRcdFxuXHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGJ1dHRvbiwgLjUsIHtcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRkaXNwbGF5OiBcIm5vbmVcIlxuXHRcdH0pO1xuXHR9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdHRlbXBsYXRlOiBfLnRlbXBsYXRlKFwiPCU9IHRleHQgJT5cIiksXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGlja1wiOiBcImNsaWNrZWRcIlxuXHR9LFxuXHRjbGlja2VkOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicXVlc3Rpb25DbGlja2VkXCIsIHtzZWxlY3RlZFF1ZXN0aW9uOiB0aGlzfSk7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdC8vdXJsOiBcImh0dHA6Ly9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXNrXCIsXG5cdHVybDogXCJodHRwOi8vYXRsZGV2LnBhdGh3YXkuY29tOjMwMDAvYXNrXCIsXG5cdC8vdXJsOiBcImh0dHA6Ly9vbWUtZGVtby5wYXRod2F5LmNvbTo4MDgwL2Fza1wiLFxuXHRjbGFzc05hbWU6IFwicmVzcG9uc2VcIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIEdldCBzdG9yZWQgcmVzcG9uc2VzIGFuZCBzZXR1cFxuXHRcdCQuZ2V0SlNPTihcIi9qcy9qc29uL2Fuc3dlcnMuanNcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5hbnN3ZXJzID0gZGF0YTtcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XHRzZWxmLnNldFRvTG9hZGluZygpO1xuXHRcdH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc2V0VG9Mb2FkaW5nKCk7XG5cdFx0dGhpcy4kZWwuaGlkZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrIGZvb3RlciBkaXY6bnRoLWxhc3QtY2hpbGQoLW4gKyAyKVwiOiBcIm1hcmtSYXRlZFwiXG5cdH0sXG5cdG1hcmtSYXRlZDogZnVuY3Rpb24oZSkge1xuXHRcdCQoZS5jdXJyZW50VGFyZ2V0KS5wYXJlbnQoKS5maW5kKFwiZGl2XCIpLnJlbW92ZUNsYXNzKFwiY2xpY2tlZFwiKTtcblx0XHQkKGUuY3VycmVudFRhcmdldCkuYWRkQ2xhc3MoXCJjbGlja2VkXCIpO1xuXHR9LFxuXHRzZXRUb0xvYWRpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGVsXG5cdFx0XHQuZW1wdHkoKVxuXHRcdFx0LmFkZENsYXNzKFwic3Bpbm5lclwiKVxuXHRcdFx0LnJlbW92ZUNsYXNzKFwic3Bpbk91dFwiKVxuXHRcdFx0LnJlbW92ZUNsYXNzKFwibWFwXCIpXG5cdFx0O1xuXHR9LFxuXHRwcmVwYXJlOiBmdW5jdGlvbihhbnN3ZXIpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQvLyBBZGp1c3Qgc2l6ZSBvZiBhbnN3ZXIgYXJlYSBiYXNlZCBvbiBxdWVzdGlvbiBzaXplXG5cdFx0dmFyIHRvcCA9IGFuc3dlci4kZWwucGFyZW50KCkub2Zmc2V0KCkudG9wICsgNTggKyAxMDtcblx0XHR2YXIgaGVpZ2h0ID0gNTIwIC0gNTg7XG5cdFx0XG5cdFx0c2VsZi4kZWwuY3NzKHtcblx0XHRcdGRpc3BsYXk6IFwiYmxvY2tcIixcblx0XHRcdHRvcDogdG9wLFxuXHRcdFx0aGVpZ2h0OiBoZWlnaHRcblx0XHR9KTtcblx0XHRcblx0XHQvLyBGYWRlIGluIHJlc3BvbnNlXG5cdFx0VHdlZW5NYXguZnJvbVRvKHNlbGYuJGVsLCAuNSwge29wYWNpdHk6IDB9LCB7b3BhY2l0eTogMSwgb3ZlcndyaXRlOiBcImFsbFwifSk7XG5cdH0sXG5cdGdldDogZnVuY3Rpb24ocGVyc29uLCBxdWVzdGlvbikge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgcmVxdWVzdERhdGE7XG5cdFx0c2VsZi5hbnN3ZXIgPSB7fTtcblx0XHRzZWxmLmFuc3dlci5jaWQgPSBwZXJzb24uY2lkO1xuXHRcdHNlbGYuYW5zd2VyLnBlcnNvbklEID0gcGVyc29uLm1vZGVsLmdldChcImlkXCIpO1xuXHRcdHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQgPSBxdWVzdGlvbi5tb2RlbC5nZXQoXCJpZFwiKTtcblx0XHRzZWxmLmFuc3dlci5odG1sID0gXCJcIjtcblx0XHRcblx0XHR2YXIgbnVtYmVyV2l0aENvbW1hcyA9IGZ1bmN0aW9uKHgpIHtcblx0XHRcdHJldHVybiB4LnRvU3RyaW5nKCkucmVwbGFjZSgvXFxCKD89KFxcZHszfSkrKD8hXFxkKSkvZywgXCIsXCIpO1xuXHRcdH07XG5cdFx0XG5cdFx0Ly8gQ2hlY2sgaWYgc3RvcmVkIHJlc3BvbnNlXG5cdFx0aWYoc2VsZi5hbnN3ZXIucXVlc3Rpb25JRCA8IDQpIHtcblx0XHRcdHZhciBodG1sID0gXCJcIjtcblx0XHRcdFxuXHRcdFx0c3dpdGNoKHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQpIHtcblx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdC8vIEdldCBmaXRuZXNzIGRhdGEgYWJvdXQgcGVyc29uXG5cdFx0XHRcdFx0cmVxdWVzdERhdGEgPSB7XG5cdFx0XHRcdFx0XHRcInVzZXJJZFwiOiBzZWxmLmFuc3dlci5wZXJzb25JRCxcblx0XHRcdFx0XHRcdFwiZml0bmVzc1wiOiBcInRydWVcIlxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBhbnN3ZXJcblx0XHRcdFx0XHRzZWxmLmpxeGhyID0gJC5hamF4KHtcblx0XHRcdFx0XHRcdHVybDogc2VsZi51cmwsXG5cdFx0XHRcdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdFx0XHRcdGRhdGFUeXBlOiBcImpzb25wXCIsXG5cdFx0XHRcdFx0XHR0aW1lb3V0OiAzMDAwXG5cdFx0XHRcdFx0fSkuYWx3YXlzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywganF4aHIpIHtcblx0XHRcdFx0XHRcdGlmKHN0YXR1cyA9PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLmZpdG5lc3MuY29kZSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgcmFuZG9tTnVtYmVyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNik7XG5cdFx0XHRcdFx0XHRcdHZhciByYW5kb21SZXNwb25zZTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdC8vIEdlbmVyYXRlIHJhbmRvbSByZXNwb25zZVxuXHRcdFx0XHRcdFx0XHRpZihyYW5kb21OdW1iZXIgIT0gNCkge1xuXHRcdFx0XHRcdFx0XHRcdHJhbmRvbVJlc3BvbnNlID0gc2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tyYW5kb21OdW1iZXJdO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJhbmRvbVJlc3BvbnNlID1cblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5yZXNwb25zZXNbcmFuZG9tTnVtYmVyXVswXSArXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ubG9jYXRpb25zW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0udGl0bGUgK1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tyYW5kb21OdW1iZXJdWzFdICtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5sb2NhdGlvbnNbc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXS5hZGRyZXNzICtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5yZXNwb25zZXNbcmFuZG9tTnVtYmVyXVsyXVxuXHRcdFx0XHRcdFx0XHRcdDtcblx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHQvLyBBc3NpZ24gc2luZ2xlIGxvY2F0aW9uXG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIubG9jYXRpb25zID0gW3NlbGYuYW5zd2Vyc1swXS5sb2NhdGlvbnNbc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXV07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdGh0bWwgPVxuXHRcdFx0XHRcdFx0XHRcdHBlcnNvbi5tb2RlbC5nZXQoXCJuYW1lXCIpICtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucGFydHNbMF0gK1xuXHRcdFx0XHRcdFx0XHRcdFwiPHNwYW4gY2xhc3M9J2hpZ2hsaWdodCc+XCIgKyBudW1iZXJXaXRoQ29tbWFzKGRhdGEuZml0bmVzcy5zdW1tYXJ5LmNhbG9yaWVzT3V0KSArIFwiPC9zcGFuPlwiICtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucGFydHNbMV0gK1xuXHRcdFx0XHRcdFx0XHRcdHBlcnNvbi5tb2RlbC5nZXQoXCJnb2Fsc1wiKSArXG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnBhcnRzWzJdICtcblx0XHRcdFx0XHRcdFx0XHRyYW5kb21SZXNwb25zZVxuXHRcdFx0XHRcdFx0XHQ7XG5cdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBodG1sO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IFwiPHA+U29ycnksIHBsZWFzZSB0cnkgYWdhaW4uPC9wPlwiO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzZWxmLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImFuc3dlclJlYWR5XCIpO30sIDI1MDApO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIDI6XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IHNlbGYuYW5zd2Vyc1sxXVtzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdLmh0bWw7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGxvY2F0aW9ucyA9IHNlbGYuYW5zd2Vyc1sxXVtzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdLmxvY2F0aW9ucztcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGQgbG9jYXRpb24gbmFtZXMgdG8gaHRtbFxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgKz0gXCI8dWw+XCI7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGxvY2F0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBcIjxsaT5cIiArIGxvY2F0aW9uc1tpXS50aXRsZSArIFwiPC9saT5cIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBcIjwvdWw+XCI7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIubG9jYXRpb25zID0gbG9jYXRpb25zO1xuXHRcdFx0XHRcdHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7fSwgMzAwMCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMzpcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gc2VsZi5hbnN3ZXJzWzJdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV07XG5cdFx0XHRcdFx0c2VsZi50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTt9LCAzMDAwKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gVG8gYmUgc2VudCB0byBBUElcblx0XHRcdHJlcXVlc3REYXRhID0ge1xuXHRcdFx0XHRcInVzZXJJZFwiOiAxLCAvLyBzZWxmLmFuc3dlci5wZXJzb25JRCxcblx0XHRcdFx0XCJxdWVzdGlvblwiOiB7XG5cdFx0XHRcdFx0XCJxdWVzdGlvblRleHRcIjogcXVlc3Rpb24ubW9kZWwuZ2V0KFwidGV4dFwiKVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHQvLyBHZXQgdGhlIGFuc3dlclxuXHRcdFx0c2VsZi5qcXhociA9ICQuYWpheCh7XG5cdFx0XHRcdHVybDogc2VsZi51cmwsXG5cdFx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0XHRkYXRhVHlwZTogXCJqc29ucFwiLFxuXHRcdFx0XHR0aW1lb3V0OiAxNTAwMFxuXHRcdFx0fSkuYWx3YXlzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywganF4aHIpIHtcblx0XHRcdFx0aWYoc3RhdHVzID09IFwic3VjY2Vzc1wiICYmIGRhdGEuYW5zd2VyLmFuc3dlcnNbMF0pIHtcblx0XHRcdFx0XHRpZihzZWxmLmFuc3dlci5xdWVzdGlvbklEID09IDUgJiYgc2VsZi5hbnN3ZXIucGVyc29uSUQgPT0gMikge1xuXHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBzZWxmLmFuc3dlcnNbM107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgKz0gZGF0YS5hbnN3ZXIuYW5zd2Vyc1swXS5mb3JtYXR0ZWRUZXh0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBcIjxwPlNvcnJ5LCBwbGVhc2UgdHJ5IGFnYWluLjwvcD5cIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHNob3c6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIEdyYWNlZnVsbHkgaGlkZSBzcGlubmVyXG5cdFx0c2VsZi4kZWwucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcblx0XHRpZihzZWxmLmFuc3dlci5odG1sKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoXCI8bWFpbj5cIiArIHNlbGYuYW5zd2VyLmh0bWwgKyBcIjwvbWFpbj5cIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxtYWluPjxwPlNvcnJ5LCBwbGVhc2UgdHJ5IGFnYWluIGxhdGVyLjwvcD48L21haW4+XCIpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBTaG93IG1hcCBpZiBsb2NhdGlvbnMgYXJlIGF2YWlsYWJsZVxuXHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9ucykge1xuXHRcdFx0c2VsZi4kZWwuYWRkQ2xhc3MoXCJtYXBcIik7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoXCI8ZGl2IGNsYXNzPSdjb250YWluZXInPjxkaXYgaWQ9J21hcCc+PC9kaXY+PC9kaXY+XCIpO1xuXHRcdFx0XG5cdFx0XHQkLmdldEpTT04oXCIvanMvanNvbi9tYXAuanNcIiwgZnVuY3Rpb24oc3R5bGVzKSB7XG5cdFx0XHRcdHZhciBzdHlsZWRNYXAgPSBuZXcgZ29vZ2xlLm1hcHMuU3R5bGVkTWFwVHlwZShcblx0XHRcdFx0XHRzdHlsZXMsXG5cdFx0XHRcdFx0e25hbWU6IFwiU3R5bGVkXCJ9XG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgbWFwT3B0aW9ucyA9IHtcblx0XHRcdFx0XHRtYXBUeXBlQ29udHJvbE9wdGlvbnM6IHtcblx0XHRcdFx0XHRcdG1hcFR5cGVJZHM6IFtnb29nbGUubWFwcy5NYXBUeXBlSWQuUk9BRE1BUCwgXCJtYXBfc3R5bGVcIl1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG1hcFR5cGVDb250cm9sOiBmYWxzZSxcblx0XHRcdFx0XHRzdHJlZXRWaWV3Q29udHJvbDogZmFsc2UsXG5cdFx0XHRcdFx0em9vbUNvbnRyb2w6IHRydWUsXG5cdFx0XHRcdFx0em9vbUNvbnRyb2xPcHRpb25zOiB7XG5cdFx0XHRcdFx0XHRzdHlsZTogZ29vZ2xlLm1hcHMuWm9vbUNvbnRyb2xTdHlsZS5MQVJHRSxcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiBnb29nbGUubWFwcy5Db250cm9sUG9zaXRpb24uTEVGVF9UT1Bcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgbWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1hcFwiKSwgbWFwT3B0aW9ucyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRtYXAubWFwVHlwZXMuc2V0KFwibWFwX3N0eWxlXCIsIHN0eWxlZE1hcCk7XG5cdFx0XHRcdG1hcC5zZXRNYXBUeXBlSWQoXCJtYXBfc3R5bGVcIik7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xuXHRcdFx0XHR2YXIgaW5mb3dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KCk7ICBcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEFkZCBtYXJrZXJzXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5hbnN3ZXIubG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Ly8gRm9ybWF0IHRpdGxlXG5cdFx0XHRcdFx0dmFyIGNvbnRlbnQgPSBcIlwiO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS50aXRsZSkge1xuXHRcdFx0XHRcdFx0Y29udGVudCA9IFwiPGRpdiBjbGFzcz0ndGl0bGUnPlwiICsgc2VsZi5hbnN3ZXIubG9jYXRpb25zW2ldLnRpdGxlICsgXCI8L2Rpdj5cIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYoc2VsZi5hbnN3ZXIubG9jYXRpb25zW2ldLmRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdFx0XHRjb250ZW50ICs9IFwiPGRpdiBjbGFzcz0nZGVzY3JpcHRpb24nPlwiICsgc2VsZi5hbnN3ZXIubG9jYXRpb25zW2ldLmRlc2NyaXB0aW9uICsgXCI8L2Rpdj5cIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoXG5cdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5jb29yZGluYXRlcy5sYXR0aXR1ZGUsXG5cdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5jb29yZGluYXRlcy5sb25naXR1ZGVcblx0XHRcdFx0XHRcdCksXG5cdFx0XHRcdFx0XHRtYXA6IG1hcCxcblx0XHRcdFx0XHRcdHRpdGxlOiBjb250ZW50LFxuXHRcdFx0XHRcdFx0dmlzaWJsZTogdHJ1ZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vZXh0ZW5kIHRoZSBib3VuZHMgdG8gaW5jbHVkZSBlYWNoIG1hcmtlcidzIHBvc2l0aW9uXG5cdFx0XHRcdFx0Ym91bmRzLmV4dGVuZChtYXJrZXIucG9zaXRpb24pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKG1hcmtlciwgXCJjbGlja1wiLCAoZnVuY3Rpb24obWFya2VyLCBpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGluZm93aW5kb3cuc2V0Q29udGVudChtYXJrZXIudGl0bGUpO1xuXHRcdFx0XHRcdFx0XHRpbmZvd2luZG93Lm9wZW4obWFwLCBtYXJrZXIpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9KShtYXJrZXIsIGkpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0bWFwLmZpdEJvdW5kcyhib3VuZHMpO1xuXG5cdFx0XHRcdC8vIFpvb20gb3V0IGZvciBzaW5nbGUgZGVzdGluYXRpb24gbWFwc1xuXHRcdFx0XHRpZihzZWxmLmFuc3dlci5sb2NhdGlvbnMubGVuZ3RoIDwgMikge1xuXHRcdFx0XHRcdHZhciBsaXN0ZW5lciA9IGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKG1hcCwgXCJpZGxlXCIsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdG1hcC5zZXRab29tKDExKTtcblx0XHRcdFx0XHRcdGdvb2dsZS5tYXBzLmV2ZW50LnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gQWRkIGluIHRodW1icyB1cCBhbmQgZG93blxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24vcmVzcG9uc2UvZm9vdGVyLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKGRhdGEpO1xuXHRcdH0pO1xuXHR9LFxuXHRoaWRlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0VHdlZW5NYXguZnJvbVRvKHNlbGYuJGVsLCAuNSwge29wYWNpdHk6IDF9LCB7XG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0ZGlzcGxheTogXCJub25lXCIsXG5cdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5zZXRUb0xvYWRpbmcoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInZpZXcgaGVsbG9cIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XG5cdFx0Ly8gQnV0dG9uIHRvIGVuZFxuXHRcdHNlbGYuJGVsLm9uZShcImNsaWNrXCIsIFwiYnV0dG9uXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi50cmlnZ2VyKFwiZW5kXCIpO1xuXHRcdH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGVsLmxvYWQoXCIvdGVtcGxhdGVzL2hlbGxvLmh0bWxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBTaWduYWwgdG8gcGFyZW50XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJ2aWV3IGludHJvXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiZW5kXCIpO30sIDcwMDApO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGVsLmxvYWQoXCIvdGVtcGxhdGVzL2ludHJvLmh0bWxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBTaWduYWwgdG8gcGFyZW50XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIEFwcFZpZXcgPSByZXF1aXJlKFwiLi9hcHBcIik7XG5cbi8vXHRJbml0aWF0aW9uXG4kKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcblx0Ly8gVGltZXIgY29kZVxuXHR2YXIgcmVzZXRUaW1lciA9IGZ1bmN0aW9uKHQpIHtcblx0XHRpZih0ID09PSAwKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xuXHRcdH1cblx0XHRpZih0ID4gOTApIHtcblx0XHRcdC8vIHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKFwiL1wiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dCsrO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3Jlc2V0VGltZXIodCk7fSwgMTAwMCk7XG5cdFx0fVxuXHR9O1xuXHRcblx0Ly8gU3RhcnQgdGltZXJcblx0dmFyIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtyZXNldFRpbWVyKDApO30sIDEwMDApO1xuXHRcblx0JChkb2N1bWVudCkub24oXCJ0b3VjaHN0YXJ0IG1vdXNlZG93blwiLCBmdW5jdGlvbihlKSB7XG5cdFx0Ly8gUHJldmVudCBzY3JvbGxpbmcgb24gYW55IHRvdWNoZXMgdG8gc2NyZWVuXG5cdFx0JCh0aGlzKS5wcmV2ZW50U2Nyb2xsaW5nKGUpO1xuXHRcdFxuXHRcdC8vIFJlc2V0IHRpbWVyXG5cdFx0cmVzZXRUaW1lcigwKTtcblx0fSk7XG5cdFxuXHQvLyBGYXN0IGNsaWNrcyBmb3IgdG91Y2ggdXNlcnNcblx0RmFzdENsaWNrLmF0dGFjaChkb2N1bWVudC5ib2R5KTtcblx0XG5cdC8vIFN0YXJ0IVxuXHR3aW5kb3cuYXBwID0gbmV3IEFwcFZpZXcoKTtcbn0pOyJdfQ==
