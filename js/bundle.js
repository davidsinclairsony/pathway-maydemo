(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView = require("ome/app");

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
	
	$(document).on("touchstart mousedown", function(e) {
		// Prevent scrolling on any touches to screen
		$(this).preventScrolling(e);
		
		// Reset time
		refreshTime = 0;
	});
	
	// Fast clicks for touch users
	FastClick.attach(document.body);
	
	// Start timer
	// refreshTimer();
			
	// Start!
	window.app = new AppView();
});
},{"ome/app":2}],2:[function(require,module,exports){
var IntroView = require("ome/app/views/intro");
var HelloView = require("ome/app/views/hello");
var ConversationView = require("ome/app/views/conversation");
var Router = require("ome/app/router");

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
},{"ome/app/router":7,"ome/app/views/conversation":8,"ome/app/views/hello":15,"ome/app/views/intro":16}],3:[function(require,module,exports){
var PersonModel = require("ome/app/models/person");

module.exports = Backbone.Collection.extend({
	model: PersonModel
});
},{"ome/app/models/person":5}],4:[function(require,module,exports){
var QuestionModel = require("ome/app/models/question");

module.exports = Backbone.Collection.extend({
	model: QuestionModel
});
},{"ome/app/models/question":6}],5:[function(require,module,exports){
module.exports = Backbone.Model.extend({});
},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
module.exports = Backbone.Router.extend({
	routes: {
		"": "intro",
		"hello": "hello",
		"conversation": "conversation",
		'*error': 'error'
	}
});
},{}],8:[function(require,module,exports){
var PeopleView = require("ome/app/views/conversation/people");
var QuestionsView = require("ome/app/views/conversation/questions");
var ResponseView = require("ome/app/views/conversation/response");

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
		// Clear previous listens
		this.stopListening(this.responseView, "answerReady");
		
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
},{"ome/app/views/conversation/people":9,"ome/app/views/conversation/questions":11,"ome/app/views/conversation/response":14}],9:[function(require,module,exports){
var PeopleCollection = require("ome/app/collections/people");
var PersonView = require("ome/app/views/conversation/people/person");

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
},{"ome/app/collections/people":3,"ome/app/views/conversation/people/person":10}],10:[function(require,module,exports){
module.exports = Backbone.View.extend({
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
},{}],11:[function(require,module,exports){
var QuestionModel = require("ome/app/models/question");
var QuestionsCollection = require("ome/app/collections/questions");
var QuestionView = require("ome/app/views/conversation/questions/question");
var CustomQuestionView = require("ome/app/views/conversation/questions/customQuestion");

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
},{"ome/app/collections/questions":4,"ome/app/models/question":6,"ome/app/views/conversation/questions/customQuestion":12,"ome/app/views/conversation/questions/question":13}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
module.exports = Backbone.View.extend({
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
		var requestData;
		// var url = "http://" + window.location.host + "/ask";
		 var url = "http://atldev.pathway.com:3000/ask";
		// var url = "http://ome-demo.pathway.com:8080/ask";
		self.answer = {};
		self.answer.cid = person.cid;
		self.answer.personID = person.model.get("id");
		self.answer.questionID = question.model.get("id");
		self.answer.html = "";
		
		// Clear old timeouts and requests
		if(self.jqxhr) {
			self.jqxhr.abort();
		}
		if(self.timeout) {
			clearTimeout(self.timeout);
		}
		
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
						url: url,
						data: requestData,
						dataType: "jsonp",
						timeout: 15000
					}).always(function(data, status, jqxhr) {
						if(status == "success" && data.fitness.code === 0) {
							html =
								person.model.get("name") +
								self.answers[0].parts[0] +
								data.fitness.summary.caloriesOut +
								self.answers[0].parts[1] +
								person.model.get("goals") +
								self.answers[0].parts[2] +
								self.answers[0].responses[Math.floor(Math.random() * 6)]
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
				url: url,
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
				for (i = 0; i < self.answer.locations.length; i++) {
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
},{}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9jb2xsZWN0aW9ucy9wZW9wbGUuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9jb2xsZWN0aW9ucy9xdWVzdGlvbnMuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9tb2RlbHMvcGVyc29uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvcm91dGVyLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZS5qcyIsIm5vZGVfbW9kdWxlcy9vbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9vbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvY3VzdG9tUXVlc3Rpb24uanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL3F1ZXN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Jlc3BvbnNlLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvaGVsbG8uanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC92aWV3cy9pbnRyby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEFwcFZpZXcgPSByZXF1aXJlKFwib21lL2FwcFwiKTtcblxuLy9cdEluaXRpYXRpb25cbiQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCkge1xuXHQvLyBUaW1lciBjb2RlXG5cdHZhciByZWZyZXNoVGltZSA9IDA7XG5cdHZhciByZWZyZXNoVGltZXIgPSBmdW5jdGlvbigpIHtcblx0XHRpZihyZWZyZXNoVGltZSA+IDkwKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZShcIi9cIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlZnJlc2hUaW1lKys7XG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3JlZnJlc2hUaW1lcigpO30sIDEwMDApO1xuXHRcdH1cblx0fTtcblx0XG5cdCQoZG9jdW1lbnQpLm9uKFwidG91Y2hzdGFydCBtb3VzZWRvd25cIiwgZnVuY3Rpb24oZSkge1xuXHRcdC8vIFByZXZlbnQgc2Nyb2xsaW5nIG9uIGFueSB0b3VjaGVzIHRvIHNjcmVlblxuXHRcdCQodGhpcykucHJldmVudFNjcm9sbGluZyhlKTtcblx0XHRcblx0XHQvLyBSZXNldCB0aW1lXG5cdFx0cmVmcmVzaFRpbWUgPSAwO1xuXHR9KTtcblx0XG5cdC8vIEZhc3QgY2xpY2tzIGZvciB0b3VjaCB1c2Vyc1xuXHRGYXN0Q2xpY2suYXR0YWNoKGRvY3VtZW50LmJvZHkpO1xuXHRcblx0Ly8gU3RhcnQgdGltZXJcblx0Ly8gcmVmcmVzaFRpbWVyKCk7XG5cdFx0XHRcblx0Ly8gU3RhcnQhXG5cdHdpbmRvdy5hcHAgPSBuZXcgQXBwVmlldygpO1xufSk7IiwidmFyIEludHJvVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2ludHJvXCIpO1xudmFyIEhlbGxvVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2hlbGxvXCIpO1xudmFyIENvbnZlcnNhdGlvblZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb25cIik7XG52YXIgUm91dGVyID0gcmVxdWlyZShcIm9tZS9hcHAvcm91dGVyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0ZWw6IFwiI2FwcFwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gU3RhcnQgcm91dGVyIHdpdGggcHJlZGVmaW5lZCByb3V0ZXNcblx0XHR0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcblx0XHRcblx0XHQvLyBSb3V0ZSBhY3Rpb25zXG5cdFx0dGhpcy5yb3V0ZXIub24oXCJyb3V0ZTppbnRyb1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB2aWV3ID0gbmV3IEludHJvVmlldygpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLmdvVG8odmlldyk7XG5cdFx0XHRcblx0XHRcdC8vIExpc3RlbiBmb3IgZW5kIG9mIHZpZXdcblx0XHRcdHNlbGYubGlzdGVuVG9PbmNlKHZpZXcsIFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLnJvdXRlci5uYXZpZ2F0ZShcImhlbGxvXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJvdXRlci5vbihcInJvdXRlOmhlbGxvXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHZpZXcgPSBuZXcgSGVsbG9WaWV3KCk7XG5cdFx0XHRcblx0XHRcdHNlbGYuZ29Ubyh2aWV3KTtcblx0XHRcdFxuXHRcdFx0Ly8gTGlzdGVuIGZvciBlbmQgb2Ygdmlld1xuXHRcdFx0c2VsZi5saXN0ZW5Ub09uY2UodmlldywgXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYucm91dGVyLm5hdmlnYXRlKFwiY29udmVyc2F0aW9uXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJvdXRlci5vbihcInJvdXRlOmNvbnZlcnNhdGlvblwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjb252ZXJzYXRpb25WaWV3ID0gbmV3IENvbnZlcnNhdGlvblZpZXcoKTtcblx0XHRcdFxuXHRcdFx0c2VsZi5nb1RvKGNvbnZlcnNhdGlvblZpZXcpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIFN0YXJ0IHRyYWNraW5nXG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2sgLnJlZnJlc2hcIjogXCJyZWZyZXNoXCJcblx0fSxcblx0cmVmcmVzaDogZnVuY3Rpb24oKSB7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoXCIvXCIpO1xuXHR9LFxuXHRnb1RvOiBmdW5jdGlvbih2aWV3KSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBwcmV2aW91cyA9IHRoaXMuY3VycmVudFZpZXcgfHwgbnVsbDtcblx0XHR2YXIgbmV4dCA9IHZpZXc7XG5cdFx0XG5cdFx0Ly8gSGlkZSB0aGUgY3VycmVudCB2aWV3XG5cdFx0aWYocHJldmlvdXMpIHtcblx0XHRcdFR3ZWVuTWF4LnRvKHByZXZpb3VzLiRlbCwgLjUsIHtcblx0XHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7cHJldmlvdXMucmVtb3ZlKCk7fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIEFkZCAsIGhpZGUsIGFuZCB3YWl0IHVudGlsIGxvYWRlZFxuXHRcdHNlbGYuY3VycmVudFZpZXcgPSBuZXh0O1xuXHRcdHNlbGYuJGVsLmFwcGVuZChuZXh0LmVsKTtcblx0XHRuZXh0LiRlbC5oaWRlKCk7XG5cdFx0XG5cdFx0c2VsZi5saXN0ZW5Ub09uY2UobmV4dCwgXCJsb2FkZWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBXYWl0IGZvciBpbWFnZXMgYW5kIHJldmVhbFxuXHRcdFx0bmV4dC4kZWwud2FpdEZvckltYWdlcyhmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi4kZWwucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdFx0bmV4dC4kZWwuc2hvdygpO1xuXHRcdFx0XHRUd2Vlbk1heC5mcm9tKG5leHQuJGVsLCAuNSwge29wYWNpdHk6IDB9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxufSk7IiwidmFyIFBlcnNvbk1vZGVsID0gcmVxdWlyZShcIm9tZS9hcHAvbW9kZWxzL3BlcnNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdG1vZGVsOiBQZXJzb25Nb2RlbFxufSk7IiwidmFyIFF1ZXN0aW9uTW9kZWwgPSByZXF1aXJlKFwib21lL2FwcC9tb2RlbHMvcXVlc3Rpb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRtb2RlbDogUXVlc3Rpb25Nb2RlbFxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe30pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuUm91dGVyLmV4dGVuZCh7XG5cdHJvdXRlczoge1xuXHRcdFwiXCI6IFwiaW50cm9cIixcblx0XHRcImhlbGxvXCI6IFwiaGVsbG9cIixcblx0XHRcImNvbnZlcnNhdGlvblwiOiBcImNvbnZlcnNhdGlvblwiLFxuXHRcdCcqZXJyb3InOiAnZXJyb3InXG5cdH1cbn0pOyIsInZhciBQZW9wbGVWaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZVwiKTtcbnZhciBRdWVzdGlvbnNWaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9uc1wiKTtcbnZhciBSZXNwb25zZVZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcmVzcG9uc2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwidmlldyBjb252ZXJzYXRpb25cIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcblx0XHQvLyBDaGlsZCB2aWV3c1xuXHRcdHRoaXMucGVvcGxlVmlldyA9IG5ldyBQZW9wbGVWaWV3KCk7XG5cdFx0dGhpcy4kZWwuYXBwZW5kKHRoaXMucGVvcGxlVmlldy5lbCk7XG5cdFx0dGhpcy5xdWVzdGlvbnNWaWV3ID0gbmV3IFF1ZXN0aW9uc1ZpZXcoKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5xdWVzdGlvbnNWaWV3LmVsKTtcblx0XHR0aGlzLnJlc3BvbnNlVmlldyA9IG5ldyBSZXNwb25zZVZpZXcoKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5yZXNwb25zZVZpZXcuZWwpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoZGF0YSk7XG5cdFx0XHRzZWxmLiRlbC5oYW1tZXIoe2RvbUV2ZW50czogdHJ1ZX0pO1xuXHRcdFx0c2VsZi50cmlnZ2VyKFwibG9hZGVkXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrIC5hc2tcIjogXCJhc2tBbm90aGVyUXVlc3Rpb25cIixcblx0XHRcImNsaWNrIC5ob3csIGZvb3RlciAuY2xvc2VcIjogXCJob3dUb2dnbGVyXCIsXG5cdFx0XCJyZXF1ZXN0VG9SZXZlYWxTZWxlY3RlZFF1ZXN0aW9uXCI6IFwiYXNrQW5vdGhlclF1ZXN0aW9uXCIsXG5cdFx0XCJoaWRBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uXCI6IFwicHJlcGFyZUZvclJlc3BvbnNlXCIsXG5cdFx0XCJyZXZlYWxlZEFsbFF1ZXN0aW9uc1wiOiBcImhpZGVSZXNwb25zZVwiLFxuXHRcdFwiZGF0YVNvdXJjZWRcIjogXCJnZXRBbmRTaG93UmVzcG9uc2VcIixcblx0XHRcInBhbnN0YXJ0XCI6IFwicGFuSGFuZGxlclwiLFxuXHRcdFwicGFuXCI6IFwicGFuSGFuZGxlclwiLFxuXHRcdFwic3dpcGVkXCI6IFwic3dpcGVIYW5kbGVyXCIsXG5cdH0sXG5cdHBhbkhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHQvLyBQcmV2ZW50IHBhbi9zd2lwZSBvbiByZXNwb25zZSB2aWV3XG5cdFx0aWYoXG5cdFx0XHRlLm9yaWdpbmFsRXZlbnQgJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLnJlc3BvbnNlXCIpLmxlbmd0aCAmJlxuXHRcdFx0ISQoZS50YXJnZXQpLmhhc0NsYXNzKFwicmVzcG9uc2VcIilcblx0XHQpIHtcblx0XHRcdHRoaXMucGVvcGxlVmlldy5wYW5IYW5kbGVyKGUpO1xuXHRcdH1cblx0fSxcblx0c3dpcGVIYW5kbGVyOiBmdW5jdGlvbihldmVudCwgb2JqZWN0cykge1xuXHRcdHRoaXMucGVvcGxlVmlldy5zd2lwZUhhbmRsZXIob2JqZWN0cy5ldmVudCk7XG5cdFx0XG5cdFx0aWYodGhpcy5xdWVzdGlvbnNWaWV3LnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdC8vIFJlc2V0IHJlc3BvbnNlIHZpZXdcblx0XHRcdHRoaXMucmVzcG9uc2VWaWV3LnNldFRvTG9hZGluZygpO1xuXHRcdFx0XG5cdFx0XHQvLyBQcmVwYXJlIGZvciByZXNwb25zZVxuXHRcdFx0dGhpcy5wcmVwYXJlRm9yUmVzcG9uc2UoKTtcblx0XHR9XG5cdH0sXG5cdGhvd1RvZ2dsZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciAka25vdyA9IHRoaXMuJChcIi5rbm93XCIpO1xuXHRcdFxuXHRcdCRrbm93LnRvZ2dsZUNsYXNzKFwib2ZmXCIsICRrbm93Lmhhc0NsYXNzKFwib25cIikpO1xuXHRcdCRrbm93LnRvZ2dsZUNsYXNzKFwib25cIiwgISRrbm93Lmhhc0NsYXNzKFwib25cIikpO1xuXHR9LFxuXHRhc2tBbm90aGVyUXVlc3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucXVlc3Rpb25zVmlldy5yZXZlYWxBbGxRdWVzdGlvbnMoKTtcblx0fSxcblx0cHJlcGFyZUZvclJlc3BvbnNlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlc3BvbnNlVmlldy5wcmVwYXJlKHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uKTtcblx0XHRUd2Vlbk1heC50byh0aGlzLiQoXCIubG93ZXJcIiksIC41LCB7b3BhY2l0eTogMX0pO1xuXHRcdFxuXHRcdC8vIFRoaXMgd2lsbCBzdGFydCB0aGUgY2hpY2xldHMgbG9hZGluZ1xuXHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbi5vYnRhaW5EYXRhKCk7XG5cdH0sXG5cdGdldEFuZFNob3dSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0Ly8gQ2xlYXIgcHJldmlvdXMgbGlzdGVuc1xuXHRcdHRoaXMuc3RvcExpc3RlbmluZyh0aGlzLnJlc3BvbnNlVmlldywgXCJhbnN3ZXJSZWFkeVwiKTtcblx0XHRcblx0XHQvLyBMaXN0ZW4gZm9yIHdoZW4gdGhlIGFuc3dlciBpcyByZWFkeSB0byBkaXNwbGF5XG5cdFx0dGhpcy5saXN0ZW5Ub09uY2UodGhpcy5yZXNwb25zZVZpZXcsIFwiYW5zd2VyUmVhZHlcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBDaGVjayBpZiBzdGlsbCB0aGUgY3VycmVudCBxdWVzdGlvbiBhbmQgcGVyc29uXG5cdFx0XHRpZihcblx0XHRcdFx0dGhpcy5wZW9wbGVWaWV3LnNlbGVjdGVkUGVyc29uICYmXG5cdFx0XHRcdHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uICYmXG5cdFx0XHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbi5jaWQgPT0gdGhpcy5yZXNwb25zZVZpZXcuYW5zd2VyLmNpZCAmJlxuXHRcdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbi5tb2RlbC5nZXQoXCJpZFwiKSA9PSB0aGlzLnJlc3BvbnNlVmlldy5hbnN3ZXIucXVlc3Rpb25JRFxuXHRcdFx0KSB7XG5cdFx0XHRcdHRoaXMucmVzcG9uc2VWaWV3LnNob3coKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJlc3BvbnNlVmlldy5nZXQoXG5cdFx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24sXG5cdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvblxuXHRcdCk7XG5cdH0sXG5cdGhpZGVSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcuaGlkZSgpO1xuXHRcdFR3ZWVuTWF4LnRvKHRoaXMuJChcIi5sb3dlclwiKSwgLjUsIHtvcGFjaXR5OiAwfSk7XG5cdH1cbn0pOyIsInZhciBQZW9wbGVDb2xsZWN0aW9uID0gcmVxdWlyZShcIm9tZS9hcHAvY29sbGVjdGlvbnMvcGVvcGxlXCIpO1xudmFyIFBlcnNvblZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcGVvcGxlL3BlcnNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJwZW9wbGVcIixcblx0dGFnTmFtZTogXCJ1bFwiLFxuXHRzd2lwZVRocmVzaG9sZDogMTI1LFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXRKU09OKFwiL2pzL2pzb24vcGVvcGxlLmpzXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYucGVvcGxlQ29sbGVjdGlvbiA9IG5ldyBQZW9wbGVDb2xsZWN0aW9uKGRhdGEpO1xuXHRcdFx0c2VsZi52aWV3cyA9IFtdO1xuXHRcdFx0XG5cdFx0XHQvLyBDcmVhdGUgY3VycmVudCBzZWxlY3RlZCBwZXJzb24gdmlld1xuXHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBQZXJzb25WaWV3KHttb2RlbDogc2VsZi5wZW9wbGVDb2xsZWN0aW9uLmZpcnN0KCl9KSk7XG5cdFx0XHRcblx0XHRcdC8vIFNldCBzZWxlY3RlZCBwZXJzb24gdG8gY2VudGVyXG5cdFx0XHRzZWxmLnNldFNlbGVjdGVkUGVyc29uKHNlbGYudmlld3NbMF0pO1xuXHRcdFx0XG5cdFx0XHQvLyBEcmF3IHBlb3BsZVxuXHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHQvLyBBZGQgc2VsZWN0ZWQgcGVyc29uXG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnZpZXdzWzBdLmVsKTtcblxuXHRcdC8vIEFkZCB0aGUgb3RoZXJzIGFyb3VuZFxuXHRcdHRoaXMucGFkKCk7XG5cdFx0XG5cdFx0Ly8gU2V0IGVuZGluZyBwb3NpdGlvblxuXHRcdHRoaXMucG9zaXRpb25MZWZ0ID0gLTExOTY7XG5cblx0XHRyZXR1cm4gc2VsZjtcblx0fSxcblx0c2V0U2VsZWN0ZWRQZXJzb246IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHQvLyBUdXJuIG9mZiBjdXJyZW50IHNlbGVjdGVkIHBlcnNvblxuXHRcdGlmKHRoaXMuc2VsZWN0ZWRQZXJzb24pIHtcblx0XHRcdHRoaXMuc2VsZWN0ZWRQZXJzb24uc2VsZWN0ZWQgPSBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5zZWxlY3RlZFBlcnNvbiA9IHZpZXc7XG5cdFx0dmlldy5zZWxlY3RlZCA9IHRydWU7XG5cdH0sXG5cdHBhZDogZnVuY3Rpb24oKSB7XG5cdFx0Ly8gUGFkcyB0byA1IGVsZW1lbnRzIHRvdGFsLCBhcm91bmQgdGhlIHNlbGVjdGVkIHBlcnNvblxuXHRcdFxuXHRcdC8vIEdldCBsb2NhdGlvbiBpbiB2aWV3cyBvZiBzZWxlY3RlZCBwZXJzb25cblx0XHR2YXIgaW5kZXhPZlNlbGVjdGVkUGVyc29uID0gdGhpcy52aWV3cy5pbmRleE9mKHRoaXMuc2VsZWN0ZWRQZXJzb24pO1xuXHRcdHZhciBpLCBtb2RlbEluZGV4LCBtb2RlbCwgdmlldztcblx0XHRcblx0XHQvLyBHZW5lcmF0ZSBhbmQgYWRkIHZpZXdzIGJlZm9yZSB0aGUgc2VsZWN0ZWQgcGVyc29uXG5cdFx0d2hpbGUoaW5kZXhPZlNlbGVjdGVkUGVyc29uIDwgMikge1xuXHRcdFx0Ly8gR2V0IGluZGV4IG9mIGZpcnN0IHZpZXdcblx0XHRcdG1vZGVsSW5kZXggPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uaW5kZXhPZih0aGlzLnZpZXdzWzBdLm1vZGVsKTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHdoaWNoIG1vZGVsIHRvIHVzZVxuXHRcdFx0aWYobW9kZWxJbmRleCA9PT0gMCkge1xuXHRcdFx0XHRtb2RlbCA9ICB0aGlzLnBlb3BsZUNvbGxlY3Rpb24ubGFzdCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bW9kZWwgPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uYXQobW9kZWxJbmRleCAtIDEpO1xuXHRcdFx0fVxuXG5cdFx0XHR2aWV3ID0gbmV3IFBlcnNvblZpZXcoe21vZGVsOiBtb2RlbH0pO1xuXHRcdFx0dGhpcy52aWV3cy51bnNoaWZ0KHZpZXcpO1xuXHRcdFx0dGhpcy4kZWwucHJlcGVuZCh2aWV3LmVsKTtcblx0XHRcdFxuXHRcdFx0aW5kZXhPZlNlbGVjdGVkUGVyc29uID0gdGhpcy52aWV3cy5pbmRleE9mKHRoaXMuc2VsZWN0ZWRQZXJzb24pO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHQvLyBBZGQgdmlld3MgZm9yIGFmdGVyIHRoZSBzZWxlY3RlZCBwZXJzb25cblx0XHR3aGlsZSh0aGlzLnZpZXdzLmxlbmd0aCA8IDUpIHtcblx0XHRcdC8vIEdldCBpbmRleCBvZiBsYXN0IHZpZXdcblx0XHRcdG1vZGVsSW5kZXggPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uaW5kZXhPZihfLmxhc3QodGhpcy52aWV3cykubW9kZWwpO1xuXHRcdFx0XG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggbW9kZWwgdG8gdXNlXG5cdFx0XHRpZihtb2RlbEluZGV4ID09IF8uc2l6ZSh0aGlzLnBlb3BsZUNvbGxlY3Rpb24pIC0gMSkge1xuXHRcdFx0XHRtb2RlbCA9ICB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uZmlyc3QoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vZGVsID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmF0KG1vZGVsSW5kZXggKyAxKTtcblx0XHRcdH1cblxuXHRcdFx0dmlldyA9IG5ldyBQZXJzb25WaWV3KHttb2RlbDogbW9kZWx9KTtcblx0XHRcdHRoaXMudmlld3MucHVzaCh2aWV3KTtcblx0XHRcdHRoaXMuJGVsLmFwcGVuZCh2aWV3LmVsKTtcblx0XHR9XG5cdH0sXG5cdHBhbkhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRpZihlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5pc0ZpbmFsKSB7XG5cdFx0XHQvLyBGaXJlIGV2ZW50IHRvIHBhcmVudCBpZiBzd2lwZSwgb3RoZXJ3aXNlIHNuYXAgYmFja1xuXHRcdFx0aWYoXG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWCA8IC1zZWxmLnN3aXBlVGhyZXNob2xkIHx8XG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWCA+IHNlbGYuc3dpcGVUaHJlc2hvbGQpXG5cdFx0XHR7XG5cdFx0XHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJzd2lwZWRcIiwge2V2ZW50OiBlfSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjEsIHtsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdH0pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBGaW5kIG5ldyBwb3NpdGlvbiBhbmQgbW92ZVxuXHRcdFx0dmFyIGxlZnQgPSBzZWxmLnBvc2l0aW9uTGVmdCArIGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWDtcblx0XHRcdHNlbGYuJGVsLmNzcyh7bGVmdDogbGVmdH0pO1xuXHRcdH1cblx0fSxcblx0c3dpcGVIYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBjdXJyZW50SW5kZXggPSBzZWxmLnZpZXdzLmluZGV4T2Yoc2VsZi5zZWxlY3RlZFBlcnNvbik7XG5cdFx0XG5cdFx0Ly8gRGV0ZXJtaW5lIHN3aXBlIGRpcmVjdGlvblxuXHRcdGlmKGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWCA8IDApIHtcblx0XHRcdC8vIFNldCB0byBmb3J3YXJkIG9uZVxuXHRcdFx0c2VsZi5zZXRTZWxlY3RlZFBlcnNvbihzZWxmLnZpZXdzW2N1cnJlbnRJbmRleCArIDFdKTtcblx0XHRcdFxuXHRcdFx0Ly8gQW5pbWF0ZSB0byBjb3JyZWN0IHBvc2l0aW9uXG5cdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjEsIHtcblx0XHRcdFx0bGVmdDogc2VsZi5wb3NpdGlvbkxlZnQgLSA2NDAsXG5cdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgYXNwZWN0cyBvZiBlZGdlIHZpZXdcblx0XHRcdFx0XHRfLmZpcnN0KHNlbGYudmlld3MpLnJlbW92ZSgpO1xuXHRcdFx0XHRcdHNlbGYudmlld3Muc2hpZnQoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGQgaW4gbmV3XG5cdFx0XHRcdFx0c2VsZi5wYWQoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBSZXNldCBtYXJnaW5zXG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpmaXJzdC1jaGlsZFwiKS5jc3Moe21hcmdpbkxlZnQ6IDB9KTtcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOm50aC1jaGlsZChuICsgMilcIikuY3NzKHttYXJnaW5MZWZ0OiBcIjQwcHhcIn0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkanVzdCBwb3NpdGlvbmluZ1xuXHRcdFx0XHRcdHNlbGYuJGVsLmNzcyh7bGVmdDogc2VsZi5wb3NpdGlvbkxlZnR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNldCB0byBiYWNrIG9uZVxuXHRcdFx0c2VsZi5zZXRTZWxlY3RlZFBlcnNvbihzZWxmLnZpZXdzW2N1cnJlbnRJbmRleCAtIDFdKTtcblx0XHRcdFxuXHRcdFx0Ly8gQW5pbWF0ZSB0byBjb3JyZWN0IHBvc2l0aW9uXG5cdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjEsIHtcblx0XHRcdFx0bGVmdDogc2VsZi5wb3NpdGlvbkxlZnQgKyA2NDAsXG5cdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGFsbCBhc3BlY3RzIG9mIGVkZ2Ugdmlld1xuXHRcdFx0XHRcdF8ubGFzdChzZWxmLnZpZXdzKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRzZWxmLnZpZXdzLnBvcCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkZCBpbiBuZXdcblx0XHRcdFx0XHRzZWxmLnBhZCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFJlc2V0IG1hcmdpbnNcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOmZpcnN0LWNoaWxkXCIpLmNzcyh7bWFyZ2luTGVmdDogMH0pO1xuXHRcdFx0XHRcdHNlbGYuJChcIj4gbGk6bnRoLWNoaWxkKG4gKyAyKVwiKS5jc3Moe21hcmdpbkxlZnQ6IFwiNDBweFwifSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRqdXN0IHBvc2l0aW9uaW5nXG5cdFx0XHRcdFx0c2VsZi4kZWwuY3NzKHtsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3Blb3BsZS9wZXJzb24uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLnRlbXBsYXRlID0gXy50ZW1wbGF0ZShkYXRhKTtcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayAucGljdHVyZVwiOiBcInBvcHVwSGFuZGxlclwiLFxuXHRcdFwiY2xpY2sgLnNvdXJjZXMgbGlcIjogXCJwb3B1cEhhbmRsZXJcIlxuXHR9LFxuXHRvYnRhaW5EYXRhOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi4kKFwibGkuYXZhaWxhYmxlXCIpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJHRoaXMgPSAkKHRoaXMpO1xuXHRcdFx0XG5cdFx0XHQkdGhpcy5yZW1vdmVDbGFzcyhcInNwaW5PdXRcIikuYWRkQ2xhc3MoXCJzcGlubmVyXCIpO1xuXG5cdFx0XHQvLyBEYXRhIG9idGFpbmVkIGFmdGVyIHJhbmRvbSB0aW1lXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkdGhpcy5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0fSwgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjAwMCArIDEwMDApKTtcblx0XHR9KTtcblx0XHRcblx0XHQvLyBTaWduYWwgdG8gcGFyZW50IGRhdGEgaXMgcmVhZHlcblx0XHRzZWxmLiRlbC50cmlnZ2VyKFwiZGF0YVNvdXJjZWRcIik7XG5cdH0sXG5cdHBvcHVwSGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdC8vIENoZWNrIGlmIGN1cnJlbnQgcGVyc29uIGJlaW5nIGNsaWNrZWQgb25cblx0XHRpZih0aGlzLnNlbGVjdGVkKSB7XG5cdFx0XHRlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dmFyICRuZXdQb3B1cCA9ICQoZS50YXJnZXQpLnNpYmxpbmdzKFwiLnBvcHVwXCIpO1xuXHRcdFx0XG5cdFx0XHRpZighc2VsZi4kcG9wdXApIHtcblx0XHRcdFx0dGhpcy5wb3B1cFNob3dlcigkbmV3UG9wdXApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIGlzU2FtZUFzQ3VycmVudCA9IHNlbGYuJHBvcHVwLmlzKCRuZXdQb3B1cCk7XG5cblx0XHRcdFx0Ly8gSGlkZSBjdXJyZW50IHBvcHVwXG5cdFx0XHRcdHRoaXMucG9wdXBSZW1vdmVyKHNlbGYuJHBvcHVwKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmKCFpc1NhbWVBc0N1cnJlbnQpIHtcblx0XHRcdFx0XHQvLyBTaG93IG5ld1xuXHRcdFx0XHRcdHNlbGYuJHBvcHVwID0gJG5ld1BvcHVwO1xuXHRcdFx0XHRcdHRoaXMucG9wdXBTaG93ZXIoc2VsZi4kcG9wdXApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRwb3B1cFJlbW92ZXI6IGZ1bmN0aW9uKCRwKSB7XG5cdFx0dGhpcy4kcG9wdXAgPSBudWxsO1xuXHRcdFxuXHRcdC8vIEZhZGUgYW5kIGhpZGUgcG9wdXBcblx0XHRUd2Vlbk1heC50bygkcCwgLjUsIHtcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRkaXNwbGF5OiBcIm5vbmVcIixcblx0XHRcdG92ZXJ3cml0ZTogXCJhbGxcIlxuXHRcdH0pO1xuXG5cdFx0Ly8gVHVybiBvZmYgbGlzdGVuZXJcblx0XHQkKFwiYm9keVwiKS5vZmYoXCJ0b3VjaGVuZCBjbGlja1wiKTtcblx0fSxcblx0cG9wdXBTaG93ZXI6IGZ1bmN0aW9uKCRwKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJHBvcHVwID0gJHA7XG5cdFx0XG5cdFx0Ly8gU2hvdyBhbmQgZmFkZSBpblxuXHRcdFR3ZWVuTWF4LmZyb21UbygkcCwgLjUsXG5cdFx0XHR7b3BhY2l0eTogMCwgZGlzcGxheTogXCJibG9ja1wifSxcblx0XHRcdHtvcGFjaXR5OiAxLCBvdmVyd3JpdGU6IFwiYWxsXCJ9XG5cdFx0KTtcblx0XHRcblx0XHQvLyBMaXN0ZW4gZm9yIGFueXRoaW5nIHRvIHR1cm4gb2ZmXG5cdFx0JChcImJvZHlcIikub25lKFwidG91Y2hlbmQgY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLnBvcHVwUmVtb3ZlcigkcCk7XG5cdFx0fSk7XG5cdH1cbn0pOyIsInZhciBRdWVzdGlvbk1vZGVsID0gcmVxdWlyZShcIm9tZS9hcHAvbW9kZWxzL3F1ZXN0aW9uXCIpO1xudmFyIFF1ZXN0aW9uc0NvbGxlY3Rpb24gPSByZXF1aXJlKFwib21lL2FwcC9jb2xsZWN0aW9ucy9xdWVzdGlvbnNcIik7XG52YXIgUXVlc3Rpb25WaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9xdWVzdGlvblwiKTtcbnZhciBDdXN0b21RdWVzdGlvblZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL2N1c3RvbVF1ZXN0aW9uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInF1ZXN0aW9uc1wiLFxuXHR0YWdOYW1lOiBcInVsXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldEpTT04oXCIvanMvanNvbi9xdWVzdGlvbnMuanNcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5xdWVzdGlvbnNDb2xsZWN0aW9uID0gbmV3IFF1ZXN0aW9uc0NvbGxlY3Rpb24oZGF0YSk7XG5cdFx0XHRzZWxmLnZpZXdzID0gW107XG5cblx0XHRcdC8vIENyZWF0ZSBxdWVzdGlvbiB2aWV3c1xuXHRcdFx0c2VsZi5xdWVzdGlvbnNDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwpIHtcblx0XHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBRdWVzdGlvblZpZXcoe21vZGVsOiBtb2RlbH0pKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHQvLyBBZGQgaW4gY3VzdG9tIHF1ZXN0aW9uXG5cdFx0XHRzZWxmLnZpZXdzLnB1c2gobmV3IEN1c3RvbVF1ZXN0aW9uVmlldyh7XG5cdFx0XHRcdG1vZGVsOiBuZXcgUXVlc3Rpb25Nb2RlbCgpXG5cdFx0XHR9KSk7XG5cdFx0XHRcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJGVsLmVtcHR5KCk7XG5cdFx0XG5cdFx0dmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblx0XHRcblx0XHQvLyBSZW5kZXIgZWFjaCBxdWVzdGlvbiBhbmQgYWRkIGF0IGVuZFxuXHRcdF8uZWFjaChzZWxmLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQodmlldy5lbCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0c2VsZi4kZWwuYXBwZW5kKGNvbnRhaW5lcik7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwicXVlc3Rpb25DbGlja2VkXCI6IFwicXVlc3Rpb25DbGlja2VkXCIsXG5cdFx0XCJyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb25cIjogXCJyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb25cIlxuXHR9LFxuXHRxdWVzdGlvbkNsaWNrZWQ6IGZ1bmN0aW9uKGV2ZW50LCBvYmplY3RzKSB7XG5cdFx0aWYoIXRoaXMuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0Ly8gU2F2ZSB2aWV3IGFuZCBoaWRlIG90aGVyc1xuXHRcdFx0dGhpcy5zZWxlY3RlZFF1ZXN0aW9uID0gb2JqZWN0cy5zZWxlY3RlZFF1ZXN0aW9uO1xuXHRcdFx0dGhpcy5oaWRlQWxsRXhjZXB0U2VsZWN0ZWRRdWVzdGlvbigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicmVxdWVzdFRvUmV2ZWFsU2VsZWN0ZWRRdWVzdGlvblwiKTtcblx0XHR9XG5cdH0sXG5cdGhpZGVBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gQnViYmxlIHVwIHRoZSBldmVudFxuXHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJoaWRBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uXCIpO1xuXHRcdFxuXHRcdF8uZWFjaCh0aGlzLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRpZih2aWV3ID09IHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0XHQvLyBTYXZlIGN1cnJlbnQgb2Zmc2V0XG5cdFx0XHRcdHZhciBjdXJyZW50T2Zmc2V0ID0gdmlldy4kZWwub2Zmc2V0KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2aWV3LiRlbC5jc3MoXCJwb3NpdGlvblwiLCBcImFic29sdXRlXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gU2F2ZSBkZXNpcmVkIG9mZnNldFxuXHRcdFx0XHR2YXIgZGVzaXJlZE9mZnNldCA9IHZpZXcuJGVsLm9mZnNldCgpO1xuXHRcdFx0XHRcblx0XHRcdFx0dmlldy4kZWwuY3NzKFwicG9zaXRpb25cIiwgXCJyZWxhdGl2ZVwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFJlc2V0IHBvc2l0aW9uaW5nIGFuZCBtb3ZlIHF1ZXN0aW9uXG5cdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge1xuXHRcdFx0XHRcdHRvcDogZGVzaXJlZE9mZnNldC50b3AgLSBjdXJyZW50T2Zmc2V0LnRvcFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEhpZGUgYWxsIG90aGVyIHF1ZXN0aW9uc1xuXHRcdFx0XHRUd2Vlbk1heC50byh2aWV3LiRlbCwgLjUsIHthdXRvQWxwaGE6IDB9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmV2ZWFsQWxsUXVlc3Rpb25zOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0aWYoc2VsZi5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHQvLyBCdWJibGUgdXAgdGhlIGV2ZW50XG5cdFx0XHRzZWxmLiRlbC50cmlnZ2VyKFwicmV2ZWFsZWRBbGxRdWVzdGlvbnNcIik7XG5cdFx0XHRcblx0XHRcdF8uZWFjaCh0aGlzLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRcdC8vIFJlc2V0IGN1c3RvbSBxdWVzdGlvblxuXHRcdFx0XHRpZih2aWV3IGluc3RhbmNlb2YgQ3VzdG9tUXVlc3Rpb25WaWV3KSB7XG5cdFx0XHRcdFx0dmlldy5zdGFsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZih2aWV3ID09IHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0ZWRRdWVzdGlvbiA9IG51bGw7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBiYWNrIHRvIHBvc2l0aW9uLCBpZiBuZWVkZWRcblx0XHRcdFx0XHRpZighdmlldy4kZWwuaXMoXCI6Zmlyc3QtY2hpbGRcIikpIHtcblx0XHRcdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge1xuXHRcdFx0XHRcdFx0XHR0b3A6IDAsXG5cdFx0XHRcdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmKHZpZXcgaW5zdGFuY2VvZiBDdXN0b21RdWVzdGlvblZpZXcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYucmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gUmV2ZWFsIG90aGVyIHF1ZXN0aW9uc1xuXHRcdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge2F1dG9BbHBoYTogMX0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHJlZ2VuZXJhdGVDdXN0b21RdWVzdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIEJyaW5nIGN1cnJlbnQgb3V0IG9mIHBvc2l0aW9uXG5cdFx0dmFyIGN1cnJlbnQgPSBzZWxmLnZpZXdzLnNsaWNlKC0xKVswXTtcblx0XHRjdXJyZW50LiRlbC5jc3Moe1xuXHRcdFx0cG9zaXRpb246IFwiYWJzb2x1dGVcIixcblx0XHRcdHRvcDogY3VycmVudC4kZWwucG9zaXRpb24oKS50b3AsXG5cdFx0XHRsZWZ0OiBjdXJyZW50LiRlbC5wb3NpdGlvbigpLmxlZnQsXG5cdFx0XHR3aWR0aDogY3VycmVudC4kZWwub3V0ZXJXaWR0aCgpLFxuXHRcdFx0ekluZGV4OiAxMFxuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIEFkZCBpbiBuZXcgb25lXG5cdFx0dmFyIHZpZXcgPSBuZXcgQ3VzdG9tUXVlc3Rpb25WaWV3KHttb2RlbDogbmV3IFF1ZXN0aW9uTW9kZWwoKX0pO1xuXHRcdHNlbGYuJGVsLmFwcGVuZCh2aWV3LmVsKTtcblx0XHRcblx0XHQvLyBSZW1vdmUgb2xkIHdoZW4gbmV3IHByZXNlbnRcblx0XHR2YXIgaSA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoalF1ZXJ5LmNvbnRhaW5zKHNlbGYuZWwsIHZpZXcuZWwpKSB7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwoaSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjdXJyZW50LnJlbW92ZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQ2xlYW51cCBhcnJheVxuXHRcdFx0XHRzZWxmLnZpZXdzLnBvcCgpO1xuXHRcdFx0XHRzZWxmLnZpZXdzLnB1c2godmlldyk7XG5cdFx0XHR9XG5cdFx0fSwgMSk7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdGNsYXNzTmFtZTogXCJjdXN0b21cIixcblx0c3RhdHVzOiBcInN0YWxlXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL2N1c3RvbS5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHRcdHNlbGYuJGlucHV0ID0gc2VsZi4kKFwiaW5wdXRcIik7XG5cdFx0XHRzZWxmLiRidXR0b24gPSBzZWxmLiQoXCJidXR0b25cIik7XG5cdFx0XHRzZWxmLiRidXR0b24uY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2tcIjogXCJyb3V0ZXJcIixcblx0XHRcImtleXVwIGlucHV0XCI6IFwia2V5SGFuZGxlclwiXG5cdH0sXG5cdHJvdXRlcjogZnVuY3Rpb24oZSkge1xuXHRcdGlmKCQoZS50YXJnZXQpLmlzKHRoaXMuJGJ1dHRvbikgJiYgdGhpcy4kaW5wdXQudmFsKCkgIT09IFwiXCIpIHtcblx0XHRcdHRoaXMuc2VsZWN0ZWQoKTtcblx0XHR9IGVsc2UgaWYodGhpcy5zdGF0dXMgPT0gXCJzZWxlY3RlZFwiKSB7XG5cdFx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicXVlc3Rpb25DbGlja2VkXCIsIHtzZWxlY3RlZFF1ZXN0aW9uOiB0aGlzfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZWRpdGluZygpO1xuXHRcdH1cblx0fSxcblx0a2V5SGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdGlmKGUua2V5Q29kZSA9PSAxMyl7XG5cdFx0XHR0aGlzLiRidXR0b24uY2xpY2soKTtcblx0XHR9XG5cdH0sXG5cdGVkaXRpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnN0YXR1cyA9IFwiZWRpdGluZ1wiO1xuXHRcdFxuXHRcdC8vIEFsbG93IGVkaXRpbmdcblx0XHRzZWxmLiRpbnB1dC5wcm9wKFwicmVhZG9ubHlcIiwgZmFsc2UpLmZvY3VzKCk7XG5cdFx0XG5cdFx0Ly8gQW5pbWF0ZSBoZWlnaHQgaWYgbm90IGFscmVhZHkgZG9uZVxuXHRcdGlmKCFzZWxmLiRlbC5oYXNDbGFzcyhcImZvY3VzZWRcIikpIHtcblx0XHRcdHNlbGYuJGVsLmFkZENsYXNzKFwiZm9jdXNlZFwiKS5jc3MoXCJ0cmFuc2l0aW9uXCIsIFwiLjVzXCIpO1xuXHRcdFx0XG5cdFx0XHQvLyBSZW1vdmUgdHJhbnNpdGlvblxuXHRcdFx0c2VsZi4kZWwub25lKFwidHJhbnNpdGlvbmVuZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi4kZWwuY3NzKFwidHJhbnNpdGlvblwiLCAwKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRUd2Vlbk1heC5mcm9tVG8oc2VsZi4kYnV0dG9uLCAuNSxcblx0XHRcdFx0e29wYWNpdHk6IDAsIGRpc3BsYXk6IFwiYmxvY2tcIn0sXG5cdFx0XHRcdHtvcGFjaXR5OiAxfVxuXHRcdFx0KTtcblx0XHR9XG5cdH0sXG5cdHNlbGVjdGVkOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5zdGF0dXMgPSBcInNlbGVjdGVkXCI7XG5cdFx0XG5cdFx0Ly8gU2F2ZSBkYXRhIHRvIG1vb2RlbFxuXHRcdHNlbGYubW9kZWwuc2V0KHtcInRleHRcIjogc2VsZi4kaW5wdXQudmFsKCl9KTtcblx0XHRcblx0XHQvLyBEaXNhYmxlIGVkaXRpbmcgYW5kIHNocmlua1xuXHRcdHNlbGYuJGlucHV0LmJsdXIoKS5wcm9wKFwicmVhZG9ubHlcIiwgdHJ1ZSk7XG5cdFx0c2VsZi5zaHJpbmsoKTtcblxuXHRcdC8vIEZpcmUgZXZlbnQgdG8gcGFyZW50XG5cdFx0c2VsZi4kZWwudHJpZ2dlcihcInF1ZXN0aW9uQ2xpY2tlZFwiLCB7c2VsZWN0ZWRRdWVzdGlvbjogc2VsZn0pO1xuXHR9LFxuXHRzdGFsZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kaW5wdXQudmFsKFwiXCIpO1xuXHRcdFxuXHRcdGlmKHRoaXMuc3RhdHVzID09IFwiZWRpdGluZ1wiKSB7XG5cdFx0XHR0aGlzLnNocmluaygpO1xuXHRcdH1cblx0XHRcblx0XHR0aGlzLnN0YXR1cyA9IFwic3RhbGVcIjtcblx0fSxcblx0c2hyaW5rOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi4kZWwucmVtb3ZlQ2xhc3MoXCJmb2N1c2VkXCIpO1xuXHRcdFxuXHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGJ1dHRvbiwgLjUsIHtcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRkaXNwbGF5OiBcIm5vbmVcIlxuXHRcdH0pO1xuXHR9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0dGFnTmFtZTogXCJsaVwiLFxuXHR0ZW1wbGF0ZTogXy50ZW1wbGF0ZShcIjwlPSB0ZXh0ICU+XCIpLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2tcIjogXCJjbGlja2VkXCJcblx0fSxcblx0Y2xpY2tlZDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwudHJpZ2dlcihcInF1ZXN0aW9uQ2xpY2tlZFwiLCB7c2VsZWN0ZWRRdWVzdGlvbjogdGhpc30pO1xuXHR9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInJlc3BvbnNlXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBHZXQgc3RvcmVkIHJlc3BvbnNlcyBhbmQgc2V0dXBcblx0XHQkLmdldEpTT04oXCIvanMvanNvbi9hbnN3ZXJzLmpzXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuYW5zd2VycyA9IGRhdGE7XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0c2VsZi5zZXRUb0xvYWRpbmcoKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNldFRvTG9hZGluZygpO1xuXHRcdHRoaXMuJGVsLmhpZGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayBmb290ZXIgZGl2XCI6IFwibWFya1JhdGVkXCJcblx0fSxcblx0bWFya1JhdGVkOiBmdW5jdGlvbihlKSB7XG5cdFx0JChlLmN1cnJlbnRUYXJnZXQpLnBhcmVudCgpLmZpbmQoXCJkaXZcIikucmVtb3ZlQ2xhc3MoXCJjbGlja2VkXCIpO1xuXHRcdCQoZS5jdXJyZW50VGFyZ2V0KS5hZGRDbGFzcyhcImNsaWNrZWRcIik7XG5cdH0sXG5cdHNldFRvTG9hZGluZzogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWxcblx0XHRcdC5lbXB0eSgpXG5cdFx0XHQuYWRkQ2xhc3MoXCJzcGlubmVyXCIpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoXCJzcGluT3V0XCIpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoXCJtYXBcIilcblx0XHQ7XG5cdH0sXG5cdHByZXBhcmU6IGZ1bmN0aW9uKGFuc3dlcikge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIEFkanVzdCBzaXplIG9mIGFuc3dlciBhcmVhIGJhc2VkIG9uIHF1ZXN0aW9uIHNpemVcblx0XHR2YXIgdG9wID0gYW5zd2VyLiRlbC5wYXJlbnQoKS5vZmZzZXQoKS50b3AgKyBhbnN3ZXIuJGVsLm91dGVySGVpZ2h0KCkgKyAxMDtcblx0XHR2YXIgaGVpZ2h0ID0gNTIwIC0gYW5zd2VyLiRlbC5vdXRlckhlaWdodCgpO1xuXHRcdFxuXHRcdHNlbGYuJGVsLmNzcyh7XG5cdFx0XHRkaXNwbGF5OiBcImJsb2NrXCIsXG5cdFx0XHR0b3A6IHRvcCxcblx0XHRcdGhlaWdodDogaGVpZ2h0XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gRmFkZSBpbiByZXNwb25zZVxuXHRcdFR3ZWVuTWF4LmZyb21UbyhzZWxmLiRlbCwgLjUsIHtvcGFjaXR5OiAwfSwge29wYWNpdHk6IDF9KTtcblx0fSxcblx0Z2V0OiBmdW5jdGlvbihwZXJzb24sIHF1ZXN0aW9uKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciByZXF1ZXN0RGF0YTtcblx0XHQvLyB2YXIgdXJsID0gXCJodHRwOi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL2Fza1wiO1xuXHRcdCB2YXIgdXJsID0gXCJodHRwOi8vYXRsZGV2LnBhdGh3YXkuY29tOjMwMDAvYXNrXCI7XG5cdFx0Ly8gdmFyIHVybCA9IFwiaHR0cDovL29tZS1kZW1vLnBhdGh3YXkuY29tOjgwODAvYXNrXCI7XG5cdFx0c2VsZi5hbnN3ZXIgPSB7fTtcblx0XHRzZWxmLmFuc3dlci5jaWQgPSBwZXJzb24uY2lkO1xuXHRcdHNlbGYuYW5zd2VyLnBlcnNvbklEID0gcGVyc29uLm1vZGVsLmdldChcImlkXCIpO1xuXHRcdHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQgPSBxdWVzdGlvbi5tb2RlbC5nZXQoXCJpZFwiKTtcblx0XHRzZWxmLmFuc3dlci5odG1sID0gXCJcIjtcblx0XHRcblx0XHQvLyBDbGVhciBvbGQgdGltZW91dHMgYW5kIHJlcXVlc3RzXG5cdFx0aWYoc2VsZi5qcXhocikge1xuXHRcdFx0c2VsZi5qcXhoci5hYm9ydCgpO1xuXHRcdH1cblx0XHRpZihzZWxmLnRpbWVvdXQpIHtcblx0XHRcdGNsZWFyVGltZW91dChzZWxmLnRpbWVvdXQpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBDaGVjayBpZiBzdG9yZWQgcmVzcG9uc2Vcblx0XHRpZihzZWxmLmFuc3dlci5xdWVzdGlvbklEIDwgNCkge1xuXHRcdFx0dmFyIGh0bWwgPSBcIlwiO1xuXHRcdFx0XG5cdFx0XHRzd2l0Y2goc2VsZi5hbnN3ZXIucXVlc3Rpb25JRCkge1xuXHRcdFx0XHRjYXNlIDE6XG5cdFx0XHRcdFx0Ly8gR2V0IGZpdG5lc3MgZGF0YSBhYm91dCBwZXJzb25cblx0XHRcdFx0XHRyZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFx0XHRcdFwidXNlcklkXCI6IHNlbGYuYW5zd2VyLnBlcnNvbklELFxuXHRcdFx0XHRcdFx0XCJmaXRuZXNzXCI6IFwidHJ1ZVwiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBHZXQgdGhlIGFuc3dlclxuXHRcdFx0XHRcdHNlbGYuanF4aHIgPSAkLmFqYXgoe1xuXHRcdFx0XHRcdFx0dXJsOiB1cmwsXG5cdFx0XHRcdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdFx0XHRcdGRhdGFUeXBlOiBcImpzb25wXCIsXG5cdFx0XHRcdFx0XHR0aW1lb3V0OiAxNTAwMFxuXHRcdFx0XHRcdH0pLmFsd2F5cyhmdW5jdGlvbihkYXRhLCBzdGF0dXMsIGpxeGhyKSB7XG5cdFx0XHRcdFx0XHRpZihzdGF0dXMgPT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5maXRuZXNzLmNvZGUgPT09IDApIHtcblx0XHRcdFx0XHRcdFx0aHRtbCA9XG5cdFx0XHRcdFx0XHRcdFx0cGVyc29uLm1vZGVsLmdldChcIm5hbWVcIikgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1swXSArXG5cdFx0XHRcdFx0XHRcdFx0ZGF0YS5maXRuZXNzLnN1bW1hcnkuY2Fsb3JpZXNPdXQgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1sxXSArXG5cdFx0XHRcdFx0XHRcdFx0cGVyc29uLm1vZGVsLmdldChcImdvYWxzXCIpICtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucGFydHNbMl0gK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5yZXNwb25zZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNildXG5cdFx0XHRcdFx0XHRcdDtcblx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IGh0bWw7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gXCI8cD5Tb3JyeSwgcGxlYXNlIHRyeSBhZ2Fpbi48L3A+XCI7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7fSwgMjUwMCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gc2VsZi5hbnN3ZXJzWzFdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0uaHRtbDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgbG9jYXRpb25zID0gc2VsZi5hbnN3ZXJzWzFdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0ubG9jYXRpb25zO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkZCBsb2NhdGlvbiBuYW1lcyB0byBodG1sXG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBcIjx1bD5cIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPGxpPlwiICsgbG9jYXRpb25zW2ldLnRpdGxlICsgXCI8L2xpPlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPC91bD5cIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnMgPSBsb2NhdGlvbnM7XG5cdFx0XHRcdFx0c2VsZi50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTt9LCAzMDAwKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBzZWxmLmFuc3dlcnNbMl1bc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXTtcblx0XHRcdFx0XHRzZWxmLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImFuc3dlclJlYWR5XCIpO30sIDMwMDApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBUbyBiZSBzZW50IHRvIEFQSVxuXHRcdFx0cmVxdWVzdERhdGEgPSB7XG5cdFx0XHRcdFwidXNlcklkXCI6IDEsIC8vIHNlbGYuYW5zd2VyLnBlcnNvbklELFxuXHRcdFx0XHRcInF1ZXN0aW9uXCI6IHtcblx0XHRcdFx0XHRcInF1ZXN0aW9uVGV4dFwiOiBxdWVzdGlvbi5tb2RlbC5nZXQoXCJ0ZXh0XCIpXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdC8vIEdldCB0aGUgYW5zd2VyXG5cdFx0XHRzZWxmLmpxeGhyID0gJC5hamF4KHtcblx0XHRcdFx0dXJsOiB1cmwsXG5cdFx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0XHRkYXRhVHlwZTogXCJqc29ucFwiLFxuXHRcdFx0XHR0aW1lb3V0OiAxNTAwMFxuXHRcdFx0fSkuYWx3YXlzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywganF4aHIpIHtcblx0XHRcdFx0aWYoc3RhdHVzID09IFwic3VjY2Vzc1wiICYmIGRhdGEuYW5zd2VyLmFuc3dlcnNbMF0pIHtcblx0XHRcdFx0XHRpZihzZWxmLmFuc3dlci5xdWVzdGlvbklEID09IDUgJiYgc2VsZi5hbnN3ZXIucGVyc29uSUQgPT0gMikge1xuXHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBzZWxmLmFuc3dlcnNbM107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgKz0gZGF0YS5hbnN3ZXIuYW5zd2Vyc1swXS5mb3JtYXR0ZWRUZXh0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBcIjxwPlNvcnJ5LCBwbGVhc2UgdHJ5IGFnYWluLjwvcD5cIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHNob3c6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIEdyYWNlZnVsbHkgaGlkZSBzcGlubmVyXG5cdFx0c2VsZi4kZWwucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcblx0XHRpZihzZWxmLmFuc3dlci5odG1sKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoXCI8bWFpbj5cIiArIHNlbGYuYW5zd2VyLmh0bWwgKyBcIjwvbWFpbj5cIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxtYWluPjxwPlNvcnJ5LCBwbGVhc2UgdHJ5IGFnYWluIGxhdGVyLjwvcD48L21haW4+XCIpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBTaG93IG1hcCBpZiBsb2NhdGlvbnMgYXJlIGF2YWlsYWJsZVxuXHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9ucykge1xuXHRcdFx0c2VsZi4kZWwuYWRkQ2xhc3MoXCJtYXBcIik7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoXCI8ZGl2IGNsYXNzPSdjb250YWluZXInPjxkaXYgaWQ9J21hcCc+PC9kaXY+PC9kaXY+XCIpO1xuXHRcdFx0XG5cdFx0XHQkLmdldEpTT04oXCIvanMvanNvbi9tYXAuanNcIiwgZnVuY3Rpb24oc3R5bGVzKSB7XG5cdFx0XHRcdHZhciBzdHlsZWRNYXAgPSBuZXcgZ29vZ2xlLm1hcHMuU3R5bGVkTWFwVHlwZShcblx0XHRcdFx0XHRzdHlsZXMsXG5cdFx0XHRcdFx0e25hbWU6IFwiU3R5bGVkXCJ9XG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgbWFwT3B0aW9ucyA9IHtcblx0XHRcdFx0XHRtYXBUeXBlQ29udHJvbE9wdGlvbnM6IHtcblx0XHRcdFx0XHRcdG1hcFR5cGVJZHM6IFtnb29nbGUubWFwcy5NYXBUeXBlSWQuUk9BRE1BUCwgXCJtYXBfc3R5bGVcIl1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG1hcFR5cGVDb250cm9sOiBmYWxzZSxcblx0XHRcdFx0XHRzdHJlZXRWaWV3Q29udHJvbDogZmFsc2UsXG5cdFx0XHRcdFx0em9vbUNvbnRyb2w6IHRydWUsXG5cdFx0XHRcdFx0em9vbUNvbnRyb2xPcHRpb25zOiB7XG5cdFx0XHRcdFx0XHRzdHlsZTogZ29vZ2xlLm1hcHMuWm9vbUNvbnRyb2xTdHlsZS5MQVJHRSxcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiBnb29nbGUubWFwcy5Db250cm9sUG9zaXRpb24uTEVGVF9UT1Bcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgbWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1hcFwiKSwgbWFwT3B0aW9ucyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRtYXAubWFwVHlwZXMuc2V0KFwibWFwX3N0eWxlXCIsIHN0eWxlZE1hcCk7XG5cdFx0XHRcdG1hcC5zZXRNYXBUeXBlSWQoXCJtYXBfc3R5bGVcIik7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xuXHRcdFx0XHR2YXIgaW5mb3dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KCk7ICBcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEFkZCBtYXJrZXJzXG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBzZWxmLmFuc3dlci5sb2NhdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHQvLyBGb3JtYXQgdGl0bGVcblx0XHRcdFx0XHR2YXIgY29udGVudCA9IFwiXCI7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYoc2VsZi5hbnN3ZXIubG9jYXRpb25zW2ldLnRpdGxlKSB7XG5cdFx0XHRcdFx0XHRjb250ZW50ID0gXCI8ZGl2IGNsYXNzPSd0aXRsZSc+XCIgKyBzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0udGl0bGUgKyBcIjwvZGl2PlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZihzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uZGVzY3JpcHRpb24pIHtcblx0XHRcdFx0XHRcdGNvbnRlbnQgKz0gXCI8ZGl2IGNsYXNzPSdkZXNjcmlwdGlvbic+XCIgKyBzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uZGVzY3JpcHRpb24gKyBcIjwvZGl2PlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgbWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhcblx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIubG9jYXRpb25zW2ldLmNvb3JkaW5hdGVzLmxhdHRpdHVkZSxcblx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIubG9jYXRpb25zW2ldLmNvb3JkaW5hdGVzLmxvbmdpdHVkZVxuXHRcdFx0XHRcdFx0KSxcblx0XHRcdFx0XHRcdG1hcDogbWFwLFxuXHRcdFx0XHRcdFx0dGl0bGU6IGNvbnRlbnQsXG5cdFx0XHRcdFx0XHR2aXNpYmxlOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly9leHRlbmQgdGhlIGJvdW5kcyB0byBpbmNsdWRlIGVhY2ggbWFya2VyJ3MgcG9zaXRpb25cblx0XHRcdFx0XHRib3VuZHMuZXh0ZW5kKG1hcmtlci5wb3NpdGlvbik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Z29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIobWFya2VyLCBcImNsaWNrXCIsIChmdW5jdGlvbihtYXJrZXIsIGkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0aW5mb3dpbmRvdy5zZXRDb250ZW50KG1hcmtlci50aXRsZSk7XG5cdFx0XHRcdFx0XHRcdGluZm93aW5kb3cub3BlbihtYXAsIG1hcmtlcik7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pKG1hcmtlciwgaSkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRtYXAuZml0Qm91bmRzKGJvdW5kcyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBBZGQgaW4gdGh1bWJzIHVwIGFuZCBkb3duXG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9yZXNwb25zZS9mb290ZXIuaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoZGF0YSk7XG5cdFx0fSk7XG5cdH0sXG5cdGhpZGU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRUd2Vlbk1heC5mcm9tVG8oc2VsZi4kZWwsIC41LCB7b3BhY2l0eTogMX0sIHtcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRkaXNwbGF5OiBcIm5vbmVcIixcblx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLnNldFRvTG9hZGluZygpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInZpZXcgaGVsbG9cIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0XG5cdFx0Ly8gQnV0dG9uIHRvIGVuZFxuXHRcdHNlbGYuJGVsLm9uZShcImNsaWNrXCIsIFwiYnV0dG9uXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi50cmlnZ2VyKFwiZW5kXCIpO1xuXHRcdH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGVsLmxvYWQoXCIvdGVtcGxhdGVzL2hlbGxvLmh0bWxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBTaWduYWwgdG8gcGFyZW50XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwidmlldyBpbnRyb1wiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImVuZFwiKTt9LCA3MDAwKTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLiRlbC5sb2FkKFwiL3RlbXBsYXRlcy9pbnRyby5odG1sXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRvIHBhcmVudFxuXHRcdFx0c2VsZi50cmlnZ2VyKFwibG9hZGVkXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9XG59KTsiXX0=
