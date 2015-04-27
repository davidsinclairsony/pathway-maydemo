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
var config = require("../../../config");

module.exports = Backbone.View.extend({
	className: "response",
	initialize: function() {
		var self = this;
		
		// Load data and start
		var a1 = $.getJSON("/js/json/genes.js");
		var a2 = $.getJSON("/js/json/answers.js");
		var a3 = $.get("/templates/conversation/response/genes.html");
		
		$.when(a1, a2, a3).done(function(r1, r2, r3) {
			self.genes = r1[0];
			self.answers = r2[0];
			self.genesTemplate = _.template(r3[0]);
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
			.removeClass("has-map")
			.removeClass("has-genes")
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
		
		// Gene list
		if([1, 2, 3].indexOf(self.answer.questionID) > -1) {
			self.answer.genes = self.genesTemplate(self.genes[question.model.get("genes")]);
		}
		
		// Get answer and map, depending on stored response
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
						url: config.url,
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
				url: config.url,
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
		
		// Show genes if so
		if(self.answer.genes) {
			self.$el.addClass("has-genes");
			self.$el.append(self.answer.genes);
		}
		
		// Show map if locations are available
		if(self.answer.locations) {
			self.$el.addClass("has-map");
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
},{"../../../config":16}],14:[function(require,module,exports){
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
module.exports = {
	//url: "http://" + window.location.host + "/ask",
	url: "http://atldev.pathway.com:3000/ask"
	//url: "http://ome-demo.pathway.com:8080/ask",
};
},{}],17:[function(require,module,exports){
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
			//window.location.replace("/");
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
},{"./app":1}]},{},[17])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hcHAuanMiLCJqcy9hcHAvY29sbGVjdGlvbnMvcGVvcGxlLmpzIiwianMvYXBwL2NvbGxlY3Rpb25zL3F1ZXN0aW9ucy5qcyIsImpzL2FwcC9tb2RlbHMvcGVyc29uLmpzIiwianMvYXBwL3JvdXRlci5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24uanMiLCJqcy9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZS5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcGVvcGxlL3BlcnNvbi5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zLmpzIiwianMvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvY3VzdG9tUXVlc3Rpb24uanMiLCJqcy9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9xdWVzdGlvbi5qcyIsImpzL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcmVzcG9uc2UuanMiLCJqcy9hcHAvdmlld3MvaGVsbG8uanMiLCJqcy9hcHAvdmlld3MvaW50cm8uanMiLCJqcy9jb25maWcuanMiLCJqcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBOzs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIEludHJvVmlldyA9IHJlcXVpcmUoXCIuL2FwcC92aWV3cy9pbnRyb1wiKTtcbnZhciBIZWxsb1ZpZXcgPSByZXF1aXJlKFwiLi9hcHAvdmlld3MvaGVsbG9cIik7XG52YXIgQ29udmVyc2F0aW9uVmlldyA9IHJlcXVpcmUoXCIuL2FwcC92aWV3cy9jb252ZXJzYXRpb25cIik7XG52YXIgUm91dGVyID0gcmVxdWlyZShcIi4vYXBwL3JvdXRlclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGVsOiBcIiNhcHBcIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIFN0YXJ0IHJvdXRlciB3aXRoIHByZWRlZmluZWQgcm91dGVzXG5cdFx0dGhpcy5yb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG5cdFx0XG5cdFx0Ly8gUm91dGUgYWN0aW9uc1xuXHRcdHRoaXMucm91dGVyLm9uKFwicm91dGU6aW50cm9cIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdmlldyA9IG5ldyBJbnRyb1ZpZXcoKTtcblx0XHRcdFxuXHRcdFx0c2VsZi5nb1RvKHZpZXcpO1xuXHRcdFx0XG5cdFx0XHQvLyBMaXN0ZW4gZm9yIGVuZCBvZiB2aWV3XG5cdFx0XHRzZWxmLmxpc3RlblRvT25jZSh2aWV3LCBcImVuZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5yb3V0ZXIubmF2aWdhdGUoXCJoZWxsb1wiLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0dGhpcy5yb3V0ZXIub24oXCJyb3V0ZTpoZWxsb1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB2aWV3ID0gbmV3IEhlbGxvVmlldygpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLmdvVG8odmlldyk7XG5cdFx0XHRcblx0XHRcdC8vIExpc3RlbiBmb3IgZW5kIG9mIHZpZXdcblx0XHRcdHNlbGYubGlzdGVuVG9PbmNlKHZpZXcsIFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLnJvdXRlci5uYXZpZ2F0ZShcImNvbnZlcnNhdGlvblwiLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0dGhpcy5yb3V0ZXIub24oXCJyb3V0ZTpjb252ZXJzYXRpb25cIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY29udmVyc2F0aW9uVmlldyA9IG5ldyBDb252ZXJzYXRpb25WaWV3KCk7XG5cdFx0XHRcblx0XHRcdHNlbGYuZ29Ubyhjb252ZXJzYXRpb25WaWV3KTtcblx0XHR9KTtcblx0XHRcblx0XHQvLyBTdGFydCB0cmFja2luZ1xuXHRcdEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZX0pO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrIC5yZWZyZXNoXCI6IFwicmVmcmVzaFwiXG5cdH0sXG5cdHJlZnJlc2g6IGZ1bmN0aW9uKCkge1xuXHRcdHdpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKFwiL1wiKTtcblx0fSxcblx0Z29UbzogZnVuY3Rpb24odmlldykge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgcHJldmlvdXMgPSB0aGlzLmN1cnJlbnRWaWV3IHx8IG51bGw7XG5cdFx0dmFyIG5leHQgPSB2aWV3O1xuXHRcdFxuXHRcdC8vIEhpZGUgdGhlIGN1cnJlbnQgdmlld1xuXHRcdGlmKHByZXZpb3VzKSB7XG5cdFx0XHRUd2Vlbk1heC50byhwcmV2aW91cy4kZWwsIC41LCB7XG5cdFx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge3ByZXZpb3VzLnJlbW92ZSgpO31cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvLyBBZGQgLCBoaWRlLCBhbmQgd2FpdCB1bnRpbCBsb2FkZWRcblx0XHRzZWxmLmN1cnJlbnRWaWV3ID0gbmV4dDtcblx0XHRzZWxmLiRlbC5hcHBlbmQobmV4dC5lbCk7XG5cdFx0bmV4dC4kZWwuaGlkZSgpO1xuXHRcdFxuXHRcdHNlbGYubGlzdGVuVG9PbmNlKG5leHQsIFwibG9hZGVkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gV2FpdCBmb3IgaW1hZ2VzIGFuZCByZXZlYWxcblx0XHRcdG5leHQuJGVsLndhaXRGb3JJbWFnZXMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuJGVsLnJlbW92ZUNsYXNzKFwic3Bpbm5lclwiKS5hZGRDbGFzcyhcInNwaW5PdXRcIik7XG5cdFx0XHRcdG5leHQuJGVsLnNob3coKTtcblx0XHRcdFx0VHdlZW5NYXguZnJvbShuZXh0LiRlbCwgLjUsIHtvcGFjaXR5OiAwfSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFBlcnNvbk1vZGVsID0gcmVxdWlyZShcIi4uL21vZGVscy9wZXJzb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRtb2RlbDogUGVyc29uTW9kZWxcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFF1ZXN0aW9uTW9kZWwgPSByZXF1aXJlKFwiLi4vbW9kZWxzL3F1ZXN0aW9uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0bW9kZWw6IFF1ZXN0aW9uTW9kZWxcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe30pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcblx0cm91dGVzOiB7XG5cdFx0XCJcIjogXCJpbnRyb1wiLFxuXHRcdFwiaGVsbG9cIjogXCJoZWxsb1wiLFxuXHRcdFwiY29udmVyc2F0aW9uXCI6IFwiY29udmVyc2F0aW9uXCIsXG5cdFx0JyplcnJvcic6ICdlcnJvcidcblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUGVvcGxlVmlldyA9IHJlcXVpcmUoXCIuL2NvbnZlcnNhdGlvbi9wZW9wbGVcIik7XG52YXIgUXVlc3Rpb25zVmlldyA9IHJlcXVpcmUoXCIuL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnNcIik7XG52YXIgUmVzcG9uc2VWaWV3ID0gcmVxdWlyZShcIi4vY29udmVyc2F0aW9uL3Jlc3BvbnNlXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInZpZXcgY29udmVyc2F0aW9uXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdFx0XG5cdFx0Ly8gQ2hpbGQgdmlld3Ncblx0XHR0aGlzLnBlb3BsZVZpZXcgPSBuZXcgUGVvcGxlVmlldygpO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCh0aGlzLnBlb3BsZVZpZXcuZWwpO1xuXHRcdHRoaXMucXVlc3Rpb25zVmlldyA9IG5ldyBRdWVzdGlvbnNWaWV3KCk7XG5cdFx0dGhpcy4kZWwuYXBwZW5kKHRoaXMucXVlc3Rpb25zVmlldy5lbCk7XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcgPSBuZXcgUmVzcG9uc2VWaWV3KCk7XG5cdFx0dGhpcy4kZWwuYXBwZW5kKHRoaXMucmVzcG9uc2VWaWV3LmVsKTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKGRhdGEpO1xuXHRcdFx0c2VsZi4kZWwuaGFtbWVyKHtkb21FdmVudHM6IHRydWV9KTtcblx0XHRcdHNlbGYudHJpZ2dlcihcImxvYWRlZFwiKTtcblx0XHR9KTtcblx0XHRcblx0XHRyZXR1cm4gc2VsZjtcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayAuYXNrXCI6IFwiYXNrQW5vdGhlclF1ZXN0aW9uXCIsXG5cdFx0XCJjbGljayAuaG93LCBmb290ZXIgLmNsb3NlXCI6IFwiaG93VG9nZ2xlclwiLFxuXHRcdFwicmV2ZWFsQWxsUXVlc3Rpb25zXCI6IFwiYXNrQW5vdGhlclF1ZXN0aW9uXCIsXG5cdFx0XCJoaWRBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uXCI6IFwicHJlcGFyZUZvclJlc3BvbnNlXCIsXG5cdFx0XCJyZXZlYWxlZEFsbFF1ZXN0aW9uc1wiOiBcImhpZGVSZXNwb25zZVwiLFxuXHRcdFwiZGF0YVNvdXJjZWRcIjogXCJnZXRBbmRTaG93UmVzcG9uc2VcIixcblx0XHRcInBhbnN0YXJ0XCI6IFwicGFuSGFuZGxlclwiLFxuXHRcdFwicGFuXCI6IFwicGFuSGFuZGxlclwiLFxuXHRcdFwic3dpcGVkXCI6IFwic3dpcGVIYW5kbGVyXCIsXG5cdH0sXG5cdHBhbkhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHQvLyBQcmV2ZW50IHBhbi9zd2lwZSBvbiByZXNwb25zZSB2aWV3IGFuZCBtb2RhbFxuXHRcdGlmKFxuXHRcdFx0ZS5vcmlnaW5hbEV2ZW50ICYmXG5cdFx0XHQhJChlLnRhcmdldCkucGFyZW50cyhcIi5yZXNwb25zZVwiKS5sZW5ndGggJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5oYXNDbGFzcyhcInJlc3BvbnNlXCIpICYmXG5cdFx0XHQhJChlLnRhcmdldCkucGFyZW50cyhcIi5tb2RhbFwiKS5sZW5ndGggJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5oYXNDbGFzcyhcIm1vZGFsXCIpXG5cdFx0KSB7XG5cdFx0XHR0aGlzLnBlb3BsZVZpZXcucGFuSGFuZGxlcihlKTtcblx0XHR9XG5cdH0sXG5cdHN3aXBlSGFuZGxlcjogZnVuY3Rpb24oZXZlbnQsIG9iamVjdHMpIHtcblx0XHR0aGlzLnBlb3BsZVZpZXcuc3dpcGVIYW5kbGVyKG9iamVjdHMuZXZlbnQpO1xuXHRcdFxuXHRcdGlmKHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHQvLyBSZXNldCByZXNwb25zZSB2aWV3XG5cdFx0XHR0aGlzLnJlc3BvbnNlVmlldy5zZXRUb0xvYWRpbmcoKTtcblx0XHRcdFxuXHRcdFx0Ly8gUHJlcGFyZSBmb3IgcmVzcG9uc2Vcblx0XHRcdHRoaXMucHJlcGFyZUZvclJlc3BvbnNlKCk7XG5cdFx0fVxuXHR9LFxuXHRob3dUb2dnbGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgJGtub3cgPSB0aGlzLiQoXCIua25vd1wiKTtcblx0XHRcblx0XHQka25vdy50b2dnbGVDbGFzcyhcIm9mZlwiLCAka25vdy5oYXNDbGFzcyhcIm9uXCIpKTtcblx0XHQka25vdy50b2dnbGVDbGFzcyhcIm9uXCIsICEka25vdy5oYXNDbGFzcyhcIm9uXCIpKTtcblx0fSxcblx0YXNrQW5vdGhlclF1ZXN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcucmV2ZWFsQWxsUXVlc3Rpb25zKCk7XG5cdH0sXG5cdHByZXBhcmVGb3JSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcucHJlcGFyZSh0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbik7XG5cdFx0VHdlZW5NYXgudG8odGhpcy4kKFwiLmxvd2VyXCIpLCAuNSwge29wYWNpdHk6IDF9KTtcblx0XHRcblx0XHQvLyBUaGlzIHdpbGwgc3RhcnQgdGhlIGNoaWNsZXRzIGxvYWRpbmdcblx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24ub2J0YWluRGF0YSgpO1xuXHR9LFxuXHRnZXRBbmRTaG93UmVzcG9uc2U6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIENsZWFyIHByZXZpb3VzIGxpc3RlbnNcblx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcodGhpcy5yZXNwb25zZVZpZXcsIFwiYW5zd2VyUmVhZHlcIik7XG5cdFx0XG5cdFx0Ly8gQ2xlYXIgb2xkIHRpbWVvdXRzIGFuZCByZXF1ZXN0c1xuXHRcdGlmKHRoaXMucmVzcG9uc2VWaWV3LmpxeGhyKSB7XG5cdFx0XHR0aGlzLnJlc3BvbnNlVmlldy5qcXhoci5hYm9ydCgpO1xuXHRcdH1cblx0XHRpZih0aGlzLnJlc3BvbnNlVmlldy50aW1lb3V0KSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy5yZXNwb25zZVZpZXcudGltZW91dCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIExpc3RlbiBmb3Igd2hlbiB0aGUgYW5zd2VyIGlzIHJlYWR5IHRvIGRpc3BsYXlcblx0XHR0aGlzLmxpc3RlblRvT25jZSh0aGlzLnJlc3BvbnNlVmlldywgXCJhbnN3ZXJSZWFkeVwiLCBmdW5jdGlvbigpIHtcblx0XHRcdC8vIENoZWNrIGlmIHN0aWxsIHRoZSBjdXJyZW50IHF1ZXN0aW9uIGFuZCBwZXJzb25cblx0XHRcdGlmKFxuXHRcdFx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24gJiZcblx0XHRcdFx0dGhpcy5xdWVzdGlvbnNWaWV3LnNlbGVjdGVkUXVlc3Rpb24gJiZcblx0XHRcdFx0dGhpcy5wZW9wbGVWaWV3LnNlbGVjdGVkUGVyc29uLmNpZCA9PSB0aGlzLnJlc3BvbnNlVmlldy5hbnN3ZXIuY2lkICYmXG5cdFx0XHRcdHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uLm1vZGVsLmdldChcImlkXCIpID09IHRoaXMucmVzcG9uc2VWaWV3LmFuc3dlci5xdWVzdGlvbklEXG5cdFx0XHQpIHtcblx0XHRcdFx0dGhpcy5yZXNwb25zZVZpZXcuc2hvdygpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdFxuXHRcdHRoaXMucmVzcG9uc2VWaWV3LmdldChcblx0XHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbixcblx0XHRcdHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uXG5cdFx0KTtcblx0fSxcblx0aGlkZVJlc3BvbnNlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlc3BvbnNlVmlldy5oaWRlKCk7XG5cdFx0VHdlZW5NYXgudG8odGhpcy4kKFwiLmxvd2VyXCIpLCAuNSwge29wYWNpdHk6IDB9KTtcblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgUGVvcGxlQ29sbGVjdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9jb2xsZWN0aW9ucy9wZW9wbGVcIik7XG52YXIgUGVyc29uVmlldyA9IHJlcXVpcmUoXCIuL3Blb3BsZS9wZXJzb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwicGVvcGxlXCIsXG5cdHRhZ05hbWU6IFwidWxcIixcblx0c3dpcGVUaHJlc2hvbGQ6IDEyNSxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdCQuZ2V0SlNPTihcIi9qcy9qc29uL3Blb3BsZS5qc1wiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLnBlb3BsZUNvbGxlY3Rpb24gPSBuZXcgUGVvcGxlQ29sbGVjdGlvbihkYXRhKTtcblx0XHRcdHNlbGYudmlld3MgPSBbXTtcblx0XHRcdFxuXHRcdFx0Ly8gQ3JlYXRlIGN1cnJlbnQgc2VsZWN0ZWQgcGVyc29uIHZpZXdcblx0XHRcdHNlbGYudmlld3MucHVzaChuZXcgUGVyc29uVmlldyh7bW9kZWw6IHNlbGYucGVvcGxlQ29sbGVjdGlvbi5maXJzdCgpfSkpO1xuXHRcdFx0XG5cdFx0XHQvLyBTZXQgc2VsZWN0ZWQgcGVyc29uIHRvIGNlbnRlclxuXHRcdFx0c2VsZi5zZXRTZWxlY3RlZFBlcnNvbihzZWxmLnZpZXdzWzBdKTtcblx0XHRcdFxuXHRcdFx0Ly8gRHJhdyBwZW9wbGVcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0Ly8gQWRkIHNlbGVjdGVkIHBlcnNvblxuXHRcdHRoaXMuJGVsLmh0bWwodGhpcy52aWV3c1swXS5lbCk7XG5cblx0XHQvLyBBZGQgdGhlIG90aGVycyBhcm91bmRcblx0XHR0aGlzLnBhZCgpO1xuXHRcdFxuXHRcdC8vIFNldCBlbmRpbmcgcG9zaXRpb25cblx0XHR0aGlzLnBvc2l0aW9uTGVmdCA9IC0xMTk2O1xuXG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdHNldFNlbGVjdGVkUGVyc29uOiBmdW5jdGlvbih2aWV3KSB7XG5cdFx0Ly8gVHVybiBvZmYgY3VycmVudCBzZWxlY3RlZCBwZXJzb25cblx0XHRpZih0aGlzLnNlbGVjdGVkUGVyc29uKSB7XG5cdFx0XHR0aGlzLnNlbGVjdGVkUGVyc29uLnNlbGVjdGVkID0gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdHRoaXMuc2VsZWN0ZWRQZXJzb24gPSB2aWV3O1xuXHRcdHZpZXcuc2VsZWN0ZWQgPSB0cnVlO1xuXHR9LFxuXHRwYWQ6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIFBhZHMgdG8gNSBlbGVtZW50cyB0b3RhbCwgYXJvdW5kIHRoZSBzZWxlY3RlZCBwZXJzb25cblx0XHRcblx0XHQvLyBHZXQgbG9jYXRpb24gaW4gdmlld3Mgb2Ygc2VsZWN0ZWQgcGVyc29uXG5cdFx0dmFyIGluZGV4T2ZTZWxlY3RlZFBlcnNvbiA9IHRoaXMudmlld3MuaW5kZXhPZih0aGlzLnNlbGVjdGVkUGVyc29uKTtcblx0XHR2YXIgaSwgbW9kZWxJbmRleCwgbW9kZWwsIHZpZXc7XG5cdFx0XG5cdFx0Ly8gR2VuZXJhdGUgYW5kIGFkZCB2aWV3cyBiZWZvcmUgdGhlIHNlbGVjdGVkIHBlcnNvblxuXHRcdHdoaWxlKGluZGV4T2ZTZWxlY3RlZFBlcnNvbiA8IDIpIHtcblx0XHRcdC8vIEdldCBpbmRleCBvZiBmaXJzdCB2aWV3XG5cdFx0XHRtb2RlbEluZGV4ID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmluZGV4T2YodGhpcy52aWV3c1swXS5tb2RlbCk7XG5cdFx0XHRcblx0XHRcdC8vIERldGVybWluZSB3aGljaCBtb2RlbCB0byB1c2Vcblx0XHRcdGlmKG1vZGVsSW5kZXggPT09IDApIHtcblx0XHRcdFx0bW9kZWwgPSAgdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmxhc3QoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vZGVsID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmF0KG1vZGVsSW5kZXggLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0dmlldyA9IG5ldyBQZXJzb25WaWV3KHttb2RlbDogbW9kZWx9KTtcblx0XHRcdHRoaXMudmlld3MudW5zaGlmdCh2aWV3KTtcblx0XHRcdHRoaXMuJGVsLnByZXBlbmQodmlldy5lbCk7XG5cdFx0XHRcblx0XHRcdGluZGV4T2ZTZWxlY3RlZFBlcnNvbiA9IHRoaXMudmlld3MuaW5kZXhPZih0aGlzLnNlbGVjdGVkUGVyc29uKTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0Ly8gQWRkIHZpZXdzIGZvciBhZnRlciB0aGUgc2VsZWN0ZWQgcGVyc29uXG5cdFx0d2hpbGUodGhpcy52aWV3cy5sZW5ndGggPCA1KSB7XG5cdFx0XHQvLyBHZXQgaW5kZXggb2YgbGFzdCB2aWV3XG5cdFx0XHRtb2RlbEluZGV4ID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmluZGV4T2YoXy5sYXN0KHRoaXMudmlld3MpLm1vZGVsKTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHdoaWNoIG1vZGVsIHRvIHVzZVxuXHRcdFx0aWYobW9kZWxJbmRleCA9PSBfLnNpemUodGhpcy5wZW9wbGVDb2xsZWN0aW9uKSAtIDEpIHtcblx0XHRcdFx0bW9kZWwgPSAgdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmZpcnN0KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb2RlbCA9IHRoaXMucGVvcGxlQ29sbGVjdGlvbi5hdChtb2RlbEluZGV4ICsgMSk7XG5cdFx0XHR9XG5cblx0XHRcdHZpZXcgPSBuZXcgUGVyc29uVmlldyh7bW9kZWw6IG1vZGVsfSk7XG5cdFx0XHR0aGlzLnZpZXdzLnB1c2godmlldyk7XG5cdFx0XHR0aGlzLiRlbC5hcHBlbmQodmlldy5lbCk7XG5cdFx0fVxuXHR9LFxuXHRwYW5IYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0aWYoZS5vcmlnaW5hbEV2ZW50Lmdlc3R1cmUuaXNGaW5hbCkge1xuXHRcdFx0Ly8gRmlyZSBldmVudCB0byBwYXJlbnQgaWYgc3dpcGUsIG90aGVyd2lzZSBzbmFwIGJhY2tcblx0XHRcdGlmKFxuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVggPCAtc2VsZi5zd2lwZVRocmVzaG9sZCB8fFxuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVggPiBzZWxmLnN3aXBlVGhyZXNob2xkKVxuXHRcdFx0e1xuXHRcdFx0XHRzZWxmLiRlbC50cmlnZ2VyKFwic3dpcGVkXCIsIHtldmVudDogZX0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC4xLCB7bGVmdDogc2VsZi5wb3NpdGlvbkxlZnR9KTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gRmluZCBuZXcgcG9zaXRpb24gYW5kIG1vdmVcblx0XHRcdHZhciBsZWZ0ID0gc2VsZi5wb3NpdGlvbkxlZnQgKyBlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVg7XG5cdFx0XHRzZWxmLiRlbC5jc3Moe2xlZnQ6IGxlZnR9KTtcblx0XHR9XG5cdH0sXG5cdHN3aXBlSGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgY3VycmVudEluZGV4ID0gc2VsZi52aWV3cy5pbmRleE9mKHNlbGYuc2VsZWN0ZWRQZXJzb24pO1xuXHRcdFxuXHRcdC8vIERldGVybWluZSBzd2lwZSBkaXJlY3Rpb25cblx0XHRpZihlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVggPCAwKSB7XG5cdFx0XHQvLyBTZXQgdG8gZm9yd2FyZCBvbmVcblx0XHRcdHNlbGYuc2V0U2VsZWN0ZWRQZXJzb24oc2VsZi52aWV3c1tjdXJyZW50SW5kZXggKyAxXSk7XG5cdFx0XHRcblx0XHRcdC8vIEFuaW1hdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC4xLCB7XG5cdFx0XHRcdGxlZnQ6IHNlbGYucG9zaXRpb25MZWZ0IC0gNjQwLFxuXHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBSZW1vdmUgYWxsIGFzcGVjdHMgb2YgZWRnZSB2aWV3XG5cdFx0XHRcdFx0Xy5maXJzdChzZWxmLnZpZXdzKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRzZWxmLnZpZXdzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRkIGluIG5ld1xuXHRcdFx0XHRcdHNlbGYucGFkKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gUmVzZXQgbWFyZ2luc1xuXHRcdFx0XHRcdHNlbGYuJChcIj4gbGk6Zmlyc3QtY2hpbGRcIikuY3NzKHttYXJnaW5MZWZ0OiAwfSk7XG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpudGgtY2hpbGQobiArIDIpXCIpLmNzcyh7bWFyZ2luTGVmdDogXCI0MHB4XCJ9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGp1c3QgcG9zaXRpb25pbmdcblx0XHRcdFx0XHRzZWxmLiRlbC5jc3Moe2xlZnQ6IHNlbGYucG9zaXRpb25MZWZ0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBTZXQgdG8gYmFjayBvbmVcblx0XHRcdHNlbGYuc2V0U2VsZWN0ZWRQZXJzb24oc2VsZi52aWV3c1tjdXJyZW50SW5kZXggLSAxXSk7XG5cdFx0XHRcblx0XHRcdC8vIEFuaW1hdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC4xLCB7XG5cdFx0XHRcdGxlZnQ6IHNlbGYucG9zaXRpb25MZWZ0ICsgNjQwLFxuXHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgYXNwZWN0cyBvZiBlZGdlIHZpZXdcblx0XHRcdFx0XHRfLmxhc3Qoc2VsZi52aWV3cykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0c2VsZi52aWV3cy5wb3AoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGQgaW4gbmV3XG5cdFx0XHRcdFx0c2VsZi5wYWQoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBSZXNldCBtYXJnaW5zXG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpmaXJzdC1jaGlsZFwiKS5jc3Moe21hcmdpbkxlZnQ6IDB9KTtcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOm50aC1jaGlsZChuICsgMilcIikuY3NzKHttYXJnaW5MZWZ0OiBcIjQwcHhcIn0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkanVzdCBwb3NpdGlvbmluZ1xuXHRcdFx0XHRcdHNlbGYuJGVsLmNzcyh7bGVmdDogc2VsZi5wb3NpdGlvbkxlZnR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3Blb3BsZS9wZXJzb24uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLnRlbXBsYXRlID0gXy50ZW1wbGF0ZShkYXRhKTtcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uL21vZGFsLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5tb2RhbFRlbXBsYXRlID0gXy50ZW1wbGF0ZShkYXRhKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrIC5waWN0dXJlXCI6IFwicG9wdXBIYW5kbGVyXCIsXG5cdFx0XCJjbGljayAuc291cmNlcyBsaVwiOiBcInBvcHVwSGFuZGxlclwiLFxuXHRcdFwiY2xpY2sgLnBvcHVwIGJ1dHRvblwiOiBcInJlcG9ydFRvZ2dsZXJcIixcblx0XHRcImNsaWNrIC5tb2RhbCBidXR0b25cIjogXCJyZXBvcnRUb2dnbGVyXCJcblx0fSxcblx0cmVwb3J0VG9nZ2xlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyICRtb2RhbCA9IHRoaXMuJGVsLmZpbmQoXCIubW9kYWxcIik7XG5cdFx0XG5cdFx0Ly8gQ3JlYXRlIG1vZGFsIGlmIG5lZWRlZCwgb3RoZXJ3aXNlIHJlbW92ZVxuXHRcdGlmKCEkbW9kYWwubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5tb2RhbFRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRcdCRtb2RhbCA9IHRoaXMuJChcIi5tb2RhbFwiKTtcblx0XHRcdFxuXHRcdFx0JG1vZGFsLndhaXRGb3JJbWFnZXMoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCRtb2RhbC5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0XHRUd2Vlbk1heC5mcm9tVG8oJG1vZGFsLmZpbmQoXCI+IGRpdlwiKSwgLjUsXG5cdFx0XHRcdFx0e29wYWNpdHk6IDAsIHZpc2liaWxpdHk6IFwidmlzaWJsZVwifSxcblx0XHRcdFx0XHR7b3BhY2l0eTogMSwgb25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkbW9kYWwucmVtb3ZlQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0XHRcdH19XG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gUHJldmVudCBiYWNrZ3JvdW5kIGNsaWNrc1xuXHRcdFx0JG1vZGFsLm9uKFwidG91Y2hzdGFydCBtb3VzZWRvd24gY2xpY2tcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRpZighJChlLnRhcmdldCkuaXMoJG1vZGFsLmZpbmQoXCJidXR0b25cIikpKSB7XG5cdFx0XHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFR3ZWVuTWF4LnRvKCRtb2RhbCwgLjUsIHtvcGFjaXR5OiAwLCBvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JG1vZGFsLnJlbW92ZSgpO1xuXHRcdFx0fX0pO1xuXHRcdH1cblx0fSxcblx0b2J0YWluRGF0YTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJChcImxpLmF2YWlsYWJsZVwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICR0aGlzID0gJCh0aGlzKTtcblx0XHRcdFxuXHRcdFx0JHRoaXMucmVtb3ZlQ2xhc3MoXCJzcGluT3V0XCIpLmFkZENsYXNzKFwic3Bpbm5lclwiKTtcblxuXHRcdFx0Ly8gRGF0YSBvYnRhaW5lZCBhZnRlciByYW5kb20gdGltZVxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JHRoaXMucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdH0sIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAgKyAxMDAwKSk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gU2lnbmFsIHRvIHBhcmVudCBkYXRhIGlzIHJlYWR5XG5cdFx0c2VsZi4kZWwudHJpZ2dlcihcImRhdGFTb3VyY2VkXCIpO1xuXHR9LFxuXHRwb3B1cEhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHQvLyBDaGVjayBpZiBjdXJyZW50IHBlcnNvbiBiZWluZyBjbGlja2VkIG9uXG5cdFx0aWYodGhpcy5zZWxlY3RlZCkge1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHZhciAkbmV3UG9wdXAgPSAkKGUudGFyZ2V0KS5zaWJsaW5ncyhcIi5wb3B1cFwiKTtcblx0XHRcdFxuXHRcdFx0aWYoIXNlbGYuJHBvcHVwKSB7XG5cdFx0XHRcdHRoaXMucG9wdXBTaG93ZXIoJG5ld1BvcHVwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBpc1NhbWVBc0N1cnJlbnQgPSBzZWxmLiRwb3B1cC5pcygkbmV3UG9wdXApO1xuXG5cdFx0XHRcdC8vIEhpZGUgY3VycmVudCBwb3B1cFxuXHRcdFx0XHR0aGlzLnBvcHVwUmVtb3ZlcihzZWxmLiRwb3B1cCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZighaXNTYW1lQXNDdXJyZW50KSB7XG5cdFx0XHRcdFx0Ly8gU2hvdyBuZXdcblx0XHRcdFx0XHRzZWxmLiRwb3B1cCA9ICRuZXdQb3B1cDtcblx0XHRcdFx0XHR0aGlzLnBvcHVwU2hvd2VyKHNlbGYuJHBvcHVwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0cG9wdXBSZW1vdmVyOiBmdW5jdGlvbigkcCkge1xuXHRcdHRoaXMuJHBvcHVwID0gbnVsbDtcblx0XHRcblx0XHQvLyBGYWRlIGFuZCBoaWRlIHBvcHVwXG5cdFx0VHdlZW5NYXgudG8oJHAsIC41LCB7XG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0ZGlzcGxheTogXCJub25lXCIsXG5cdFx0XHRvdmVyd3JpdGU6IFwiYWxsXCJcblx0XHR9KTtcblxuXHRcdC8vIFR1cm4gb2ZmIGxpc3RlbmVyXG5cdFx0JChcImJvZHlcIikub2ZmKFwidG91Y2hlbmQgY2xpY2tcIik7XG5cdH0sXG5cdHBvcHVwU2hvd2VyOiBmdW5jdGlvbigkcCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLiRwb3B1cCA9ICRwO1xuXHRcdFxuXHRcdC8vIFNob3cgYW5kIGZhZGUgaW5cblx0XHRUd2Vlbk1heC5mcm9tVG8oJHAsIC41LFxuXHRcdFx0e29wYWNpdHk6IDAsIGRpc3BsYXk6IFwiYmxvY2tcIn0sXG5cdFx0XHR7b3BhY2l0eTogMSwgb3ZlcndyaXRlOiBcImFsbFwifVxuXHRcdCk7XG5cdFx0XG5cdFx0Ly8gTGlzdGVuIGZvciBhbnl0aGluZyB0byB0dXJuIG9mZlxuXHRcdCQoXCJib2R5XCIpLm9uZShcInRvdWNoZW5kIGNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5wb3B1cFJlbW92ZXIoJHApO1xuXHRcdH0pO1xuXHR9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBRdWVzdGlvbk1vZGVsID0gcmVxdWlyZShcIi4uLy4uL21vZGVscy9xdWVzdGlvblwiKTtcbnZhciBRdWVzdGlvbnNDb2xsZWN0aW9uID0gcmVxdWlyZShcIi4uLy4uL2NvbGxlY3Rpb25zL3F1ZXN0aW9uc1wiKTtcbnZhciBRdWVzdGlvblZpZXcgPSByZXF1aXJlKFwiLi9xdWVzdGlvbnMvcXVlc3Rpb25cIik7XG52YXIgQ3VzdG9tUXVlc3Rpb25WaWV3ID0gcmVxdWlyZShcIi4vcXVlc3Rpb25zL2N1c3RvbVF1ZXN0aW9uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInF1ZXN0aW9uc1wiLFxuXHR0YWdOYW1lOiBcInVsXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldEpTT04oXCIvanMvanNvbi9xdWVzdGlvbnMuanNcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5xdWVzdGlvbnNDb2xsZWN0aW9uID0gbmV3IFF1ZXN0aW9uc0NvbGxlY3Rpb24oZGF0YSk7XG5cdFx0XHRzZWxmLnZpZXdzID0gW107XG5cblx0XHRcdC8vIENyZWF0ZSBxdWVzdGlvbiB2aWV3c1xuXHRcdFx0c2VsZi5xdWVzdGlvbnNDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwpIHtcblx0XHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBRdWVzdGlvblZpZXcoe21vZGVsOiBtb2RlbH0pKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHQvLyBBZGQgaW4gY3VzdG9tIHF1ZXN0aW9uXG5cdFx0XHRzZWxmLnZpZXdzLnB1c2gobmV3IEN1c3RvbVF1ZXN0aW9uVmlldyh7XG5cdFx0XHRcdG1vZGVsOiBuZXcgUXVlc3Rpb25Nb2RlbCgpXG5cdFx0XHR9KSk7XG5cdFx0XHRcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJGVsLmVtcHR5KCk7XG5cdFx0XG5cdFx0dmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblx0XHRcblx0XHQvLyBSZW5kZXIgZWFjaCBxdWVzdGlvbiBhbmQgYWRkIGF0IGVuZFxuXHRcdF8uZWFjaChzZWxmLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQodmlldy5lbCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0c2VsZi4kZWwuYXBwZW5kKGNvbnRhaW5lcik7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwicXVlc3Rpb25DbGlja2VkXCI6IFwicXVlc3Rpb25DbGlja2VkXCIsXG5cdFx0XCJyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb25cIjogXCJyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb25cIlxuXHR9LFxuXHRxdWVzdGlvbkNsaWNrZWQ6IGZ1bmN0aW9uKGV2ZW50LCBvYmplY3RzKSB7XG5cdFx0aWYoIXRoaXMuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0Ly8gU2F2ZSB2aWV3IGFuZCBoaWRlIG90aGVyc1xuXHRcdFx0dGhpcy5zZWxlY3RlZFF1ZXN0aW9uID0gb2JqZWN0cy5zZWxlY3RlZFF1ZXN0aW9uO1xuXHRcdFx0dGhpcy5oaWRlQWxsRXhjZXB0U2VsZWN0ZWRRdWVzdGlvbigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicmV2ZWFsQWxsUXVlc3Rpb25zXCIpO1xuXHRcdH1cblx0fSxcblx0aGlkZUFsbEV4Y2VwdFNlbGVjdGVkUXVlc3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBCdWJibGUgdXAgdGhlIGV2ZW50XG5cdFx0c2VsZi4kZWwudHJpZ2dlcihcImhpZEFsbEV4Y2VwdFNlbGVjdGVkUXVlc3Rpb25cIik7XG5cdFx0XG5cdFx0Xy5lYWNoKHRoaXMudmlld3MsIGZ1bmN0aW9uKHZpZXcpIHtcblx0XHRcdGlmKHZpZXcgPT0gc2VsZi5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHRcdC8vIFNhdmUgY3VycmVudCBvZmZzZXRcblx0XHRcdFx0dmFyIGN1cnJlbnRPZmZzZXQgPSB2aWV3LiRlbC5vZmZzZXQoKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZpZXcuJGVsLmNzcyhcInBvc2l0aW9uXCIsIFwiYWJzb2x1dGVcIik7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBTYXZlIGRlc2lyZWQgb2Zmc2V0XG5cdFx0XHRcdHZhciBkZXNpcmVkT2Zmc2V0ID0gdmlldy4kZWwub2Zmc2V0KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2aWV3LiRlbC5jc3MoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gUmVzZXQgcG9zaXRpb25pbmcgYW5kIG1vdmUgcXVlc3Rpb25cblx0XHRcdFx0VHdlZW5NYXgudG8odmlldy4kZWwsIC41LCB7XG5cdFx0XHRcdFx0dG9wOiBkZXNpcmVkT2Zmc2V0LnRvcCAtIGN1cnJlbnRPZmZzZXQudG9wXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gSGlkZSBhbGwgb3RoZXIgcXVlc3Rpb25zXG5cdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge2F1dG9BbHBoYTogMH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRyZXZlYWxBbGxRdWVzdGlvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRpZihzZWxmLnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdC8vIEJ1YmJsZSB1cCB0aGUgZXZlbnRcblx0XHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJyZXZlYWxlZEFsbFF1ZXN0aW9uc1wiKTtcblx0XHRcdFxuXHRcdFx0Xy5lYWNoKHRoaXMudmlld3MsIGZ1bmN0aW9uKHZpZXcpIHtcblx0XHRcdFx0Ly8gUmVzZXQgY3VzdG9tIHF1ZXN0aW9uXG5cdFx0XHRcdGlmKHZpZXcgaW5zdGFuY2VvZiBDdXN0b21RdWVzdGlvblZpZXcpIHtcblx0XHRcdFx0XHR2aWV3LnN0YWxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmKHZpZXcgPT0gc2VsZi5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHRcdFx0c2VsZi5zZWxlY3RlZFF1ZXN0aW9uID0gbnVsbDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBbmltYXRlIGJhY2sgdG8gcG9zaXRpb24sIGlmIG5lZWRlZFxuXHRcdFx0XHRcdGlmKCF2aWV3LiRlbC5pcyhcIjpmaXJzdC1jaGlsZFwiKSkge1xuXHRcdFx0XHRcdFx0VHdlZW5NYXgudG8odmlldy4kZWwsIC41LCB7XG5cdFx0XHRcdFx0XHRcdHRvcDogMCxcblx0XHRcdFx0XHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYodmlldyBpbnN0YW5jZW9mIEN1c3RvbVF1ZXN0aW9uVmlldykge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5yZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb24oKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBSZXZlYWwgb3RoZXIgcXVlc3Rpb25zXG5cdFx0XHRcdFx0VHdlZW5NYXgudG8odmlldy4kZWwsIC41LCB7YXV0b0FscGhhOiAxfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0cmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gQnJpbmcgY3VycmVudCBvdXQgb2YgcG9zaXRpb25cblx0XHR2YXIgY3VycmVudCA9IHNlbGYudmlld3Muc2xpY2UoLTEpWzBdO1xuXHRcdGN1cnJlbnQuJGVsLmNzcyh7XG5cdFx0XHRwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuXHRcdFx0dG9wOiBjdXJyZW50LiRlbC5wb3NpdGlvbigpLnRvcCxcblx0XHRcdGxlZnQ6IGN1cnJlbnQuJGVsLnBvc2l0aW9uKCkubGVmdCxcblx0XHRcdHdpZHRoOiBjdXJyZW50LiRlbC5vdXRlcldpZHRoKCksXG5cdFx0XHR6SW5kZXg6IDEwXG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gQWRkIGluIG5ldyBvbmVcblx0XHR2YXIgdmlldyA9IG5ldyBDdXN0b21RdWVzdGlvblZpZXcoe21vZGVsOiBuZXcgUXVlc3Rpb25Nb2RlbCgpfSk7XG5cdFx0c2VsZi4kZWwuYXBwZW5kKHZpZXcuZWwpO1xuXHRcdFxuXHRcdC8vIFJlbW92ZSBvbGQgd2hlbiBuZXcgcHJlc2VudFxuXHRcdHZhciBpID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZihqUXVlcnkuY29udGFpbnMoc2VsZi5lbCwgdmlldy5lbCkpIHtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGN1cnJlbnQucmVtb3ZlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBDbGVhbnVwIGFycmF5XG5cdFx0XHRcdHNlbGYudmlld3MucG9wKCk7XG5cdFx0XHRcdHNlbGYudmlld3MucHVzaCh2aWV3KTtcblx0XHRcdH1cblx0XHR9LCAxKTtcblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0dGFnTmFtZTogXCJsaVwiLFxuXHRjbGFzc05hbWU6IFwiY3VzdG9tXCIsXG5cdHN0YXR1czogXCJzdGFsZVwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9jdXN0b20uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoZGF0YSk7XG5cdFx0XHRzZWxmLiRpbnB1dCA9IHNlbGYuJChcImlucHV0XCIpO1xuXHRcdFx0c2VsZi4kYnV0dG9uID0gc2VsZi4kKFwiYnV0dG9uXCIpO1xuXHRcdFx0c2VsZi4kYnV0dG9uLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrXCI6IFwicm91dGVyXCIsXG5cdFx0XCJrZXl1cCBpbnB1dFwiOiBcImtleUhhbmRsZXJcIlxuXHR9LFxuXHRyb3V0ZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHRpZigkKGUudGFyZ2V0KS5pcyh0aGlzLiRidXR0b24pICYmIHRoaXMuJGlucHV0LnZhbCgpICE9PSBcIlwiKSB7XG5cdFx0XHR0aGlzLnNlbGVjdGVkKCk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuc3RhdHVzID09IFwic2VsZWN0ZWRcIikge1xuXHRcdFx0dGhpcy4kZWwudHJpZ2dlcihcInF1ZXN0aW9uQ2xpY2tlZFwiLCB7c2VsZWN0ZWRRdWVzdGlvbjogdGhpc30pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmVkaXRpbmcoKTtcblx0XHR9XG5cdH0sXG5cdGtleUhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHRpZihlLmtleUNvZGUgPT0gMTMpe1xuXHRcdFx0dGhpcy4kYnV0dG9uLmNsaWNrKCk7XG5cdFx0fVxuXHR9LFxuXHRlZGl0aW5nOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5zdGF0dXMgPSBcImVkaXRpbmdcIjtcblx0XHRcblx0XHQvLyBBbGxvdyBlZGl0aW5nXG5cdFx0c2VsZi4kaW5wdXQucHJvcChcInJlYWRvbmx5XCIsIGZhbHNlKS5mb2N1cygpO1xuXHRcdFxuXHRcdC8vIEFuaW1hdGUgaWYgbm90IGFscmVhZHkgZG9uZVxuXHRcdGlmKCFzZWxmLiRlbC5oYXNDbGFzcyhcImZvY3VzZWRcIikpIHtcblx0XHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGVsLCAuNSwge2NsYXNzTmFtZTogXCIrPWZvY3VzZWRcIn0pO1xuXHRcdFx0XG5cdFx0XHRUd2Vlbk1heC5mcm9tVG8oc2VsZi4kYnV0dG9uLCAuNSxcblx0XHRcdFx0e29wYWNpdHk6IDAsIGRpc3BsYXk6IFwiYmxvY2tcIn0sXG5cdFx0XHRcdHtvcGFjaXR5OiAxfVxuXHRcdFx0KTtcblx0XHR9XG5cdH0sXG5cdHNlbGVjdGVkOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5zdGF0dXMgPSBcInNlbGVjdGVkXCI7XG5cdFx0XG5cdFx0Ly8gU2F2ZSBkYXRhIHRvIG1vb2RlbFxuXHRcdHNlbGYubW9kZWwuc2V0KHtcInRleHRcIjogc2VsZi4kaW5wdXQudmFsKCl9KTtcblx0XHRcblx0XHQvLyBEaXNhYmxlIGVkaXRpbmcgYW5kIHNocmlua1xuXHRcdHNlbGYuJGlucHV0LmJsdXIoKS5wcm9wKFwicmVhZG9ubHlcIiwgdHJ1ZSk7XG5cdFx0c2VsZi5zaHJpbmsoKTtcblxuXHRcdC8vIEZpcmUgZXZlbnQgdG8gcGFyZW50XG5cdFx0c2VsZi4kZWwudHJpZ2dlcihcInF1ZXN0aW9uQ2xpY2tlZFwiLCB7c2VsZWN0ZWRRdWVzdGlvbjogc2VsZn0pO1xuXHR9LFxuXHRzdGFsZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kaW5wdXQudmFsKFwiXCIpO1xuXHRcdFxuXHRcdGlmKHRoaXMuc3RhdHVzID09IFwiZWRpdGluZ1wiKSB7XG5cdFx0XHR0aGlzLnNocmluaygpO1xuXHRcdH1cblx0XHRcblx0XHR0aGlzLnN0YXR1cyA9IFwic3RhbGVcIjtcblx0fSxcblx0c2hyaW5rOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC41LCB7Y2xhc3NOYW1lOiBcIi09Zm9jdXNlZFwifSk7XG5cdFx0XG5cdFx0VHdlZW5NYXgudG8oc2VsZi4kYnV0dG9uLCAuNSwge1xuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdGRpc3BsYXk6IFwibm9uZVwiXG5cdFx0fSk7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdHRhZ05hbWU6IFwibGlcIixcblx0dGVtcGxhdGU6IF8udGVtcGxhdGUoXCI8JT0gdGV4dCAlPlwiKSxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrXCI6IFwiY2xpY2tlZFwiXG5cdH0sXG5cdGNsaWNrZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGVsLnRyaWdnZXIoXCJxdWVzdGlvbkNsaWNrZWRcIiwge3NlbGVjdGVkUXVlc3Rpb246IHRoaXN9KTtcblx0fVxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgY29uZmlnID0gcmVxdWlyZShcIi4uLy4uLy4uL2NvbmZpZ1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJyZXNwb25zZVwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gTG9hZCBkYXRhIGFuZCBzdGFydFxuXHRcdHZhciBhMSA9ICQuZ2V0SlNPTihcIi9qcy9qc29uL2dlbmVzLmpzXCIpO1xuXHRcdHZhciBhMiA9ICQuZ2V0SlNPTihcIi9qcy9qc29uL2Fuc3dlcnMuanNcIik7XG5cdFx0dmFyIGEzID0gJC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9yZXNwb25zZS9nZW5lcy5odG1sXCIpO1xuXHRcdFxuXHRcdCQud2hlbihhMSwgYTIsIGEzKS5kb25lKGZ1bmN0aW9uKHIxLCByMiwgcjMpIHtcblx0XHRcdHNlbGYuZ2VuZXMgPSByMVswXTtcblx0XHRcdHNlbGYuYW5zd2VycyA9IHIyWzBdO1xuXHRcdFx0c2VsZi5nZW5lc1RlbXBsYXRlID0gXy50ZW1wbGF0ZShyM1swXSk7XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0c2VsZi5zZXRUb0xvYWRpbmcoKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNldFRvTG9hZGluZygpO1xuXHRcdHRoaXMuJGVsLmhpZGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayBmb290ZXIgZGl2Om50aC1sYXN0LWNoaWxkKC1uICsgMilcIjogXCJtYXJrUmF0ZWRcIlxuXHR9LFxuXHRtYXJrUmF0ZWQ6IGZ1bmN0aW9uKGUpIHtcblx0XHQkKGUuY3VycmVudFRhcmdldCkucGFyZW50KCkuZmluZChcImRpdlwiKS5yZW1vdmVDbGFzcyhcImNsaWNrZWRcIik7XG5cdFx0JChlLmN1cnJlbnRUYXJnZXQpLmFkZENsYXNzKFwiY2xpY2tlZFwiKTtcblx0fSxcblx0c2V0VG9Mb2FkaW5nOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbFxuXHRcdFx0LmVtcHR5KClcblx0XHRcdC5hZGRDbGFzcyhcInNwaW5uZXJcIilcblx0XHRcdC5yZW1vdmVDbGFzcyhcInNwaW5PdXRcIilcblx0XHRcdC5yZW1vdmVDbGFzcyhcImhhcy1tYXBcIilcblx0XHRcdC5yZW1vdmVDbGFzcyhcImhhcy1nZW5lc1wiKVxuXHRcdDtcblx0fSxcblx0cHJlcGFyZTogZnVuY3Rpb24oYW5zd2VyKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gQWRqdXN0IHNpemUgb2YgYW5zd2VyIGFyZWEgYmFzZWQgb24gcXVlc3Rpb24gc2l6ZVxuXHRcdHZhciB0b3AgPSBhbnN3ZXIuJGVsLnBhcmVudCgpLm9mZnNldCgpLnRvcCArIDU4ICsgMTA7XG5cdFx0dmFyIGhlaWdodCA9IDUyMCAtIDU4O1xuXHRcdFxuXHRcdHNlbGYuJGVsLmNzcyh7XG5cdFx0XHRkaXNwbGF5OiBcImJsb2NrXCIsXG5cdFx0XHR0b3A6IHRvcCxcblx0XHRcdGhlaWdodDogaGVpZ2h0XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gRmFkZSBpbiByZXNwb25zZVxuXHRcdFR3ZWVuTWF4LmZyb21UbyhzZWxmLiRlbCwgLjUsIHtvcGFjaXR5OiAwfSwge29wYWNpdHk6IDEsIG92ZXJ3cml0ZTogXCJhbGxcIn0pO1xuXHR9LFxuXHRnZXQ6IGZ1bmN0aW9uKHBlcnNvbiwgcXVlc3Rpb24pIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIHJlcXVlc3REYXRhO1xuXHRcdHNlbGYuYW5zd2VyID0ge307XG5cdFx0c2VsZi5hbnN3ZXIuY2lkID0gcGVyc29uLmNpZDtcblx0XHRzZWxmLmFuc3dlci5wZXJzb25JRCA9IHBlcnNvbi5tb2RlbC5nZXQoXCJpZFwiKTtcblx0XHRzZWxmLmFuc3dlci5xdWVzdGlvbklEID0gcXVlc3Rpb24ubW9kZWwuZ2V0KFwiaWRcIik7XG5cdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IFwiXCI7XG5cdFx0XG5cdFx0dmFyIG51bWJlcldpdGhDb21tYXMgPSBmdW5jdGlvbih4KSB7XG5cdFx0XHRyZXR1cm4geC50b1N0cmluZygpLnJlcGxhY2UoL1xcQig/PShcXGR7M30pKyg/IVxcZCkpL2csIFwiLFwiKTtcblx0XHR9O1xuXHRcdFxuXHRcdC8vIEdlbmUgbGlzdFxuXHRcdGlmKFsxLCAyLCAzXS5pbmRleE9mKHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQpID4gLTEpIHtcblx0XHRcdHNlbGYuYW5zd2VyLmdlbmVzID0gc2VsZi5nZW5lc1RlbXBsYXRlKHNlbGYuZ2VuZXNbcXVlc3Rpb24ubW9kZWwuZ2V0KFwiZ2VuZXNcIildKTtcblx0XHR9XG5cdFx0XG5cdFx0Ly8gR2V0IGFuc3dlciBhbmQgbWFwLCBkZXBlbmRpbmcgb24gc3RvcmVkIHJlc3BvbnNlXG5cdFx0aWYoc2VsZi5hbnN3ZXIucXVlc3Rpb25JRCA8IDQpIHtcblx0XHRcdHZhciBodG1sID0gXCJcIjtcblx0XHRcdFxuXHRcdFx0c3dpdGNoKHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQpIHtcblx0XHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRcdC8vIEdldCBmaXRuZXNzIGRhdGEgYWJvdXQgcGVyc29uXG5cdFx0XHRcdFx0cmVxdWVzdERhdGEgPSB7XG5cdFx0XHRcdFx0XHRcInVzZXJJZFwiOiBzZWxmLmFuc3dlci5wZXJzb25JRCxcblx0XHRcdFx0XHRcdFwiZml0bmVzc1wiOiBcInRydWVcIlxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBhbnN3ZXJcblx0XHRcdFx0XHRzZWxmLmpxeGhyID0gJC5hamF4KHtcblx0XHRcdFx0XHRcdHVybDogY29uZmlnLnVybCxcblx0XHRcdFx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0XHRcdFx0ZGF0YVR5cGU6IFwianNvbnBcIixcblx0XHRcdFx0XHRcdHRpbWVvdXQ6IDMwMDBcblx0XHRcdFx0XHR9KS5hbHdheXMoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCBqcXhocikge1xuXHRcdFx0XHRcdFx0aWYoc3RhdHVzID09IFwic3VjY2Vzc1wiICYmIGRhdGEuZml0bmVzcy5jb2RlID09PSAwKSB7XG5cdFx0XHRcdFx0XHRcdHZhciByYW5kb21OdW1iZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA2KTtcblx0XHRcdFx0XHRcdFx0dmFyIHJhbmRvbVJlc3BvbnNlO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0Ly8gR2VuZXJhdGUgcmFuZG9tIHJlc3BvbnNlXG5cdFx0XHRcdFx0XHRcdGlmKHJhbmRvbU51bWJlciAhPSA0KSB7XG5cdFx0XHRcdFx0XHRcdFx0cmFuZG9tUmVzcG9uc2UgPSBzZWxmLmFuc3dlcnNbMF0ucmVzcG9uc2VzW3JhbmRvbU51bWJlcl07XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cmFuZG9tUmVzcG9uc2UgPVxuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tyYW5kb21OdW1iZXJdWzBdICtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5sb2NhdGlvbnNbc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXS50aXRsZSArXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucmVzcG9uc2VzW3JhbmRvbU51bWJlcl1bMV0gK1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLmxvY2F0aW9uc1tzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdLmFkZHJlc3MgK1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tyYW5kb21OdW1iZXJdWzJdXG5cdFx0XHRcdFx0XHRcdFx0O1xuXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdC8vIEFzc2lnbiBzaW5nbGUgbG9jYXRpb25cblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnMgPSBbc2VsZi5hbnN3ZXJzWzBdLmxvY2F0aW9uc1tzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0aHRtbCA9XG5cdFx0XHRcdFx0XHRcdFx0cGVyc29uLm1vZGVsLmdldChcIm5hbWVcIikgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1swXSArXG5cdFx0XHRcdFx0XHRcdFx0XCI8c3BhbiBjbGFzcz0naGlnaGxpZ2h0Jz5cIiArIG51bWJlcldpdGhDb21tYXMoZGF0YS5maXRuZXNzLnN1bW1hcnkuY2Fsb3JpZXNPdXQpICsgXCI8L3NwYW4+XCIgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1sxXSArXG5cdFx0XHRcdFx0XHRcdFx0cGVyc29uLm1vZGVsLmdldChcImdvYWxzXCIpICtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucGFydHNbMl0gK1xuXHRcdFx0XHRcdFx0XHRcdHJhbmRvbVJlc3BvbnNlXG5cdFx0XHRcdFx0XHRcdDtcblx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IGh0bWw7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gXCI8cD5Tb3JyeSwgcGxlYXNlIHRyeSBhZ2Fpbi48L3A+XCI7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7fSwgMjUwMCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gc2VsZi5hbnN3ZXJzWzFdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0uaHRtbDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgbG9jYXRpb25zID0gc2VsZi5hbnN3ZXJzWzFdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0ubG9jYXRpb25zO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkZCBsb2NhdGlvbiBuYW1lcyB0byBodG1sXG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBcIjx1bD5cIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPGxpPlwiICsgbG9jYXRpb25zW2ldLnRpdGxlICsgXCI8L2xpPlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPC91bD5cIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnMgPSBsb2NhdGlvbnM7XG5cdFx0XHRcdFx0c2VsZi50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTt9LCAzMDAwKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBzZWxmLmFuc3dlcnNbMl1bc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXTtcblx0XHRcdFx0XHRzZWxmLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImFuc3dlclJlYWR5XCIpO30sIDMwMDApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBUbyBiZSBzZW50IHRvIEFQSVxuXHRcdFx0cmVxdWVzdERhdGEgPSB7XG5cdFx0XHRcdFwidXNlcklkXCI6IDEsIC8vIHNlbGYuYW5zd2VyLnBlcnNvbklELFxuXHRcdFx0XHRcInF1ZXN0aW9uXCI6IHtcblx0XHRcdFx0XHRcInF1ZXN0aW9uVGV4dFwiOiBxdWVzdGlvbi5tb2RlbC5nZXQoXCJ0ZXh0XCIpXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdC8vIEdldCB0aGUgYW5zd2VyXG5cdFx0XHRzZWxmLmpxeGhyID0gJC5hamF4KHtcblx0XHRcdFx0dXJsOiBjb25maWcudXJsLFxuXHRcdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdFx0ZGF0YVR5cGU6IFwianNvbnBcIixcblx0XHRcdFx0dGltZW91dDogMTUwMDBcblx0XHRcdH0pLmFsd2F5cyhmdW5jdGlvbihkYXRhLCBzdGF0dXMsIGpxeGhyKSB7XG5cdFx0XHRcdGlmKHN0YXR1cyA9PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLmFuc3dlci5hbnN3ZXJzWzBdKSB7XG5cdFx0XHRcdFx0aWYoc2VsZi5hbnN3ZXIucXVlc3Rpb25JRCA9PSA1ICYmIHNlbGYuYW5zd2VyLnBlcnNvbklEID09IDIpIHtcblx0XHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgKz0gc2VsZi5hbnN3ZXJzWzNdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IGRhdGEuYW5zd2VyLmFuc3dlcnNbMF0uZm9ybWF0dGVkVGV4dDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gXCI8cD5Tb3JyeSwgcGxlYXNlIHRyeSBhZ2Fpbi48L3A+XCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHNlbGYudHJpZ2dlcihcImFuc3dlclJlYWR5XCIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXHRzaG93OiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gR3JhY2VmdWxseSBoaWRlIHNwaW5uZXJcblx0XHRzZWxmLiRlbC5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFxuXHRcdGlmKHNlbGYuYW5zd2VyLmh0bWwpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxtYWluPlwiICsgc2VsZi5hbnN3ZXIuaHRtbCArIFwiPC9tYWluPlwiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKFwiPG1haW4+PHA+U29ycnksIHBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuPC9wPjwvbWFpbj5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIFNob3cgZ2VuZXMgaWYgc29cblx0XHRpZihzZWxmLmFuc3dlci5nZW5lcykge1xuXHRcdFx0c2VsZi4kZWwuYWRkQ2xhc3MoXCJoYXMtZ2VuZXNcIik7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoc2VsZi5hbnN3ZXIuZ2VuZXMpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBTaG93IG1hcCBpZiBsb2NhdGlvbnMgYXJlIGF2YWlsYWJsZVxuXHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9ucykge1xuXHRcdFx0c2VsZi4kZWwuYWRkQ2xhc3MoXCJoYXMtbWFwXCIpO1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKFwiPGRpdiBjbGFzcz0nY29udGFpbmVyJz48ZGl2IGlkPSdtYXAnPjwvZGl2PjwvZGl2PlwiKTtcblx0XHRcdFxuXHRcdFx0JC5nZXRKU09OKFwiL2pzL2pzb24vbWFwLmpzXCIsIGZ1bmN0aW9uKHN0eWxlcykge1xuXHRcdFx0XHR2YXIgc3R5bGVkTWFwID0gbmV3IGdvb2dsZS5tYXBzLlN0eWxlZE1hcFR5cGUoXG5cdFx0XHRcdFx0c3R5bGVzLFxuXHRcdFx0XHRcdHtuYW1lOiBcIlN0eWxlZFwifVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0dmFyIG1hcE9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0bWFwVHlwZUNvbnRyb2xPcHRpb25zOiB7XG5cdFx0XHRcdFx0XHRtYXBUeXBlSWRzOiBbZ29vZ2xlLm1hcHMuTWFwVHlwZUlkLlJPQURNQVAsIFwibWFwX3N0eWxlXCJdXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRtYXBUeXBlQ29udHJvbDogZmFsc2UsXG5cdFx0XHRcdFx0c3RyZWV0Vmlld0NvbnRyb2w6IGZhbHNlLFxuXHRcdFx0XHRcdHpvb21Db250cm9sOiB0cnVlLFxuXHRcdFx0XHRcdHpvb21Db250cm9sT3B0aW9uczoge1xuXHRcdFx0XHRcdFx0c3R5bGU6IGdvb2dsZS5tYXBzLlpvb21Db250cm9sU3R5bGUuTEFSR0UsXG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogZ29vZ2xlLm1hcHMuQ29udHJvbFBvc2l0aW9uLkxFRlRfVE9QXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0dmFyIG1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYXBcIiksIG1hcE9wdGlvbnMpO1xuXHRcdFx0XHRcblx0XHRcdFx0bWFwLm1hcFR5cGVzLnNldChcIm1hcF9zdHlsZVwiLCBzdHlsZWRNYXApO1xuXHRcdFx0XHRtYXAuc2V0TWFwVHlwZUlkKFwibWFwX3N0eWxlXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0dmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcblx0XHRcdFx0dmFyIGluZm93aW5kb3cgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdygpOyAgXG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBBZGQgbWFya2Vyc1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuYW5zd2VyLmxvY2F0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdC8vIEZvcm1hdCB0aXRsZVxuXHRcdFx0XHRcdHZhciBjb250ZW50ID0gXCJcIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZihzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0udGl0bGUpIHtcblx0XHRcdFx0XHRcdGNvbnRlbnQgPSBcIjxkaXYgY2xhc3M9J3RpdGxlJz5cIiArIHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS50aXRsZSArIFwiPC9kaXY+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5kZXNjcmlwdGlvbikge1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSBcIjxkaXYgY2xhc3M9J2Rlc2NyaXB0aW9uJz5cIiArIHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5kZXNjcmlwdGlvbiArIFwiPC9kaXY+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uY29vcmRpbmF0ZXMubGF0dGl0dWRlLFxuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uY29vcmRpbmF0ZXMubG9uZ2l0dWRlXG5cdFx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFx0bWFwOiBtYXAsXG5cdFx0XHRcdFx0XHR0aXRsZTogY29udGVudCxcblx0XHRcdFx0XHRcdHZpc2libGU6IHRydWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvL2V4dGVuZCB0aGUgYm91bmRzIHRvIGluY2x1ZGUgZWFjaCBtYXJrZXIncyBwb3NpdGlvblxuXHRcdFx0XHRcdGJvdW5kcy5leHRlbmQobWFya2VyLnBvc2l0aW9uKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXJrZXIsIFwiY2xpY2tcIiwgKGZ1bmN0aW9uKG1hcmtlciwgaSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRpbmZvd2luZG93LnNldENvbnRlbnQobWFya2VyLnRpdGxlKTtcblx0XHRcdFx0XHRcdFx0aW5mb3dpbmRvdy5vcGVuKG1hcCwgbWFya2VyKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSkobWFya2VyLCBpKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdG1hcC5maXRCb3VuZHMoYm91bmRzKTtcblxuXHRcdFx0XHQvLyBab29tIG91dCBmb3Igc2luZ2xlIGRlc3RpbmF0aW9uIG1hcHNcblx0XHRcdFx0aWYoc2VsZi5hbnN3ZXIubG9jYXRpb25zLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXAsIFwiaWRsZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRtYXAuc2V0Wm9vbSgxMSk7XG5cdFx0XHRcdFx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIEFkZCBpbiB0aHVtYnMgdXAgYW5kIGRvd25cblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3Jlc3BvbnNlL2Zvb3Rlci5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHR9KTtcblx0fSxcblx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdFR3ZWVuTWF4LmZyb21UbyhzZWxmLiRlbCwgLjUsIHtvcGFjaXR5OiAxfSwge1xuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdGRpc3BsYXk6IFwibm9uZVwiLFxuXHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuc2V0VG9Mb2FkaW5nKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJ2aWV3IGhlbGxvXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFxuXHRcdC8vIEJ1dHRvbiB0byBlbmRcblx0XHRzZWxmLiRlbC5vbmUoXCJjbGlja1wiLCBcImJ1dHRvblwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHNlbGYudHJpZ2dlcihcImVuZFwiKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLiRlbC5sb2FkKFwiL3RlbXBsYXRlcy9oZWxsby5odG1sXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRvIHBhcmVudFxuXHRcdFx0c2VsZi50cmlnZ2VyKFwibG9hZGVkXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwidmlldyBpbnRyb1wiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImVuZFwiKTt9LCA3MDAwKTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLiRlbC5sb2FkKFwiL3RlbXBsYXRlcy9pbnRyby5odG1sXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRvIHBhcmVudFxuXHRcdFx0c2VsZi50cmlnZ2VyKFwibG9hZGVkXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHQvL3VybDogXCJodHRwOi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL2Fza1wiLFxuXHR1cmw6IFwiaHR0cDovL2F0bGRldi5wYXRod2F5LmNvbTozMDAwL2Fza1wiXG5cdC8vdXJsOiBcImh0dHA6Ly9vbWUtZGVtby5wYXRod2F5LmNvbTo4MDgwL2Fza1wiLFxufTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBBcHBWaWV3ID0gcmVxdWlyZShcIi4vYXBwXCIpO1xuXG4vL1x0SW5pdGlhdGlvblxuJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKSB7XG5cdC8vIFRpbWVyIGNvZGVcblx0dmFyIHJlc2V0VGltZXIgPSBmdW5jdGlvbih0KSB7XG5cdFx0aWYodCA9PT0gMCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHR9XG5cdFx0aWYodCA+IDkwKSB7XG5cdFx0XHQvL3dpbmRvdy5sb2NhdGlvbi5yZXBsYWNlKFwiL1wiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dCsrO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3Jlc2V0VGltZXIodCk7fSwgMTAwMCk7XG5cdFx0fVxuXHR9O1xuXHRcblx0Ly8gU3RhcnQgdGltZXJcblx0dmFyIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtyZXNldFRpbWVyKDApO30sIDEwMDApO1xuXHRcblx0JChkb2N1bWVudCkub24oXCJ0b3VjaHN0YXJ0IG1vdXNlZG93blwiLCBmdW5jdGlvbihlKSB7XG5cdFx0Ly8gUHJldmVudCBzY3JvbGxpbmcgb24gYW55IHRvdWNoZXMgdG8gc2NyZWVuXG5cdFx0JCh0aGlzKS5wcmV2ZW50U2Nyb2xsaW5nKGUpO1xuXHRcdFxuXHRcdC8vIFJlc2V0IHRpbWVyXG5cdFx0cmVzZXRUaW1lcigwKTtcblx0fSk7XG5cdFxuXHQvLyBGYXN0IGNsaWNrcyBmb3IgdG91Y2ggdXNlcnNcblx0RmFzdENsaWNrLmF0dGFjaChkb2N1bWVudC5ib2R5KTtcblx0XG5cdC8vIFN0YXJ0IVxuXHR3aW5kb3cuYXBwID0gbmV3IEFwcFZpZXcoKTtcbn0pOyJdfQ==
