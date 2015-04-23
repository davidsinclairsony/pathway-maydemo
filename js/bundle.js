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
	
	// Start timer
	// refreshTimer();
	
	$(document).on("touchstart mousedown", function(e) {
		// Prevent scrolling on any touches to screen
		$(this).preventScrolling(e);
		
		// Reset time
		refreshTime = 0;
	});
	
	// Fast clicks for touch users
	FastClick.attach(document.body);
	
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
			$modal = this.$el.find(".modal");
			$modalInner = $modal.find("> div");
			$modalInner.css("visibility", "hidden");
			
			$modalInner.waitForImages(function() {
				$modal.removeClass("spinner").addClass("spinOut");
				TweenMax.fromTo($modalInner, .5,
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
	url: "http://" + window.location.host + "/ask",
	//url: "http://atldev.pathway.com:3000/ask",
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
		var top = answer.$el.parent().offset().top + 58 + 10;
		var height = 520 - 58;
		
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
		self.answer = {};
		self.answer.cid = person.cid;
		self.answer.personID = person.model.get("id");
		self.answer.questionID = question.model.get("id");
		self.answer.html = "";
		
		var numberWithCommas = function(x) {
			return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}
		
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
						url: self.url,
						data: requestData,
						dataType: "jsonp",
						timeout: 15000
					}).always(function(data, status, jqxhr) {
						if(status == "success" && data.fitness.code === 0) {
							var randomNumber = Math.floor(Math.random() * 6);
							
							// Generate random response
							if(randomNumber != 4) {
								var randomResponse = self.answers[0].responses[randomNumber]
							} else {
								var randomResponse =
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9jb2xsZWN0aW9ucy9wZW9wbGUuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9jb2xsZWN0aW9ucy9xdWVzdGlvbnMuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9tb2RlbHMvcGVyc29uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvcm91dGVyLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZS5qcyIsIm5vZGVfbW9kdWxlcy9vbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9vbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvY3VzdG9tUXVlc3Rpb24uanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL3F1ZXN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Jlc3BvbnNlLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvaGVsbG8uanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC92aWV3cy9pbnRyby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBBcHBWaWV3ID0gcmVxdWlyZShcIm9tZS9hcHBcIik7XG5cbi8vXHRJbml0aWF0aW9uXG4kKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcblx0Ly8gVGltZXIgY29kZVxuXHR2YXIgcmVmcmVzaFRpbWUgPSAwO1xuXHR2YXIgcmVmcmVzaFRpbWVyID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYocmVmcmVzaFRpbWUgPiA5MCkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoXCIvXCIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZWZyZXNoVGltZSsrO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtyZWZyZXNoVGltZXIoKTt9LCAxMDAwKTtcblx0XHR9XG5cdH07XG5cdFxuXHQvLyBTdGFydCB0aW1lclxuXHQvLyByZWZyZXNoVGltZXIoKTtcblx0XG5cdCQoZG9jdW1lbnQpLm9uKFwidG91Y2hzdGFydCBtb3VzZWRvd25cIiwgZnVuY3Rpb24oZSkge1xuXHRcdC8vIFByZXZlbnQgc2Nyb2xsaW5nIG9uIGFueSB0b3VjaGVzIHRvIHNjcmVlblxuXHRcdCQodGhpcykucHJldmVudFNjcm9sbGluZyhlKTtcblx0XHRcblx0XHQvLyBSZXNldCB0aW1lXG5cdFx0cmVmcmVzaFRpbWUgPSAwO1xuXHR9KTtcblx0XG5cdC8vIEZhc3QgY2xpY2tzIGZvciB0b3VjaCB1c2Vyc1xuXHRGYXN0Q2xpY2suYXR0YWNoKGRvY3VtZW50LmJvZHkpO1xuXHRcblx0Ly8gU3RhcnQhXG5cdHdpbmRvdy5hcHAgPSBuZXcgQXBwVmlldygpO1xufSk7IiwidmFyIEludHJvVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2ludHJvXCIpO1xudmFyIEhlbGxvVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2hlbGxvXCIpO1xudmFyIENvbnZlcnNhdGlvblZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb25cIik7XG52YXIgUm91dGVyID0gcmVxdWlyZShcIm9tZS9hcHAvcm91dGVyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0ZWw6IFwiI2FwcFwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gU3RhcnQgcm91dGVyIHdpdGggcHJlZGVmaW5lZCByb3V0ZXNcblx0XHR0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcblx0XHRcblx0XHQvLyBSb3V0ZSBhY3Rpb25zXG5cdFx0dGhpcy5yb3V0ZXIub24oXCJyb3V0ZTppbnRyb1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB2aWV3ID0gbmV3IEludHJvVmlldygpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLmdvVG8odmlldyk7XG5cdFx0XHRcblx0XHRcdC8vIExpc3RlbiBmb3IgZW5kIG9mIHZpZXdcblx0XHRcdHNlbGYubGlzdGVuVG9PbmNlKHZpZXcsIFwiZW5kXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLnJvdXRlci5uYXZpZ2F0ZShcImhlbGxvXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJvdXRlci5vbihcInJvdXRlOmhlbGxvXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHZpZXcgPSBuZXcgSGVsbG9WaWV3KCk7XG5cdFx0XHRcblx0XHRcdHNlbGYuZ29Ubyh2aWV3KTtcblx0XHRcdFxuXHRcdFx0Ly8gTGlzdGVuIGZvciBlbmQgb2Ygdmlld1xuXHRcdFx0c2VsZi5saXN0ZW5Ub09uY2UodmlldywgXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYucm91dGVyLm5hdmlnYXRlKFwiY29udmVyc2F0aW9uXCIsIHt0cmlnZ2VyOiB0cnVlfSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJvdXRlci5vbihcInJvdXRlOmNvbnZlcnNhdGlvblwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjb252ZXJzYXRpb25WaWV3ID0gbmV3IENvbnZlcnNhdGlvblZpZXcoKTtcblx0XHRcdFxuXHRcdFx0c2VsZi5nb1RvKGNvbnZlcnNhdGlvblZpZXcpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIFN0YXJ0IHRyYWNraW5nXG5cdFx0QmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2sgLnJlZnJlc2hcIjogXCJyZWZyZXNoXCJcblx0fSxcblx0cmVmcmVzaDogZnVuY3Rpb24oKSB7XG5cdFx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoXCIvXCIpO1xuXHR9LFxuXHRnb1RvOiBmdW5jdGlvbih2aWV3KSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBwcmV2aW91cyA9IHRoaXMuY3VycmVudFZpZXcgfHwgbnVsbDtcblx0XHR2YXIgbmV4dCA9IHZpZXc7XG5cdFx0XG5cdFx0Ly8gSGlkZSB0aGUgY3VycmVudCB2aWV3XG5cdFx0aWYocHJldmlvdXMpIHtcblx0XHRcdFR3ZWVuTWF4LnRvKHByZXZpb3VzLiRlbCwgLjUsIHtcblx0XHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7cHJldmlvdXMucmVtb3ZlKCk7fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIEFkZCAsIGhpZGUsIGFuZCB3YWl0IHVudGlsIGxvYWRlZFxuXHRcdHNlbGYuY3VycmVudFZpZXcgPSBuZXh0O1xuXHRcdHNlbGYuJGVsLmFwcGVuZChuZXh0LmVsKTtcblx0XHRuZXh0LiRlbC5oaWRlKCk7XG5cdFx0XG5cdFx0c2VsZi5saXN0ZW5Ub09uY2UobmV4dCwgXCJsb2FkZWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBXYWl0IGZvciBpbWFnZXMgYW5kIHJldmVhbFxuXHRcdFx0bmV4dC4kZWwud2FpdEZvckltYWdlcyhmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi4kZWwucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdFx0bmV4dC4kZWwuc2hvdygpO1xuXHRcdFx0XHRUd2Vlbk1heC5mcm9tKG5leHQuJGVsLCAuNSwge29wYWNpdHk6IDB9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxufSk7IiwidmFyIFBlcnNvbk1vZGVsID0gcmVxdWlyZShcIm9tZS9hcHAvbW9kZWxzL3BlcnNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdG1vZGVsOiBQZXJzb25Nb2RlbFxufSk7IiwidmFyIFF1ZXN0aW9uTW9kZWwgPSByZXF1aXJlKFwib21lL2FwcC9tb2RlbHMvcXVlc3Rpb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRtb2RlbDogUXVlc3Rpb25Nb2RlbFxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe30pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuUm91dGVyLmV4dGVuZCh7XG5cdHJvdXRlczoge1xuXHRcdFwiXCI6IFwiaW50cm9cIixcblx0XHRcImhlbGxvXCI6IFwiaGVsbG9cIixcblx0XHRcImNvbnZlcnNhdGlvblwiOiBcImNvbnZlcnNhdGlvblwiLFxuXHRcdCcqZXJyb3InOiAnZXJyb3InXG5cdH1cbn0pOyIsInZhciBQZW9wbGVWaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZVwiKTtcbnZhciBRdWVzdGlvbnNWaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9uc1wiKTtcbnZhciBSZXNwb25zZVZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcmVzcG9uc2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwidmlldyBjb252ZXJzYXRpb25cIixcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0XHRcblx0XHQvLyBDaGlsZCB2aWV3c1xuXHRcdHRoaXMucGVvcGxlVmlldyA9IG5ldyBQZW9wbGVWaWV3KCk7XG5cdFx0dGhpcy4kZWwuYXBwZW5kKHRoaXMucGVvcGxlVmlldy5lbCk7XG5cdFx0dGhpcy5xdWVzdGlvbnNWaWV3ID0gbmV3IFF1ZXN0aW9uc1ZpZXcoKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5xdWVzdGlvbnNWaWV3LmVsKTtcblx0XHR0aGlzLnJlc3BvbnNlVmlldyA9IG5ldyBSZXNwb25zZVZpZXcoKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5yZXNwb25zZVZpZXcuZWwpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoZGF0YSk7XG5cdFx0XHRzZWxmLiRlbC5oYW1tZXIoe2RvbUV2ZW50czogdHJ1ZX0pO1xuXHRcdFx0c2VsZi50cmlnZ2VyKFwibG9hZGVkXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrIC5hc2tcIjogXCJhc2tBbm90aGVyUXVlc3Rpb25cIixcblx0XHRcImNsaWNrIC5ob3csIGZvb3RlciAuY2xvc2VcIjogXCJob3dUb2dnbGVyXCIsXG5cdFx0XCJyZXF1ZXN0VG9SZXZlYWxTZWxlY3RlZFF1ZXN0aW9uXCI6IFwiYXNrQW5vdGhlclF1ZXN0aW9uXCIsXG5cdFx0XCJoaWRBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uXCI6IFwicHJlcGFyZUZvclJlc3BvbnNlXCIsXG5cdFx0XCJyZXZlYWxlZEFsbFF1ZXN0aW9uc1wiOiBcImhpZGVSZXNwb25zZVwiLFxuXHRcdFwiZGF0YVNvdXJjZWRcIjogXCJnZXRBbmRTaG93UmVzcG9uc2VcIixcblx0XHRcInBhbnN0YXJ0XCI6IFwicGFuSGFuZGxlclwiLFxuXHRcdFwicGFuXCI6IFwicGFuSGFuZGxlclwiLFxuXHRcdFwic3dpcGVkXCI6IFwic3dpcGVIYW5kbGVyXCIsXG5cdH0sXG5cdHBhbkhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHQvLyBQcmV2ZW50IHBhbi9zd2lwZSBvbiByZXNwb25zZSB2aWV3IGFuZCBtb2RhbFxuXHRcdGlmKFxuXHRcdFx0ZS5vcmlnaW5hbEV2ZW50ICYmXG5cdFx0XHQhJChlLnRhcmdldCkucGFyZW50cyhcIi5yZXNwb25zZVwiKS5sZW5ndGggJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5oYXNDbGFzcyhcInJlc3BvbnNlXCIpICYmXG5cdFx0XHQhJChlLnRhcmdldCkucGFyZW50cyhcIi5tb2RhbFwiKS5sZW5ndGggJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5oYXNDbGFzcyhcIm1vZGFsXCIpXG5cdFx0KSB7XG5cdFx0XHR0aGlzLnBlb3BsZVZpZXcucGFuSGFuZGxlcihlKTtcblx0XHR9XG5cdH0sXG5cdHN3aXBlSGFuZGxlcjogZnVuY3Rpb24oZXZlbnQsIG9iamVjdHMpIHtcblx0XHR0aGlzLnBlb3BsZVZpZXcuc3dpcGVIYW5kbGVyKG9iamVjdHMuZXZlbnQpO1xuXHRcdFxuXHRcdGlmKHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHQvLyBSZXNldCByZXNwb25zZSB2aWV3XG5cdFx0XHR0aGlzLnJlc3BvbnNlVmlldy5zZXRUb0xvYWRpbmcoKTtcblx0XHRcdFxuXHRcdFx0Ly8gUHJlcGFyZSBmb3IgcmVzcG9uc2Vcblx0XHRcdHRoaXMucHJlcGFyZUZvclJlc3BvbnNlKCk7XG5cdFx0fVxuXHR9LFxuXHRob3dUb2dnbGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgJGtub3cgPSB0aGlzLiQoXCIua25vd1wiKTtcblx0XHRcblx0XHQka25vdy50b2dnbGVDbGFzcyhcIm9mZlwiLCAka25vdy5oYXNDbGFzcyhcIm9uXCIpKTtcblx0XHQka25vdy50b2dnbGVDbGFzcyhcIm9uXCIsICEka25vdy5oYXNDbGFzcyhcIm9uXCIpKTtcblx0fSxcblx0YXNrQW5vdGhlclF1ZXN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcucmV2ZWFsQWxsUXVlc3Rpb25zKCk7XG5cdH0sXG5cdHByZXBhcmVGb3JSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcucHJlcGFyZSh0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbik7XG5cdFx0VHdlZW5NYXgudG8odGhpcy4kKFwiLmxvd2VyXCIpLCAuNSwge29wYWNpdHk6IDF9KTtcblx0XHRcblx0XHQvLyBUaGlzIHdpbGwgc3RhcnQgdGhlIGNoaWNsZXRzIGxvYWRpbmdcblx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24ub2J0YWluRGF0YSgpO1xuXHR9LFxuXHRnZXRBbmRTaG93UmVzcG9uc2U6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIENsZWFyIHByZXZpb3VzIGxpc3RlbnNcblx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcodGhpcy5yZXNwb25zZVZpZXcsIFwiYW5zd2VyUmVhZHlcIik7XG5cdFx0XG5cdFx0Ly8gTGlzdGVuIGZvciB3aGVuIHRoZSBhbnN3ZXIgaXMgcmVhZHkgdG8gZGlzcGxheVxuXHRcdHRoaXMubGlzdGVuVG9PbmNlKHRoaXMucmVzcG9uc2VWaWV3LCBcImFuc3dlclJlYWR5XCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgc3RpbGwgdGhlIGN1cnJlbnQgcXVlc3Rpb24gYW5kIHBlcnNvblxuXHRcdFx0aWYoXG5cdFx0XHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbiAmJlxuXHRcdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbiAmJlxuXHRcdFx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24uY2lkID09IHRoaXMucmVzcG9uc2VWaWV3LmFuc3dlci5jaWQgJiZcblx0XHRcdFx0dGhpcy5xdWVzdGlvbnNWaWV3LnNlbGVjdGVkUXVlc3Rpb24ubW9kZWwuZ2V0KFwiaWRcIikgPT0gdGhpcy5yZXNwb25zZVZpZXcuYW5zd2VyLnF1ZXN0aW9uSURcblx0XHRcdCkge1xuXHRcdFx0XHR0aGlzLnJlc3BvbnNlVmlldy5zaG93KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcuZ2V0KFxuXHRcdFx0dGhpcy5wZW9wbGVWaWV3LnNlbGVjdGVkUGVyc29uLFxuXHRcdFx0dGhpcy5xdWVzdGlvbnNWaWV3LnNlbGVjdGVkUXVlc3Rpb25cblx0XHQpO1xuXHR9LFxuXHRoaWRlUmVzcG9uc2U6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVzcG9uc2VWaWV3LmhpZGUoKTtcblx0XHRUd2Vlbk1heC50byh0aGlzLiQoXCIubG93ZXJcIiksIC41LCB7b3BhY2l0eTogMH0pO1xuXHR9XG59KTsiLCJ2YXIgUGVvcGxlQ29sbGVjdGlvbiA9IHJlcXVpcmUoXCJvbWUvYXBwL2NvbGxlY3Rpb25zL3Blb3BsZVwiKTtcbnZhciBQZXJzb25WaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZS9wZXJzb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwicGVvcGxlXCIsXG5cdHRhZ05hbWU6IFwidWxcIixcblx0c3dpcGVUaHJlc2hvbGQ6IDEyNSxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdCQuZ2V0SlNPTihcIi9qcy9qc29uL3Blb3BsZS5qc1wiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLnBlb3BsZUNvbGxlY3Rpb24gPSBuZXcgUGVvcGxlQ29sbGVjdGlvbihkYXRhKTtcblx0XHRcdHNlbGYudmlld3MgPSBbXTtcblx0XHRcdFxuXHRcdFx0Ly8gQ3JlYXRlIGN1cnJlbnQgc2VsZWN0ZWQgcGVyc29uIHZpZXdcblx0XHRcdHNlbGYudmlld3MucHVzaChuZXcgUGVyc29uVmlldyh7bW9kZWw6IHNlbGYucGVvcGxlQ29sbGVjdGlvbi5maXJzdCgpfSkpO1xuXHRcdFx0XG5cdFx0XHQvLyBTZXQgc2VsZWN0ZWQgcGVyc29uIHRvIGNlbnRlclxuXHRcdFx0c2VsZi5zZXRTZWxlY3RlZFBlcnNvbihzZWxmLnZpZXdzWzBdKTtcblx0XHRcdFxuXHRcdFx0Ly8gRHJhdyBwZW9wbGVcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0Ly8gQWRkIHNlbGVjdGVkIHBlcnNvblxuXHRcdHRoaXMuJGVsLmh0bWwodGhpcy52aWV3c1swXS5lbCk7XG5cblx0XHQvLyBBZGQgdGhlIG90aGVycyBhcm91bmRcblx0XHR0aGlzLnBhZCgpO1xuXHRcdFxuXHRcdC8vIFNldCBlbmRpbmcgcG9zaXRpb25cblx0XHR0aGlzLnBvc2l0aW9uTGVmdCA9IC0xMTk2O1xuXG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdHNldFNlbGVjdGVkUGVyc29uOiBmdW5jdGlvbih2aWV3KSB7XG5cdFx0Ly8gVHVybiBvZmYgY3VycmVudCBzZWxlY3RlZCBwZXJzb25cblx0XHRpZih0aGlzLnNlbGVjdGVkUGVyc29uKSB7XG5cdFx0XHR0aGlzLnNlbGVjdGVkUGVyc29uLnNlbGVjdGVkID0gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdHRoaXMuc2VsZWN0ZWRQZXJzb24gPSB2aWV3O1xuXHRcdHZpZXcuc2VsZWN0ZWQgPSB0cnVlO1xuXHR9LFxuXHRwYWQ6IGZ1bmN0aW9uKCkge1xuXHRcdC8vIFBhZHMgdG8gNSBlbGVtZW50cyB0b3RhbCwgYXJvdW5kIHRoZSBzZWxlY3RlZCBwZXJzb25cblx0XHRcblx0XHQvLyBHZXQgbG9jYXRpb24gaW4gdmlld3Mgb2Ygc2VsZWN0ZWQgcGVyc29uXG5cdFx0dmFyIGluZGV4T2ZTZWxlY3RlZFBlcnNvbiA9IHRoaXMudmlld3MuaW5kZXhPZih0aGlzLnNlbGVjdGVkUGVyc29uKTtcblx0XHR2YXIgaSwgbW9kZWxJbmRleCwgbW9kZWwsIHZpZXc7XG5cdFx0XG5cdFx0Ly8gR2VuZXJhdGUgYW5kIGFkZCB2aWV3cyBiZWZvcmUgdGhlIHNlbGVjdGVkIHBlcnNvblxuXHRcdHdoaWxlKGluZGV4T2ZTZWxlY3RlZFBlcnNvbiA8IDIpIHtcblx0XHRcdC8vIEdldCBpbmRleCBvZiBmaXJzdCB2aWV3XG5cdFx0XHRtb2RlbEluZGV4ID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmluZGV4T2YodGhpcy52aWV3c1swXS5tb2RlbCk7XG5cdFx0XHRcblx0XHRcdC8vIERldGVybWluZSB3aGljaCBtb2RlbCB0byB1c2Vcblx0XHRcdGlmKG1vZGVsSW5kZXggPT09IDApIHtcblx0XHRcdFx0bW9kZWwgPSAgdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmxhc3QoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vZGVsID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmF0KG1vZGVsSW5kZXggLSAxKTtcblx0XHRcdH1cblxuXHRcdFx0dmlldyA9IG5ldyBQZXJzb25WaWV3KHttb2RlbDogbW9kZWx9KTtcblx0XHRcdHRoaXMudmlld3MudW5zaGlmdCh2aWV3KTtcblx0XHRcdHRoaXMuJGVsLnByZXBlbmQodmlldy5lbCk7XG5cdFx0XHRcblx0XHRcdGluZGV4T2ZTZWxlY3RlZFBlcnNvbiA9IHRoaXMudmlld3MuaW5kZXhPZih0aGlzLnNlbGVjdGVkUGVyc29uKTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0Ly8gQWRkIHZpZXdzIGZvciBhZnRlciB0aGUgc2VsZWN0ZWQgcGVyc29uXG5cdFx0d2hpbGUodGhpcy52aWV3cy5sZW5ndGggPCA1KSB7XG5cdFx0XHQvLyBHZXQgaW5kZXggb2YgbGFzdCB2aWV3XG5cdFx0XHRtb2RlbEluZGV4ID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmluZGV4T2YoXy5sYXN0KHRoaXMudmlld3MpLm1vZGVsKTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHdoaWNoIG1vZGVsIHRvIHVzZVxuXHRcdFx0aWYobW9kZWxJbmRleCA9PSBfLnNpemUodGhpcy5wZW9wbGVDb2xsZWN0aW9uKSAtIDEpIHtcblx0XHRcdFx0bW9kZWwgPSAgdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmZpcnN0KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtb2RlbCA9IHRoaXMucGVvcGxlQ29sbGVjdGlvbi5hdChtb2RlbEluZGV4ICsgMSk7XG5cdFx0XHR9XG5cblx0XHRcdHZpZXcgPSBuZXcgUGVyc29uVmlldyh7bW9kZWw6IG1vZGVsfSk7XG5cdFx0XHR0aGlzLnZpZXdzLnB1c2godmlldyk7XG5cdFx0XHR0aGlzLiRlbC5hcHBlbmQodmlldy5lbCk7XG5cdFx0fVxuXHR9LFxuXHRwYW5IYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0aWYoZS5vcmlnaW5hbEV2ZW50Lmdlc3R1cmUuaXNGaW5hbCkge1xuXHRcdFx0Ly8gRmlyZSBldmVudCB0byBwYXJlbnQgaWYgc3dpcGUsIG90aGVyd2lzZSBzbmFwIGJhY2tcblx0XHRcdGlmKFxuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVggPCAtc2VsZi5zd2lwZVRocmVzaG9sZCB8fFxuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVggPiBzZWxmLnN3aXBlVGhyZXNob2xkKVxuXHRcdFx0e1xuXHRcdFx0XHRzZWxmLiRlbC50cmlnZ2VyKFwic3dpcGVkXCIsIHtldmVudDogZX0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC4xLCB7bGVmdDogc2VsZi5wb3NpdGlvbkxlZnR9KTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gRmluZCBuZXcgcG9zaXRpb24gYW5kIG1vdmVcblx0XHRcdHZhciBsZWZ0ID0gc2VsZi5wb3NpdGlvbkxlZnQgKyBlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVg7XG5cdFx0XHRzZWxmLiRlbC5jc3Moe2xlZnQ6IGxlZnR9KTtcblx0XHR9XG5cdH0sXG5cdHN3aXBlSGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgY3VycmVudEluZGV4ID0gc2VsZi52aWV3cy5pbmRleE9mKHNlbGYuc2VsZWN0ZWRQZXJzb24pO1xuXHRcdFxuXHRcdC8vIERldGVybWluZSBzd2lwZSBkaXJlY3Rpb25cblx0XHRpZihlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5kZWx0YVggPCAwKSB7XG5cdFx0XHQvLyBTZXQgdG8gZm9yd2FyZCBvbmVcblx0XHRcdHNlbGYuc2V0U2VsZWN0ZWRQZXJzb24oc2VsZi52aWV3c1tjdXJyZW50SW5kZXggKyAxXSk7XG5cdFx0XHRcblx0XHRcdC8vIEFuaW1hdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC4xLCB7XG5cdFx0XHRcdGxlZnQ6IHNlbGYucG9zaXRpb25MZWZ0IC0gNjQwLFxuXHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBSZW1vdmUgYWxsIGFzcGVjdHMgb2YgZWRnZSB2aWV3XG5cdFx0XHRcdFx0Xy5maXJzdChzZWxmLnZpZXdzKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRzZWxmLnZpZXdzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRkIGluIG5ld1xuXHRcdFx0XHRcdHNlbGYucGFkKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gUmVzZXQgbWFyZ2luc1xuXHRcdFx0XHRcdHNlbGYuJChcIj4gbGk6Zmlyc3QtY2hpbGRcIikuY3NzKHttYXJnaW5MZWZ0OiAwfSk7XG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpudGgtY2hpbGQobiArIDIpXCIpLmNzcyh7bWFyZ2luTGVmdDogXCI0MHB4XCJ9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGp1c3QgcG9zaXRpb25pbmdcblx0XHRcdFx0XHRzZWxmLiRlbC5jc3Moe2xlZnQ6IHNlbGYucG9zaXRpb25MZWZ0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBTZXQgdG8gYmFjayBvbmVcblx0XHRcdHNlbGYuc2V0U2VsZWN0ZWRQZXJzb24oc2VsZi52aWV3c1tjdXJyZW50SW5kZXggLSAxXSk7XG5cdFx0XHRcblx0XHRcdC8vIEFuaW1hdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC4xLCB7XG5cdFx0XHRcdGxlZnQ6IHNlbGYucG9zaXRpb25MZWZ0ICsgNjQwLFxuXHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgYXNwZWN0cyBvZiBlZGdlIHZpZXdcblx0XHRcdFx0XHRfLmxhc3Qoc2VsZi52aWV3cykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0c2VsZi52aWV3cy5wb3AoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGQgaW4gbmV3XG5cdFx0XHRcdFx0c2VsZi5wYWQoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBSZXNldCBtYXJnaW5zXG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpmaXJzdC1jaGlsZFwiKS5jc3Moe21hcmdpbkxlZnQ6IDB9KTtcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOm50aC1jaGlsZChuICsgMilcIikuY3NzKHttYXJnaW5MZWZ0OiBcIjQwcHhcIn0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkanVzdCBwb3NpdGlvbmluZ1xuXHRcdFx0XHRcdHNlbGYuJGVsLmNzcyh7bGVmdDogc2VsZi5wb3NpdGlvbkxlZnR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0dGFnTmFtZTogXCJsaVwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi50ZW1wbGF0ZSA9IF8udGVtcGxhdGUoZGF0YSk7XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24vcGVvcGxlL3BlcnNvbi9tb2RhbC5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYubW9kYWxUZW1wbGF0ZSA9IF8udGVtcGxhdGUoZGF0YSk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayAucGljdHVyZVwiOiBcInBvcHVwSGFuZGxlclwiLFxuXHRcdFwiY2xpY2sgLnNvdXJjZXMgbGlcIjogXCJwb3B1cEhhbmRsZXJcIixcblx0XHRcImNsaWNrIC5wb3B1cCBidXR0b25cIjogXCJyZXBvcnRUb2dnbGVyXCIsXG5cdFx0XCJjbGljayAubW9kYWwgYnV0dG9uXCI6IFwicmVwb3J0VG9nZ2xlclwiXG5cdH0sXG5cdHJlcG9ydFRvZ2dsZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciAkbW9kYWwgPSB0aGlzLiRlbC5maW5kKFwiLm1vZGFsXCIpO1xuXHRcdFxuXHRcdC8vIENyZWF0ZSBtb2RhbCBpZiBuZWVkZWQsIG90aGVyd2lzZSByZW1vdmVcblx0XHRpZighJG1vZGFsLmxlbmd0aCkge1xuXHRcdFx0dGhpcy4kZWwuYXBwZW5kKHRoaXMubW9kYWxUZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG5cdFx0XHQkbW9kYWwgPSB0aGlzLiRlbC5maW5kKFwiLm1vZGFsXCIpO1xuXHRcdFx0JG1vZGFsSW5uZXIgPSAkbW9kYWwuZmluZChcIj4gZGl2XCIpO1xuXHRcdFx0JG1vZGFsSW5uZXIuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHRcdFxuXHRcdFx0JG1vZGFsSW5uZXIud2FpdEZvckltYWdlcyhmdW5jdGlvbigpIHtcblx0XHRcdFx0JG1vZGFsLnJlbW92ZUNsYXNzKFwic3Bpbm5lclwiKS5hZGRDbGFzcyhcInNwaW5PdXRcIik7XG5cdFx0XHRcdFR3ZWVuTWF4LmZyb21UbygkbW9kYWxJbm5lciwgLjUsXG5cdFx0XHRcdFx0e29wYWNpdHk6IDAsIHZpc2liaWxpdHk6IFwidmlzaWJsZVwifSxcblx0XHRcdFx0XHR7b3BhY2l0eTogMSwgb25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkbW9kYWwucmVtb3ZlQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0XHRcdH19XG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gUHJldmVudCBiYWNrZ3JvdW5kIGNsaWNrc1xuXHRcdFx0JG1vZGFsLm9uKFwidG91Y2hzdGFydCBtb3VzZWRvd24gY2xpY2tcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRpZighJChlLnRhcmdldCkuaXMoJG1vZGFsLmZpbmQoXCJidXR0b25cIikpKSB7XG5cdFx0XHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFR3ZWVuTWF4LnRvKCRtb2RhbCwgLjUsIHtvcGFjaXR5OiAwLCBvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JG1vZGFsLnJlbW92ZSgpO1xuXHRcdFx0fX0pO1xuXHRcdH1cblx0fSxcblx0b2J0YWluRGF0YTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJChcImxpLmF2YWlsYWJsZVwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICR0aGlzID0gJCh0aGlzKTtcblx0XHRcdFxuXHRcdFx0JHRoaXMucmVtb3ZlQ2xhc3MoXCJzcGluT3V0XCIpLmFkZENsYXNzKFwic3Bpbm5lclwiKTtcblxuXHRcdFx0Ly8gRGF0YSBvYnRhaW5lZCBhZnRlciByYW5kb20gdGltZVxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JHRoaXMucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdH0sIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDIwMDAgKyAxMDAwKSk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gU2lnbmFsIHRvIHBhcmVudCBkYXRhIGlzIHJlYWR5XG5cdFx0c2VsZi4kZWwudHJpZ2dlcihcImRhdGFTb3VyY2VkXCIpO1xuXHR9LFxuXHRwb3B1cEhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHQvLyBDaGVjayBpZiBjdXJyZW50IHBlcnNvbiBiZWluZyBjbGlja2VkIG9uXG5cdFx0aWYodGhpcy5zZWxlY3RlZCkge1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHZhciAkbmV3UG9wdXAgPSAkKGUudGFyZ2V0KS5zaWJsaW5ncyhcIi5wb3B1cFwiKTtcblx0XHRcdFxuXHRcdFx0aWYoIXNlbGYuJHBvcHVwKSB7XG5cdFx0XHRcdHRoaXMucG9wdXBTaG93ZXIoJG5ld1BvcHVwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBpc1NhbWVBc0N1cnJlbnQgPSBzZWxmLiRwb3B1cC5pcygkbmV3UG9wdXApO1xuXG5cdFx0XHRcdC8vIEhpZGUgY3VycmVudCBwb3B1cFxuXHRcdFx0XHR0aGlzLnBvcHVwUmVtb3ZlcihzZWxmLiRwb3B1cCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZighaXNTYW1lQXNDdXJyZW50KSB7XG5cdFx0XHRcdFx0Ly8gU2hvdyBuZXdcblx0XHRcdFx0XHRzZWxmLiRwb3B1cCA9ICRuZXdQb3B1cDtcblx0XHRcdFx0XHR0aGlzLnBvcHVwU2hvd2VyKHNlbGYuJHBvcHVwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0cG9wdXBSZW1vdmVyOiBmdW5jdGlvbigkcCkge1xuXHRcdHRoaXMuJHBvcHVwID0gbnVsbDtcblx0XHRcblx0XHQvLyBGYWRlIGFuZCBoaWRlIHBvcHVwXG5cdFx0VHdlZW5NYXgudG8oJHAsIC41LCB7XG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0ZGlzcGxheTogXCJub25lXCIsXG5cdFx0XHRvdmVyd3JpdGU6IFwiYWxsXCJcblx0XHR9KTtcblxuXHRcdC8vIFR1cm4gb2ZmIGxpc3RlbmVyXG5cdFx0JChcImJvZHlcIikub2ZmKFwidG91Y2hlbmQgY2xpY2tcIik7XG5cdH0sXG5cdHBvcHVwU2hvd2VyOiBmdW5jdGlvbigkcCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLiRwb3B1cCA9ICRwO1xuXHRcdFxuXHRcdC8vIFNob3cgYW5kIGZhZGUgaW5cblx0XHRUd2Vlbk1heC5mcm9tVG8oJHAsIC41LFxuXHRcdFx0e29wYWNpdHk6IDAsIGRpc3BsYXk6IFwiYmxvY2tcIn0sXG5cdFx0XHR7b3BhY2l0eTogMSwgb3ZlcndyaXRlOiBcImFsbFwifVxuXHRcdCk7XG5cdFx0XG5cdFx0Ly8gTGlzdGVuIGZvciBhbnl0aGluZyB0byB0dXJuIG9mZlxuXHRcdCQoXCJib2R5XCIpLm9uZShcInRvdWNoZW5kIGNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5wb3B1cFJlbW92ZXIoJHApO1xuXHRcdH0pO1xuXHR9XG59KTsiLCJ2YXIgUXVlc3Rpb25Nb2RlbCA9IHJlcXVpcmUoXCJvbWUvYXBwL21vZGVscy9xdWVzdGlvblwiKTtcbnZhciBRdWVzdGlvbnNDb2xsZWN0aW9uID0gcmVxdWlyZShcIm9tZS9hcHAvY29sbGVjdGlvbnMvcXVlc3Rpb25zXCIpO1xudmFyIFF1ZXN0aW9uVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvcXVlc3Rpb25cIik7XG52YXIgQ3VzdG9tUXVlc3Rpb25WaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9jdXN0b21RdWVzdGlvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJxdWVzdGlvbnNcIixcblx0dGFnTmFtZTogXCJ1bFwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXRKU09OKFwiL2pzL2pzb24vcXVlc3Rpb25zLmpzXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYucXVlc3Rpb25zQ29sbGVjdGlvbiA9IG5ldyBRdWVzdGlvbnNDb2xsZWN0aW9uKGRhdGEpO1xuXHRcdFx0c2VsZi52aWV3cyA9IFtdO1xuXG5cdFx0XHQvLyBDcmVhdGUgcXVlc3Rpb24gdmlld3Ncblx0XHRcdHNlbGYucXVlc3Rpb25zQ29sbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKG1vZGVsKSB7XG5cdFx0XHRcdHNlbGYudmlld3MucHVzaChuZXcgUXVlc3Rpb25WaWV3KHttb2RlbDogbW9kZWx9KSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Ly8gQWRkIGluIGN1c3RvbSBxdWVzdGlvblxuXHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBDdXN0b21RdWVzdGlvblZpZXcoe1xuXHRcdFx0XHRtb2RlbDogbmV3IFF1ZXN0aW9uTW9kZWwoKVxuXHRcdFx0fSkpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLiRlbC5lbXB0eSgpO1xuXHRcdFxuXHRcdHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdFx0XG5cdFx0Ly8gUmVuZGVyIGVhY2ggcXVlc3Rpb24gYW5kIGFkZCBhdCBlbmRcblx0XHRfLmVhY2goc2VsZi52aWV3cywgZnVuY3Rpb24odmlldykge1xuXHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKHZpZXcuZWwpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHNlbGYuJGVsLmFwcGVuZChjb250YWluZXIpO1xuXHRcdFxuXHRcdHJldHVybiBzZWxmO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcInF1ZXN0aW9uQ2xpY2tlZFwiOiBcInF1ZXN0aW9uQ2xpY2tlZFwiLFxuXHRcdFwicmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uXCI6IFwicmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uXCJcblx0fSxcblx0cXVlc3Rpb25DbGlja2VkOiBmdW5jdGlvbihldmVudCwgb2JqZWN0cykge1xuXHRcdGlmKCF0aGlzLnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdC8vIFNhdmUgdmlldyBhbmQgaGlkZSBvdGhlcnNcblx0XHRcdHRoaXMuc2VsZWN0ZWRRdWVzdGlvbiA9IG9iamVjdHMuc2VsZWN0ZWRRdWVzdGlvbjtcblx0XHRcdHRoaXMuaGlkZUFsbEV4Y2VwdFNlbGVjdGVkUXVlc3Rpb24oKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kZWwudHJpZ2dlcihcInJlcXVlc3RUb1JldmVhbFNlbGVjdGVkUXVlc3Rpb25cIik7XG5cdFx0fVxuXHR9LFxuXHRoaWRlQWxsRXhjZXB0U2VsZWN0ZWRRdWVzdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIEJ1YmJsZSB1cCB0aGUgZXZlbnRcblx0XHRzZWxmLiRlbC50cmlnZ2VyKFwiaGlkQWxsRXhjZXB0U2VsZWN0ZWRRdWVzdGlvblwiKTtcblx0XHRcblx0XHRfLmVhY2godGhpcy52aWV3cywgZnVuY3Rpb24odmlldykge1xuXHRcdFx0aWYodmlldyA9PSBzZWxmLnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdFx0Ly8gU2F2ZSBjdXJyZW50IG9mZnNldFxuXHRcdFx0XHR2YXIgY3VycmVudE9mZnNldCA9IHZpZXcuJGVsLm9mZnNldCgpO1xuXHRcdFx0XHRcblx0XHRcdFx0dmlldy4kZWwuY3NzKFwicG9zaXRpb25cIiwgXCJhYnNvbHV0ZVwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFNhdmUgZGVzaXJlZCBvZmZzZXRcblx0XHRcdFx0dmFyIGRlc2lyZWRPZmZzZXQgPSB2aWV3LiRlbC5vZmZzZXQoKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZpZXcuJGVsLmNzcyhcInBvc2l0aW9uXCIsIFwicmVsYXRpdmVcIik7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBSZXNldCBwb3NpdGlvbmluZyBhbmQgbW92ZSBxdWVzdGlvblxuXHRcdFx0XHRUd2Vlbk1heC50byh2aWV3LiRlbCwgLjUsIHtcblx0XHRcdFx0XHR0b3A6IGRlc2lyZWRPZmZzZXQudG9wIC0gY3VycmVudE9mZnNldC50b3Bcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBIaWRlIGFsbCBvdGhlciBxdWVzdGlvbnNcblx0XHRcdFx0VHdlZW5NYXgudG8odmlldy4kZWwsIC41LCB7YXV0b0FscGhhOiAwfSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdHJldmVhbEFsbFF1ZXN0aW9uczogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdGlmKHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0Ly8gQnViYmxlIHVwIHRoZSBldmVudFxuXHRcdFx0c2VsZi4kZWwudHJpZ2dlcihcInJldmVhbGVkQWxsUXVlc3Rpb25zXCIpO1xuXHRcdFx0XG5cdFx0XHRfLmVhY2godGhpcy52aWV3cywgZnVuY3Rpb24odmlldykge1xuXHRcdFx0XHQvLyBSZXNldCBjdXN0b20gcXVlc3Rpb25cblx0XHRcdFx0aWYodmlldyBpbnN0YW5jZW9mIEN1c3RvbVF1ZXN0aW9uVmlldykge1xuXHRcdFx0XHRcdHZpZXcuc3RhbGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYodmlldyA9PSBzZWxmLnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdFx0XHRzZWxmLnNlbGVjdGVkUXVlc3Rpb24gPSBudWxsO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFuaW1hdGUgYmFjayB0byBwb3NpdGlvbiwgaWYgbmVlZGVkXG5cdFx0XHRcdFx0aWYoIXZpZXcuJGVsLmlzKFwiOmZpcnN0LWNoaWxkXCIpKSB7XG5cdFx0XHRcdFx0XHRUd2Vlbk1heC50byh2aWV3LiRlbCwgLjUsIHtcblx0XHRcdFx0XHRcdFx0dG9wOiAwLFxuXHRcdFx0XHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRpZih2aWV3IGluc3RhbmNlb2YgQ3VzdG9tUXVlc3Rpb25WaWV3KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLnJlZ2VuZXJhdGVDdXN0b21RdWVzdGlvbigpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIFJldmVhbCBvdGhlciBxdWVzdGlvbnNcblx0XHRcdFx0XHRUd2Vlbk1heC50byh2aWV3LiRlbCwgLjUsIHthdXRvQWxwaGE6IDF9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXHRyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBCcmluZyBjdXJyZW50IG91dCBvZiBwb3NpdGlvblxuXHRcdHZhciBjdXJyZW50ID0gc2VsZi52aWV3cy5zbGljZSgtMSlbMF07XG5cdFx0Y3VycmVudC4kZWwuY3NzKHtcblx0XHRcdHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG5cdFx0XHR0b3A6IGN1cnJlbnQuJGVsLnBvc2l0aW9uKCkudG9wLFxuXHRcdFx0bGVmdDogY3VycmVudC4kZWwucG9zaXRpb24oKS5sZWZ0LFxuXHRcdFx0d2lkdGg6IGN1cnJlbnQuJGVsLm91dGVyV2lkdGgoKSxcblx0XHRcdHpJbmRleDogMTBcblx0XHR9KTtcblx0XHRcblx0XHQvLyBBZGQgaW4gbmV3IG9uZVxuXHRcdHZhciB2aWV3ID0gbmV3IEN1c3RvbVF1ZXN0aW9uVmlldyh7bW9kZWw6IG5ldyBRdWVzdGlvbk1vZGVsKCl9KTtcblx0XHRzZWxmLiRlbC5hcHBlbmQodmlldy5lbCk7XG5cdFx0XG5cdFx0Ly8gUmVtb3ZlIG9sZCB3aGVuIG5ldyBwcmVzZW50XG5cdFx0dmFyIGkgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0XHRcdGlmKGpRdWVyeS5jb250YWlucyhzZWxmLmVsLCB2aWV3LmVsKSkge1xuXHRcdFx0XHRjbGVhckludGVydmFsKGkpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudC5yZW1vdmUoKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIENsZWFudXAgYXJyYXlcblx0XHRcdFx0c2VsZi52aWV3cy5wb3AoKTtcblx0XHRcdFx0c2VsZi52aWV3cy5wdXNoKHZpZXcpO1xuXHRcdFx0fVxuXHRcdH0sIDEpO1xuXHR9XG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0dGFnTmFtZTogXCJsaVwiLFxuXHRjbGFzc05hbWU6IFwiY3VzdG9tXCIsXG5cdHN0YXR1czogXCJzdGFsZVwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9jdXN0b20uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLiRlbC5hcHBlbmQoZGF0YSk7XG5cdFx0XHRzZWxmLiRpbnB1dCA9IHNlbGYuJChcImlucHV0XCIpO1xuXHRcdFx0c2VsZi4kYnV0dG9uID0gc2VsZi4kKFwiYnV0dG9uXCIpO1xuXHRcdFx0c2VsZi4kYnV0dG9uLmNzcyhcImRpc3BsYXlcIiwgXCJub25lXCIpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrXCI6IFwicm91dGVyXCIsXG5cdFx0XCJrZXl1cCBpbnB1dFwiOiBcImtleUhhbmRsZXJcIlxuXHR9LFxuXHRyb3V0ZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHRpZigkKGUudGFyZ2V0KS5pcyh0aGlzLiRidXR0b24pICYmIHRoaXMuJGlucHV0LnZhbCgpICE9PSBcIlwiKSB7XG5cdFx0XHR0aGlzLnNlbGVjdGVkKCk7XG5cdFx0fSBlbHNlIGlmKHRoaXMuc3RhdHVzID09IFwic2VsZWN0ZWRcIikge1xuXHRcdFx0dGhpcy4kZWwudHJpZ2dlcihcInF1ZXN0aW9uQ2xpY2tlZFwiLCB7c2VsZWN0ZWRRdWVzdGlvbjogdGhpc30pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmVkaXRpbmcoKTtcblx0XHR9XG5cdH0sXG5cdGtleUhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHRpZihlLmtleUNvZGUgPT0gMTMpe1xuXHRcdFx0dGhpcy4kYnV0dG9uLmNsaWNrKCk7XG5cdFx0fVxuXHR9LFxuXHRlZGl0aW5nOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5zdGF0dXMgPSBcImVkaXRpbmdcIjtcblx0XHRcblx0XHQvLyBBbGxvdyBlZGl0aW5nXG5cdFx0c2VsZi4kaW5wdXQucHJvcChcInJlYWRvbmx5XCIsIGZhbHNlKS5mb2N1cygpO1xuXHRcdFxuXHRcdC8vIEFuaW1hdGUgaWYgbm90IGFscmVhZHkgZG9uZVxuXHRcdGlmKCFzZWxmLiRlbC5oYXNDbGFzcyhcImZvY3VzZWRcIikpIHtcblx0XHRcdFR3ZWVuTWF4LnRvKHNlbGYuJGVsLCAuNSwge2NsYXNzTmFtZTogXCIrPWZvY3VzZWRcIn0pO1xuXHRcdFx0XG5cdFx0XHRUd2Vlbk1heC5mcm9tVG8oc2VsZi4kYnV0dG9uLCAuNSxcblx0XHRcdFx0e29wYWNpdHk6IDAsIGRpc3BsYXk6IFwiYmxvY2tcIn0sXG5cdFx0XHRcdHtvcGFjaXR5OiAxfVxuXHRcdFx0KTtcblx0XHR9XG5cdH0sXG5cdHNlbGVjdGVkOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5zdGF0dXMgPSBcInNlbGVjdGVkXCI7XG5cdFx0XG5cdFx0Ly8gU2F2ZSBkYXRhIHRvIG1vb2RlbFxuXHRcdHNlbGYubW9kZWwuc2V0KHtcInRleHRcIjogc2VsZi4kaW5wdXQudmFsKCl9KTtcblx0XHRcblx0XHQvLyBEaXNhYmxlIGVkaXRpbmcgYW5kIHNocmlua1xuXHRcdHNlbGYuJGlucHV0LmJsdXIoKS5wcm9wKFwicmVhZG9ubHlcIiwgdHJ1ZSk7XG5cdFx0c2VsZi5zaHJpbmsoKTtcblxuXHRcdC8vIEZpcmUgZXZlbnQgdG8gcGFyZW50XG5cdFx0c2VsZi4kZWwudHJpZ2dlcihcInF1ZXN0aW9uQ2xpY2tlZFwiLCB7c2VsZWN0ZWRRdWVzdGlvbjogc2VsZn0pO1xuXHR9LFxuXHRzdGFsZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kaW5wdXQudmFsKFwiXCIpO1xuXHRcdFxuXHRcdGlmKHRoaXMuc3RhdHVzID09IFwiZWRpdGluZ1wiKSB7XG5cdFx0XHR0aGlzLnNocmluaygpO1xuXHRcdH1cblx0XHRcblx0XHR0aGlzLnN0YXR1cyA9IFwic3RhbGVcIjtcblx0fSxcblx0c2hyaW5rOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC41LCB7Y2xhc3NOYW1lOiBcIi09Zm9jdXNlZFwifSk7XG5cdFx0XG5cdFx0VHdlZW5NYXgudG8oc2VsZi4kYnV0dG9uLCAuNSwge1xuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdGRpc3BsYXk6IFwibm9uZVwiXG5cdFx0fSk7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdHRlbXBsYXRlOiBfLnRlbXBsYXRlKFwiPCU9IHRleHQgJT5cIiksXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGlja1wiOiBcImNsaWNrZWRcIlxuXHR9LFxuXHRjbGlja2VkOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicXVlc3Rpb25DbGlja2VkXCIsIHtzZWxlY3RlZFF1ZXN0aW9uOiB0aGlzfSk7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR1cmw6IFwiaHR0cDovL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hc2tcIixcblx0Ly91cmw6IFwiaHR0cDovL2F0bGRldi5wYXRod2F5LmNvbTozMDAwL2Fza1wiLFxuXHQvL3VybDogXCJodHRwOi8vb21lLWRlbW8ucGF0aHdheS5jb206ODA4MC9hc2tcIixcblx0Y2xhc3NOYW1lOiBcInJlc3BvbnNlXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBHZXQgc3RvcmVkIHJlc3BvbnNlcyBhbmQgc2V0dXBcblx0XHQkLmdldEpTT04oXCIvanMvanNvbi9hbnN3ZXJzLmpzXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuYW5zd2VycyA9IGRhdGE7XG5cdFx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFx0c2VsZi5zZXRUb0xvYWRpbmcoKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNldFRvTG9hZGluZygpO1xuXHRcdHRoaXMuJGVsLmhpZGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayBmb290ZXIgZGl2XCI6IFwibWFya1JhdGVkXCJcblx0fSxcblx0bWFya1JhdGVkOiBmdW5jdGlvbihlKSB7XG5cdFx0JChlLmN1cnJlbnRUYXJnZXQpLnBhcmVudCgpLmZpbmQoXCJkaXZcIikucmVtb3ZlQ2xhc3MoXCJjbGlja2VkXCIpO1xuXHRcdCQoZS5jdXJyZW50VGFyZ2V0KS5hZGRDbGFzcyhcImNsaWNrZWRcIik7XG5cdH0sXG5cdHNldFRvTG9hZGluZzogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWxcblx0XHRcdC5lbXB0eSgpXG5cdFx0XHQuYWRkQ2xhc3MoXCJzcGlubmVyXCIpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoXCJzcGluT3V0XCIpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoXCJtYXBcIilcblx0XHQ7XG5cdH0sXG5cdHByZXBhcmU6IGZ1bmN0aW9uKGFuc3dlcikge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIEFkanVzdCBzaXplIG9mIGFuc3dlciBhcmVhIGJhc2VkIG9uIHF1ZXN0aW9uIHNpemVcblx0XHR2YXIgdG9wID0gYW5zd2VyLiRlbC5wYXJlbnQoKS5vZmZzZXQoKS50b3AgKyA1OCArIDEwO1xuXHRcdHZhciBoZWlnaHQgPSA1MjAgLSA1ODtcblx0XHRcblx0XHRzZWxmLiRlbC5jc3Moe1xuXHRcdFx0ZGlzcGxheTogXCJibG9ja1wiLFxuXHRcdFx0dG9wOiB0b3AsXG5cdFx0XHRoZWlnaHQ6IGhlaWdodFxuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIEZhZGUgaW4gcmVzcG9uc2Vcblx0XHRUd2Vlbk1heC5mcm9tVG8oc2VsZi4kZWwsIC41LCB7b3BhY2l0eTogMH0sIHtvcGFjaXR5OiAxfSk7XG5cdH0sXG5cdGdldDogZnVuY3Rpb24ocGVyc29uLCBxdWVzdGlvbikge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR2YXIgcmVxdWVzdERhdGE7XG5cdFx0c2VsZi5hbnN3ZXIgPSB7fTtcblx0XHRzZWxmLmFuc3dlci5jaWQgPSBwZXJzb24uY2lkO1xuXHRcdHNlbGYuYW5zd2VyLnBlcnNvbklEID0gcGVyc29uLm1vZGVsLmdldChcImlkXCIpO1xuXHRcdHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQgPSBxdWVzdGlvbi5tb2RlbC5nZXQoXCJpZFwiKTtcblx0XHRzZWxmLmFuc3dlci5odG1sID0gXCJcIjtcblx0XHRcblx0XHR2YXIgbnVtYmVyV2l0aENvbW1hcyA9IGZ1bmN0aW9uKHgpIHtcblx0XHRcdHJldHVybiB4LnRvU3RyaW5nKCkucmVwbGFjZSgvXFxCKD89KFxcZHszfSkrKD8hXFxkKSkvZywgXCIsXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBDbGVhciBvbGQgdGltZW91dHMgYW5kIHJlcXVlc3RzXG5cdFx0aWYoc2VsZi5qcXhocikge1xuXHRcdFx0c2VsZi5qcXhoci5hYm9ydCgpO1xuXHRcdH1cblx0XHRpZihzZWxmLnRpbWVvdXQpIHtcblx0XHRcdGNsZWFyVGltZW91dChzZWxmLnRpbWVvdXQpO1xuXHRcdH1cblx0XHRcblx0XHQvLyBDaGVjayBpZiBzdG9yZWQgcmVzcG9uc2Vcblx0XHRpZihzZWxmLmFuc3dlci5xdWVzdGlvbklEIDwgNCkge1xuXHRcdFx0dmFyIGh0bWwgPSBcIlwiO1xuXHRcdFx0XG5cdFx0XHRzd2l0Y2goc2VsZi5hbnN3ZXIucXVlc3Rpb25JRCkge1xuXHRcdFx0XHRjYXNlIDE6XG5cdFx0XHRcdFx0Ly8gR2V0IGZpdG5lc3MgZGF0YSBhYm91dCBwZXJzb25cblx0XHRcdFx0XHRyZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFx0XHRcdFwidXNlcklkXCI6IHNlbGYuYW5zd2VyLnBlcnNvbklELFxuXHRcdFx0XHRcdFx0XCJmaXRuZXNzXCI6IFwidHJ1ZVwiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBHZXQgdGhlIGFuc3dlclxuXHRcdFx0XHRcdHNlbGYuanF4aHIgPSAkLmFqYXgoe1xuXHRcdFx0XHRcdFx0dXJsOiBzZWxmLnVybCxcblx0XHRcdFx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0XHRcdFx0ZGF0YVR5cGU6IFwianNvbnBcIixcblx0XHRcdFx0XHRcdHRpbWVvdXQ6IDE1MDAwXG5cdFx0XHRcdFx0fSkuYWx3YXlzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywganF4aHIpIHtcblx0XHRcdFx0XHRcdGlmKHN0YXR1cyA9PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLmZpdG5lc3MuY29kZSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgcmFuZG9tTnVtYmVyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNik7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHQvLyBHZW5lcmF0ZSByYW5kb20gcmVzcG9uc2Vcblx0XHRcdFx0XHRcdFx0aWYocmFuZG9tTnVtYmVyICE9IDQpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcmFuZG9tUmVzcG9uc2UgPSBzZWxmLmFuc3dlcnNbMF0ucmVzcG9uc2VzW3JhbmRvbU51bWJlcl1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcmFuZG9tUmVzcG9uc2UgPVxuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tyYW5kb21OdW1iZXJdWzBdICtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5sb2NhdGlvbnNbc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXS50aXRsZSArXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucmVzcG9uc2VzW3JhbmRvbU51bWJlcl1bMV0gK1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLmxvY2F0aW9uc1tzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdLmFkZHJlc3MgK1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tyYW5kb21OdW1iZXJdWzJdXG5cdFx0XHRcdFx0XHRcdFx0O1xuXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdC8vIEFzc2lnbiBzaW5nbGUgbG9jYXRpb25cblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnMgPSBbc2VsZi5hbnN3ZXJzWzBdLmxvY2F0aW9uc1tzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0aHRtbCA9XG5cdFx0XHRcdFx0XHRcdFx0cGVyc29uLm1vZGVsLmdldChcIm5hbWVcIikgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1swXSArXG5cdFx0XHRcdFx0XHRcdFx0XCI8c3BhbiBjbGFzcz0naGlnaGxpZ2h0Jz5cIiArIG51bWJlcldpdGhDb21tYXMoZGF0YS5maXRuZXNzLnN1bW1hcnkuY2Fsb3JpZXNPdXQpICsgXCI8L3NwYW4+XCIgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1sxXSArXG5cdFx0XHRcdFx0XHRcdFx0cGVyc29uLm1vZGVsLmdldChcImdvYWxzXCIpICtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlcnNbMF0ucGFydHNbMl0gK1xuXHRcdFx0XHRcdFx0XHRcdHJhbmRvbVJlc3BvbnNlXG5cdFx0XHRcdFx0XHRcdDtcblx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IGh0bWw7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gXCI8cD5Tb3JyeSwgcGxlYXNlIHRyeSBhZ2Fpbi48L3A+XCI7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7fSwgMjUwMCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMjpcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gc2VsZi5hbnN3ZXJzWzFdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0uaHRtbDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgbG9jYXRpb25zID0gc2VsZi5hbnN3ZXJzWzFdW3NlbGYuYW5zd2VyLnBlcnNvbklEIC0gMV0ubG9jYXRpb25zO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkZCBsb2NhdGlvbiBuYW1lcyB0byBodG1sXG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBcIjx1bD5cIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgbG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPGxpPlwiICsgbG9jYXRpb25zW2ldLnRpdGxlICsgXCI8L2xpPlwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPC91bD5cIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnMgPSBsb2NhdGlvbnM7XG5cdFx0XHRcdFx0c2VsZi50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTt9LCAzMDAwKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAzOlxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBzZWxmLmFuc3dlcnNbMl1bc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXTtcblx0XHRcdFx0XHRzZWxmLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImFuc3dlclJlYWR5XCIpO30sIDMwMDApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBUbyBiZSBzZW50IHRvIEFQSVxuXHRcdFx0cmVxdWVzdERhdGEgPSB7XG5cdFx0XHRcdFwidXNlcklkXCI6IDEsIC8vIHNlbGYuYW5zd2VyLnBlcnNvbklELFxuXHRcdFx0XHRcInF1ZXN0aW9uXCI6IHtcblx0XHRcdFx0XHRcInF1ZXN0aW9uVGV4dFwiOiBxdWVzdGlvbi5tb2RlbC5nZXQoXCJ0ZXh0XCIpXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdC8vIEdldCB0aGUgYW5zd2VyXG5cdFx0XHRzZWxmLmpxeGhyID0gJC5hamF4KHtcblx0XHRcdFx0dXJsOiBzZWxmLnVybCxcblx0XHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRcdGRhdGFUeXBlOiBcImpzb25wXCIsXG5cdFx0XHRcdHRpbWVvdXQ6IDE1MDAwXG5cdFx0XHR9KS5hbHdheXMoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCBqcXhocikge1xuXHRcdFx0XHRpZihzdGF0dXMgPT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5hbnN3ZXIuYW5zd2Vyc1swXSkge1xuXHRcdFx0XHRcdGlmKHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQgPT0gNSAmJiBzZWxmLmFuc3dlci5wZXJzb25JRCA9PSAyKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IHNlbGYuYW5zd2Vyc1szXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBkYXRhLmFuc3dlci5hbnN3ZXJzWzBdLmZvcm1hdHRlZFRleHQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IFwiPHA+U29ycnksIHBsZWFzZSB0cnkgYWdhaW4uPC9wPlwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0c2hvdzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gR3JhY2VmdWxseSBoaWRlIHNwaW5uZXJcblx0XHRzZWxmLiRlbC5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFxuXHRcdGlmKHNlbGYuYW5zd2VyLmh0bWwpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxtYWluPlwiICsgc2VsZi5hbnN3ZXIuaHRtbCArIFwiPC9tYWluPlwiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKFwiPG1haW4+PHA+U29ycnksIHBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuPC9wPjwvbWFpbj5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIFNob3cgbWFwIGlmIGxvY2F0aW9ucyBhcmUgYXZhaWxhYmxlXG5cdFx0aWYoc2VsZi5hbnN3ZXIubG9jYXRpb25zKSB7XG5cdFx0XHRzZWxmLiRlbC5hZGRDbGFzcyhcIm1hcFwiKTtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxkaXYgY2xhc3M9J2NvbnRhaW5lcic+PGRpdiBpZD0nbWFwJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0XHRcblx0XHRcdCQuZ2V0SlNPTihcIi9qcy9qc29uL21hcC5qc1wiLCBmdW5jdGlvbihzdHlsZXMpIHtcblx0XHRcdFx0dmFyIHN0eWxlZE1hcCA9IG5ldyBnb29nbGUubWFwcy5TdHlsZWRNYXBUeXBlKFxuXHRcdFx0XHRcdHN0eWxlcyxcblx0XHRcdFx0XHR7bmFtZTogXCJTdHlsZWRcIn1cblx0XHRcdFx0KTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBtYXBPcHRpb25zID0ge1xuXHRcdFx0XHRcdG1hcFR5cGVDb250cm9sT3B0aW9uczoge1xuXHRcdFx0XHRcdFx0bWFwVHlwZUlkczogW2dvb2dsZS5tYXBzLk1hcFR5cGVJZC5ST0FETUFQLCBcIm1hcF9zdHlsZVwiXVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0bWFwVHlwZUNvbnRyb2w6IGZhbHNlLFxuXHRcdFx0XHRcdHN0cmVldFZpZXdDb250cm9sOiBmYWxzZSxcblx0XHRcdFx0XHR6b29tQ29udHJvbDogdHJ1ZSxcblx0XHRcdFx0XHR6b29tQ29udHJvbE9wdGlvbnM6IHtcblx0XHRcdFx0XHRcdHN0eWxlOiBnb29nbGUubWFwcy5ab29tQ29udHJvbFN0eWxlLkxBUkdFLFxuXHRcdFx0XHRcdFx0cG9zaXRpb246IGdvb2dsZS5tYXBzLkNvbnRyb2xQb3NpdGlvbi5MRUZUX1RPUFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBtYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFwXCIpLCBtYXBPcHRpb25zKTtcblx0XHRcdFx0XG5cdFx0XHRcdG1hcC5tYXBUeXBlcy5zZXQoXCJtYXBfc3R5bGVcIiwgc3R5bGVkTWFwKTtcblx0XHRcdFx0bWFwLnNldE1hcFR5cGVJZChcIm1hcF9zdHlsZVwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XG5cdFx0XHRcdHZhciBpbmZvd2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coKTsgIFxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQWRkIG1hcmtlcnNcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IHNlbGYuYW5zd2VyLmxvY2F0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdC8vIEZvcm1hdCB0aXRsZVxuXHRcdFx0XHRcdHZhciBjb250ZW50ID0gXCJcIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZihzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0udGl0bGUpIHtcblx0XHRcdFx0XHRcdGNvbnRlbnQgPSBcIjxkaXYgY2xhc3M9J3RpdGxlJz5cIiArIHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS50aXRsZSArIFwiPC9kaXY+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5kZXNjcmlwdGlvbikge1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSBcIjxkaXYgY2xhc3M9J2Rlc2NyaXB0aW9uJz5cIiArIHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5kZXNjcmlwdGlvbiArIFwiPC9kaXY+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uY29vcmRpbmF0ZXMubGF0dGl0dWRlLFxuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uY29vcmRpbmF0ZXMubG9uZ2l0dWRlXG5cdFx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFx0bWFwOiBtYXAsXG5cdFx0XHRcdFx0XHR0aXRsZTogY29udGVudCxcblx0XHRcdFx0XHRcdHZpc2libGU6IHRydWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvL2V4dGVuZCB0aGUgYm91bmRzIHRvIGluY2x1ZGUgZWFjaCBtYXJrZXIncyBwb3NpdGlvblxuXHRcdFx0XHRcdGJvdW5kcy5leHRlbmQobWFya2VyLnBvc2l0aW9uKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXJrZXIsIFwiY2xpY2tcIiwgKGZ1bmN0aW9uKG1hcmtlciwgaSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRpbmZvd2luZG93LnNldENvbnRlbnQobWFya2VyLnRpdGxlKTtcblx0XHRcdFx0XHRcdFx0aW5mb3dpbmRvdy5vcGVuKG1hcCwgbWFya2VyKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSkobWFya2VyLCBpKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdG1hcC5maXRCb3VuZHMoYm91bmRzKTtcblxuXHRcdFx0XHQvLyBab29tIG91dCBmb3Igc2luZ2xlIGRlc3RpbmF0aW9uIG1hcHNcblx0XHRcdFx0aWYoc2VsZi5hbnN3ZXIubG9jYXRpb25zLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXAsIFwiaWRsZVwiLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRtYXAuc2V0Wm9vbSgxMSk7XG5cdFx0XHRcdFx0XHRnb29nbGUubWFwcy5ldmVudC5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIEFkZCBpbiB0aHVtYnMgdXAgYW5kIGRvd25cblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3Jlc3BvbnNlL2Zvb3Rlci5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHR9KTtcblx0fSxcblx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdFR3ZWVuTWF4LmZyb21UbyhzZWxmLiRlbCwgLjUsIHtvcGFjaXR5OiAxfSwge1xuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdGRpc3BsYXk6IFwibm9uZVwiLFxuXHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuc2V0VG9Mb2FkaW5nKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwidmlldyBoZWxsb1wiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcblx0XHQvLyBCdXR0b24gdG8gZW5kXG5cdFx0c2VsZi4kZWwub25lKFwiY2xpY2tcIiwgXCJidXR0b25cIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJlbmRcIik7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0c2VsZi4kZWwubG9hZChcIi90ZW1wbGF0ZXMvaGVsbG8uaHRtbFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFNpZ25hbCB0byBwYXJlbnRcblx0XHRcdHNlbGYudHJpZ2dlcihcImxvYWRlZFwiKTtcblx0XHR9KTtcblx0XHRcblx0XHRyZXR1cm4gc2VsZjtcblx0fVxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJ2aWV3IGludHJvXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiZW5kXCIpO30sIDcwMDApO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGVsLmxvYWQoXCIvdGVtcGxhdGVzL2ludHJvLmh0bWxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBTaWduYWwgdG8gcGFyZW50XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH1cbn0pOyJdfQ==
