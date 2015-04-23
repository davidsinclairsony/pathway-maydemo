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
		// var url = "http://" + window.location.host + "/ask";
		 var url = "http://atldev.pathway.com:3000/ask";
		// var url = "http://ome-demo.pathway.com:8080/ask";
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
						url: url,
						data: requestData,
						dataType: "jsonp",
						timeout: 15000
					}).always(function(data, status, jqxhr) {
						if(status == "success" && data.fitness.code === 0) {
							html =
								person.model.get("name") +
								self.answers[0].parts[0] +
								"<span class='highlight'>" + numberWithCommas(data.fitness.summary.caloriesOut) + "</span>" +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9jb2xsZWN0aW9ucy9wZW9wbGUuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9jb2xsZWN0aW9ucy9xdWVzdGlvbnMuanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC9tb2RlbHMvcGVyc29uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvcm91dGVyLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Blb3BsZS5qcyIsIm5vZGVfbW9kdWxlcy9vbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy5qcyIsIm5vZGVfbW9kdWxlcy9vbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9xdWVzdGlvbnMvY3VzdG9tUXVlc3Rpb24uanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL3F1ZXN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3Jlc3BvbnNlLmpzIiwibm9kZV9tb2R1bGVzL29tZS9hcHAvdmlld3MvaGVsbG8uanMiLCJub2RlX21vZHVsZXMvb21lL2FwcC92aWV3cy9pbnRyby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEFwcFZpZXcgPSByZXF1aXJlKFwib21lL2FwcFwiKTtcblxuLy9cdEluaXRpYXRpb25cbiQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCkge1xuXHQvLyBUaW1lciBjb2RlXG5cdHZhciByZWZyZXNoVGltZSA9IDA7XG5cdHZhciByZWZyZXNoVGltZXIgPSBmdW5jdGlvbigpIHtcblx0XHRpZihyZWZyZXNoVGltZSA+IDkwKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZShcIi9cIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlZnJlc2hUaW1lKys7XG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3JlZnJlc2hUaW1lcigpO30sIDEwMDApO1xuXHRcdH1cblx0fTtcblx0XG5cdC8vIFN0YXJ0IHRpbWVyXG5cdC8vIHJlZnJlc2hUaW1lcigpO1xuXHRcblx0JChkb2N1bWVudCkub24oXCJ0b3VjaHN0YXJ0IG1vdXNlZG93blwiLCBmdW5jdGlvbihlKSB7XG5cdFx0Ly8gUHJldmVudCBzY3JvbGxpbmcgb24gYW55IHRvdWNoZXMgdG8gc2NyZWVuXG5cdFx0JCh0aGlzKS5wcmV2ZW50U2Nyb2xsaW5nKGUpO1xuXHRcdFxuXHRcdC8vIFJlc2V0IHRpbWVcblx0XHRyZWZyZXNoVGltZSA9IDA7XG5cdH0pO1xuXHRcblx0Ly8gRmFzdCBjbGlja3MgZm9yIHRvdWNoIHVzZXJzXG5cdEZhc3RDbGljay5hdHRhY2goZG9jdW1lbnQuYm9keSk7XG5cdFxuXHQvLyBTdGFydCFcblx0d2luZG93LmFwcCA9IG5ldyBBcHBWaWV3KCk7XG59KTsiLCJ2YXIgSW50cm9WaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvaW50cm9cIik7XG52YXIgSGVsbG9WaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvaGVsbG9cIik7XG52YXIgQ29udmVyc2F0aW9uVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvblwiKTtcbnZhciBSb3V0ZXIgPSByZXF1aXJlKFwib21lL2FwcC9yb3V0ZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRlbDogXCIjYXBwXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQvLyBTdGFydCByb3V0ZXIgd2l0aCBwcmVkZWZpbmVkIHJvdXRlc1xuXHRcdHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuXHRcdFxuXHRcdC8vIFJvdXRlIGFjdGlvbnNcblx0XHR0aGlzLnJvdXRlci5vbihcInJvdXRlOmludHJvXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHZpZXcgPSBuZXcgSW50cm9WaWV3KCk7XG5cdFx0XHRcblx0XHRcdHNlbGYuZ29Ubyh2aWV3KTtcblx0XHRcdFxuXHRcdFx0Ly8gTGlzdGVuIGZvciBlbmQgb2Ygdmlld1xuXHRcdFx0c2VsZi5saXN0ZW5Ub09uY2UodmlldywgXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYucm91dGVyLm5hdmlnYXRlKFwiaGVsbG9cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHRoaXMucm91dGVyLm9uKFwicm91dGU6aGVsbG9cIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdmlldyA9IG5ldyBIZWxsb1ZpZXcoKTtcblx0XHRcdFxuXHRcdFx0c2VsZi5nb1RvKHZpZXcpO1xuXHRcdFx0XG5cdFx0XHQvLyBMaXN0ZW4gZm9yIGVuZCBvZiB2aWV3XG5cdFx0XHRzZWxmLmxpc3RlblRvT25jZSh2aWV3LCBcImVuZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5yb3V0ZXIubmF2aWdhdGUoXCJjb252ZXJzYXRpb25cIiwge3RyaWdnZXI6IHRydWV9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHRoaXMucm91dGVyLm9uKFwicm91dGU6Y29udmVyc2F0aW9uXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGNvbnZlcnNhdGlvblZpZXcgPSBuZXcgQ29udmVyc2F0aW9uVmlldygpO1xuXHRcdFx0XG5cdFx0XHRzZWxmLmdvVG8oY29udmVyc2F0aW9uVmlldyk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0Ly8gU3RhcnQgdHJhY2tpbmdcblx0XHRCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWV9KTtcblx0fSxcblx0ZXZlbnRzOiB7XG5cdFx0XCJjbGljayAucmVmcmVzaFwiOiBcInJlZnJlc2hcIlxuXHR9LFxuXHRyZWZyZXNoOiBmdW5jdGlvbigpIHtcblx0XHR3aW5kb3cubG9jYXRpb24ucmVwbGFjZShcIi9cIik7XG5cdH0sXG5cdGdvVG86IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIHByZXZpb3VzID0gdGhpcy5jdXJyZW50VmlldyB8fCBudWxsO1xuXHRcdHZhciBuZXh0ID0gdmlldztcblx0XHRcblx0XHQvLyBIaWRlIHRoZSBjdXJyZW50IHZpZXdcblx0XHRpZihwcmV2aW91cykge1xuXHRcdFx0VHdlZW5NYXgudG8ocHJldmlvdXMuJGVsLCAuNSwge1xuXHRcdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0XHRvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtwcmV2aW91cy5yZW1vdmUoKTt9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0Ly8gQWRkICwgaGlkZSwgYW5kIHdhaXQgdW50aWwgbG9hZGVkXG5cdFx0c2VsZi5jdXJyZW50VmlldyA9IG5leHQ7XG5cdFx0c2VsZi4kZWwuYXBwZW5kKG5leHQuZWwpO1xuXHRcdG5leHQuJGVsLmhpZGUoKTtcblx0XHRcblx0XHRzZWxmLmxpc3RlblRvT25jZShuZXh0LCBcImxvYWRlZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFdhaXQgZm9yIGltYWdlcyBhbmQgcmV2ZWFsXG5cdFx0XHRuZXh0LiRlbC53YWl0Rm9ySW1hZ2VzKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLiRlbC5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0XHRuZXh0LiRlbC5zaG93KCk7XG5cdFx0XHRcdFR3ZWVuTWF4LmZyb20obmV4dC4kZWwsIC41LCB7b3BhY2l0eTogMH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG59KTsiLCJ2YXIgUGVyc29uTW9kZWwgPSByZXF1aXJlKFwib21lL2FwcC9tb2RlbHMvcGVyc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0bW9kZWw6IFBlcnNvbk1vZGVsXG59KTsiLCJ2YXIgUXVlc3Rpb25Nb2RlbCA9IHJlcXVpcmUoXCJvbWUvYXBwL21vZGVscy9xdWVzdGlvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdG1vZGVsOiBRdWVzdGlvbk1vZGVsXG59KTsiLCJtb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7fSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcblx0cm91dGVzOiB7XG5cdFx0XCJcIjogXCJpbnRyb1wiLFxuXHRcdFwiaGVsbG9cIjogXCJoZWxsb1wiLFxuXHRcdFwiY29udmVyc2F0aW9uXCI6IFwiY29udmVyc2F0aW9uXCIsXG5cdFx0JyplcnJvcic6ICdlcnJvcidcblx0fVxufSk7IiwidmFyIFBlb3BsZVZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcGVvcGxlXCIpO1xudmFyIFF1ZXN0aW9uc1ZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zXCIpO1xudmFyIFJlc3BvbnNlVmlldyA9IHJlcXVpcmUoXCJvbWUvYXBwL3ZpZXdzL2NvbnZlcnNhdGlvbi9yZXNwb25zZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJ2aWV3IGNvbnZlcnNhdGlvblwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHRcdFxuXHRcdC8vIENoaWxkIHZpZXdzXG5cdFx0dGhpcy5wZW9wbGVWaWV3ID0gbmV3IFBlb3BsZVZpZXcoKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5wZW9wbGVWaWV3LmVsKTtcblx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcgPSBuZXcgUXVlc3Rpb25zVmlldygpO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCh0aGlzLnF1ZXN0aW9uc1ZpZXcuZWwpO1xuXHRcdHRoaXMucmVzcG9uc2VWaWV3ID0gbmV3IFJlc3BvbnNlVmlldygpO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCh0aGlzLnJlc3BvbnNlVmlldy5lbCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHRcdHNlbGYuJGVsLmhhbW1lcih7ZG9tRXZlbnRzOiB0cnVlfSk7XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2sgLmFza1wiOiBcImFza0Fub3RoZXJRdWVzdGlvblwiLFxuXHRcdFwiY2xpY2sgLmhvdywgZm9vdGVyIC5jbG9zZVwiOiBcImhvd1RvZ2dsZXJcIixcblx0XHRcInJlcXVlc3RUb1JldmVhbFNlbGVjdGVkUXVlc3Rpb25cIjogXCJhc2tBbm90aGVyUXVlc3Rpb25cIixcblx0XHRcImhpZEFsbEV4Y2VwdFNlbGVjdGVkUXVlc3Rpb25cIjogXCJwcmVwYXJlRm9yUmVzcG9uc2VcIixcblx0XHRcInJldmVhbGVkQWxsUXVlc3Rpb25zXCI6IFwiaGlkZVJlc3BvbnNlXCIsXG5cdFx0XCJkYXRhU291cmNlZFwiOiBcImdldEFuZFNob3dSZXNwb25zZVwiLFxuXHRcdFwicGFuc3RhcnRcIjogXCJwYW5IYW5kbGVyXCIsXG5cdFx0XCJwYW5cIjogXCJwYW5IYW5kbGVyXCIsXG5cdFx0XCJzd2lwZWRcIjogXCJzd2lwZUhhbmRsZXJcIixcblx0fSxcblx0cGFuSGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdC8vIFByZXZlbnQgcGFuL3N3aXBlIG9uIHJlc3BvbnNlIHZpZXcgYW5kIG1vZGFsXG5cdFx0aWYoXG5cdFx0XHRlLm9yaWdpbmFsRXZlbnQgJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLnJlc3BvbnNlXCIpLmxlbmd0aCAmJlxuXHRcdFx0ISQoZS50YXJnZXQpLmhhc0NsYXNzKFwicmVzcG9uc2VcIikgJiZcblx0XHRcdCEkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLm1vZGFsXCIpLmxlbmd0aCAmJlxuXHRcdFx0ISQoZS50YXJnZXQpLmhhc0NsYXNzKFwibW9kYWxcIilcblx0XHQpIHtcblx0XHRcdHRoaXMucGVvcGxlVmlldy5wYW5IYW5kbGVyKGUpO1xuXHRcdH1cblx0fSxcblx0c3dpcGVIYW5kbGVyOiBmdW5jdGlvbihldmVudCwgb2JqZWN0cykge1xuXHRcdHRoaXMucGVvcGxlVmlldy5zd2lwZUhhbmRsZXIob2JqZWN0cy5ldmVudCk7XG5cdFx0XG5cdFx0aWYodGhpcy5xdWVzdGlvbnNWaWV3LnNlbGVjdGVkUXVlc3Rpb24pIHtcblx0XHRcdC8vIFJlc2V0IHJlc3BvbnNlIHZpZXdcblx0XHRcdHRoaXMucmVzcG9uc2VWaWV3LnNldFRvTG9hZGluZygpO1xuXHRcdFx0XG5cdFx0XHQvLyBQcmVwYXJlIGZvciByZXNwb25zZVxuXHRcdFx0dGhpcy5wcmVwYXJlRm9yUmVzcG9uc2UoKTtcblx0XHR9XG5cdH0sXG5cdGhvd1RvZ2dsZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciAka25vdyA9IHRoaXMuJChcIi5rbm93XCIpO1xuXHRcdFxuXHRcdCRrbm93LnRvZ2dsZUNsYXNzKFwib2ZmXCIsICRrbm93Lmhhc0NsYXNzKFwib25cIikpO1xuXHRcdCRrbm93LnRvZ2dsZUNsYXNzKFwib25cIiwgISRrbm93Lmhhc0NsYXNzKFwib25cIikpO1xuXHR9LFxuXHRhc2tBbm90aGVyUXVlc3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucXVlc3Rpb25zVmlldy5yZXZlYWxBbGxRdWVzdGlvbnMoKTtcblx0fSxcblx0cHJlcGFyZUZvclJlc3BvbnNlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnJlc3BvbnNlVmlldy5wcmVwYXJlKHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uKTtcblx0XHRUd2Vlbk1heC50byh0aGlzLiQoXCIubG93ZXJcIiksIC41LCB7b3BhY2l0eTogMX0pO1xuXHRcdFxuXHRcdC8vIFRoaXMgd2lsbCBzdGFydCB0aGUgY2hpY2xldHMgbG9hZGluZ1xuXHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbi5vYnRhaW5EYXRhKCk7XG5cdH0sXG5cdGdldEFuZFNob3dSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0Ly8gQ2xlYXIgcHJldmlvdXMgbGlzdGVuc1xuXHRcdHRoaXMuc3RvcExpc3RlbmluZyh0aGlzLnJlc3BvbnNlVmlldywgXCJhbnN3ZXJSZWFkeVwiKTtcblx0XHRcblx0XHQvLyBMaXN0ZW4gZm9yIHdoZW4gdGhlIGFuc3dlciBpcyByZWFkeSB0byBkaXNwbGF5XG5cdFx0dGhpcy5saXN0ZW5Ub09uY2UodGhpcy5yZXNwb25zZVZpZXcsIFwiYW5zd2VyUmVhZHlcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBDaGVjayBpZiBzdGlsbCB0aGUgY3VycmVudCBxdWVzdGlvbiBhbmQgcGVyc29uXG5cdFx0XHRpZihcblx0XHRcdFx0dGhpcy5wZW9wbGVWaWV3LnNlbGVjdGVkUGVyc29uICYmXG5cdFx0XHRcdHRoaXMucXVlc3Rpb25zVmlldy5zZWxlY3RlZFF1ZXN0aW9uICYmXG5cdFx0XHRcdHRoaXMucGVvcGxlVmlldy5zZWxlY3RlZFBlcnNvbi5jaWQgPT0gdGhpcy5yZXNwb25zZVZpZXcuYW5zd2VyLmNpZCAmJlxuXHRcdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvbi5tb2RlbC5nZXQoXCJpZFwiKSA9PSB0aGlzLnJlc3BvbnNlVmlldy5hbnN3ZXIucXVlc3Rpb25JRFxuXHRcdFx0KSB7XG5cdFx0XHRcdHRoaXMucmVzcG9uc2VWaWV3LnNob3coKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLnJlc3BvbnNlVmlldy5nZXQoXG5cdFx0XHR0aGlzLnBlb3BsZVZpZXcuc2VsZWN0ZWRQZXJzb24sXG5cdFx0XHR0aGlzLnF1ZXN0aW9uc1ZpZXcuc2VsZWN0ZWRRdWVzdGlvblxuXHRcdCk7XG5cdH0sXG5cdGhpZGVSZXNwb25zZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZXNwb25zZVZpZXcuaGlkZSgpO1xuXHRcdFR3ZWVuTWF4LnRvKHRoaXMuJChcIi5sb3dlclwiKSwgLjUsIHtvcGFjaXR5OiAwfSk7XG5cdH1cbn0pOyIsInZhciBQZW9wbGVDb2xsZWN0aW9uID0gcmVxdWlyZShcIm9tZS9hcHAvY29sbGVjdGlvbnMvcGVvcGxlXCIpO1xudmFyIFBlcnNvblZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcGVvcGxlL3BlcnNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJwZW9wbGVcIixcblx0dGFnTmFtZTogXCJ1bFwiLFxuXHRzd2lwZVRocmVzaG9sZDogMTI1LFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0JC5nZXRKU09OKFwiL2pzL2pzb24vcGVvcGxlLmpzXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYucGVvcGxlQ29sbGVjdGlvbiA9IG5ldyBQZW9wbGVDb2xsZWN0aW9uKGRhdGEpO1xuXHRcdFx0c2VsZi52aWV3cyA9IFtdO1xuXHRcdFx0XG5cdFx0XHQvLyBDcmVhdGUgY3VycmVudCBzZWxlY3RlZCBwZXJzb24gdmlld1xuXHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBQZXJzb25WaWV3KHttb2RlbDogc2VsZi5wZW9wbGVDb2xsZWN0aW9uLmZpcnN0KCl9KSk7XG5cdFx0XHRcblx0XHRcdC8vIFNldCBzZWxlY3RlZCBwZXJzb24gdG8gY2VudGVyXG5cdFx0XHRzZWxmLnNldFNlbGVjdGVkUGVyc29uKHNlbGYudmlld3NbMF0pO1xuXHRcdFx0XG5cdFx0XHQvLyBEcmF3IHBlb3BsZVxuXHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHQvLyBBZGQgc2VsZWN0ZWQgcGVyc29uXG5cdFx0dGhpcy4kZWwuaHRtbCh0aGlzLnZpZXdzWzBdLmVsKTtcblxuXHRcdC8vIEFkZCB0aGUgb3RoZXJzIGFyb3VuZFxuXHRcdHRoaXMucGFkKCk7XG5cdFx0XG5cdFx0Ly8gU2V0IGVuZGluZyBwb3NpdGlvblxuXHRcdHRoaXMucG9zaXRpb25MZWZ0ID0gLTExOTY7XG5cblx0XHRyZXR1cm4gc2VsZjtcblx0fSxcblx0c2V0U2VsZWN0ZWRQZXJzb246IGZ1bmN0aW9uKHZpZXcpIHtcblx0XHQvLyBUdXJuIG9mZiBjdXJyZW50IHNlbGVjdGVkIHBlcnNvblxuXHRcdGlmKHRoaXMuc2VsZWN0ZWRQZXJzb24pIHtcblx0XHRcdHRoaXMuc2VsZWN0ZWRQZXJzb24uc2VsZWN0ZWQgPSBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5zZWxlY3RlZFBlcnNvbiA9IHZpZXc7XG5cdFx0dmlldy5zZWxlY3RlZCA9IHRydWU7XG5cdH0sXG5cdHBhZDogZnVuY3Rpb24oKSB7XG5cdFx0Ly8gUGFkcyB0byA1IGVsZW1lbnRzIHRvdGFsLCBhcm91bmQgdGhlIHNlbGVjdGVkIHBlcnNvblxuXHRcdFxuXHRcdC8vIEdldCBsb2NhdGlvbiBpbiB2aWV3cyBvZiBzZWxlY3RlZCBwZXJzb25cblx0XHR2YXIgaW5kZXhPZlNlbGVjdGVkUGVyc29uID0gdGhpcy52aWV3cy5pbmRleE9mKHRoaXMuc2VsZWN0ZWRQZXJzb24pO1xuXHRcdHZhciBpLCBtb2RlbEluZGV4LCBtb2RlbCwgdmlldztcblx0XHRcblx0XHQvLyBHZW5lcmF0ZSBhbmQgYWRkIHZpZXdzIGJlZm9yZSB0aGUgc2VsZWN0ZWQgcGVyc29uXG5cdFx0d2hpbGUoaW5kZXhPZlNlbGVjdGVkUGVyc29uIDwgMikge1xuXHRcdFx0Ly8gR2V0IGluZGV4IG9mIGZpcnN0IHZpZXdcblx0XHRcdG1vZGVsSW5kZXggPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uaW5kZXhPZih0aGlzLnZpZXdzWzBdLm1vZGVsKTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZXJtaW5lIHdoaWNoIG1vZGVsIHRvIHVzZVxuXHRcdFx0aWYobW9kZWxJbmRleCA9PT0gMCkge1xuXHRcdFx0XHRtb2RlbCA9ICB0aGlzLnBlb3BsZUNvbGxlY3Rpb24ubGFzdCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bW9kZWwgPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uYXQobW9kZWxJbmRleCAtIDEpO1xuXHRcdFx0fVxuXG5cdFx0XHR2aWV3ID0gbmV3IFBlcnNvblZpZXcoe21vZGVsOiBtb2RlbH0pO1xuXHRcdFx0dGhpcy52aWV3cy51bnNoaWZ0KHZpZXcpO1xuXHRcdFx0dGhpcy4kZWwucHJlcGVuZCh2aWV3LmVsKTtcblx0XHRcdFxuXHRcdFx0aW5kZXhPZlNlbGVjdGVkUGVyc29uID0gdGhpcy52aWV3cy5pbmRleE9mKHRoaXMuc2VsZWN0ZWRQZXJzb24pO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHQvLyBBZGQgdmlld3MgZm9yIGFmdGVyIHRoZSBzZWxlY3RlZCBwZXJzb25cblx0XHR3aGlsZSh0aGlzLnZpZXdzLmxlbmd0aCA8IDUpIHtcblx0XHRcdC8vIEdldCBpbmRleCBvZiBsYXN0IHZpZXdcblx0XHRcdG1vZGVsSW5kZXggPSB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uaW5kZXhPZihfLmxhc3QodGhpcy52aWV3cykubW9kZWwpO1xuXHRcdFx0XG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hpY2ggbW9kZWwgdG8gdXNlXG5cdFx0XHRpZihtb2RlbEluZGV4ID09IF8uc2l6ZSh0aGlzLnBlb3BsZUNvbGxlY3Rpb24pIC0gMSkge1xuXHRcdFx0XHRtb2RlbCA9ICB0aGlzLnBlb3BsZUNvbGxlY3Rpb24uZmlyc3QoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1vZGVsID0gdGhpcy5wZW9wbGVDb2xsZWN0aW9uLmF0KG1vZGVsSW5kZXggKyAxKTtcblx0XHRcdH1cblxuXHRcdFx0dmlldyA9IG5ldyBQZXJzb25WaWV3KHttb2RlbDogbW9kZWx9KTtcblx0XHRcdHRoaXMudmlld3MucHVzaCh2aWV3KTtcblx0XHRcdHRoaXMuJGVsLmFwcGVuZCh2aWV3LmVsKTtcblx0XHR9XG5cdH0sXG5cdHBhbkhhbmRsZXI6IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRpZihlLm9yaWdpbmFsRXZlbnQuZ2VzdHVyZS5pc0ZpbmFsKSB7XG5cdFx0XHQvLyBGaXJlIGV2ZW50IHRvIHBhcmVudCBpZiBzd2lwZSwgb3RoZXJ3aXNlIHNuYXAgYmFja1xuXHRcdFx0aWYoXG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWCA8IC1zZWxmLnN3aXBlVGhyZXNob2xkIHx8XG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWCA+IHNlbGYuc3dpcGVUaHJlc2hvbGQpXG5cdFx0XHR7XG5cdFx0XHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJzd2lwZWRcIiwge2V2ZW50OiBlfSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjEsIHtsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdH0pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBGaW5kIG5ldyBwb3NpdGlvbiBhbmQgbW92ZVxuXHRcdFx0dmFyIGxlZnQgPSBzZWxmLnBvc2l0aW9uTGVmdCArIGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWDtcblx0XHRcdHNlbGYuJGVsLmNzcyh7bGVmdDogbGVmdH0pO1xuXHRcdH1cblx0fSxcblx0c3dpcGVIYW5kbGVyOiBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBjdXJyZW50SW5kZXggPSBzZWxmLnZpZXdzLmluZGV4T2Yoc2VsZi5zZWxlY3RlZFBlcnNvbik7XG5cdFx0XG5cdFx0Ly8gRGV0ZXJtaW5lIHN3aXBlIGRpcmVjdGlvblxuXHRcdGlmKGUub3JpZ2luYWxFdmVudC5nZXN0dXJlLmRlbHRhWCA8IDApIHtcblx0XHRcdC8vIFNldCB0byBmb3J3YXJkIG9uZVxuXHRcdFx0c2VsZi5zZXRTZWxlY3RlZFBlcnNvbihzZWxmLnZpZXdzW2N1cnJlbnRJbmRleCArIDFdKTtcblx0XHRcdFxuXHRcdFx0Ly8gQW5pbWF0ZSB0byBjb3JyZWN0IHBvc2l0aW9uXG5cdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjEsIHtcblx0XHRcdFx0bGVmdDogc2VsZi5wb3NpdGlvbkxlZnQgLSA2NDAsXG5cdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgYXNwZWN0cyBvZiBlZGdlIHZpZXdcblx0XHRcdFx0XHRfLmZpcnN0KHNlbGYudmlld3MpLnJlbW92ZSgpO1xuXHRcdFx0XHRcdHNlbGYudmlld3Muc2hpZnQoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBBZGQgaW4gbmV3XG5cdFx0XHRcdFx0c2VsZi5wYWQoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBSZXNldCBtYXJnaW5zXG5cdFx0XHRcdFx0c2VsZi4kKFwiPiBsaTpmaXJzdC1jaGlsZFwiKS5jc3Moe21hcmdpbkxlZnQ6IDB9KTtcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOm50aC1jaGlsZChuICsgMilcIikuY3NzKHttYXJnaW5MZWZ0OiBcIjQwcHhcIn0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkanVzdCBwb3NpdGlvbmluZ1xuXHRcdFx0XHRcdHNlbGYuJGVsLmNzcyh7bGVmdDogc2VsZi5wb3NpdGlvbkxlZnR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNldCB0byBiYWNrIG9uZVxuXHRcdFx0c2VsZi5zZXRTZWxlY3RlZFBlcnNvbihzZWxmLnZpZXdzW2N1cnJlbnRJbmRleCAtIDFdKTtcblx0XHRcdFxuXHRcdFx0Ly8gQW5pbWF0ZSB0byBjb3JyZWN0IHBvc2l0aW9uXG5cdFx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjEsIHtcblx0XHRcdFx0bGVmdDogc2VsZi5wb3NpdGlvbkxlZnQgKyA2NDAsXG5cdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGFsbCBhc3BlY3RzIG9mIGVkZ2Ugdmlld1xuXHRcdFx0XHRcdF8ubGFzdChzZWxmLnZpZXdzKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRzZWxmLnZpZXdzLnBvcCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEFkZCBpbiBuZXdcblx0XHRcdFx0XHRzZWxmLnBhZCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFJlc2V0IG1hcmdpbnNcblx0XHRcdFx0XHRzZWxmLiQoXCI+IGxpOmZpcnN0LWNoaWxkXCIpLmNzcyh7bWFyZ2luTGVmdDogMH0pO1xuXHRcdFx0XHRcdHNlbGYuJChcIj4gbGk6bnRoLWNoaWxkKG4gKyAyKVwiKS5jc3Moe21hcmdpbkxlZnQ6IFwiNDBweFwifSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRqdXN0IHBvc2l0aW9uaW5nXG5cdFx0XHRcdFx0c2VsZi4kZWwuY3NzKHtsZWZ0OiBzZWxmLnBvc2l0aW9uTGVmdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3Blb3BsZS9wZXJzb24uaHRtbFwiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLnRlbXBsYXRlID0gXy50ZW1wbGF0ZShkYXRhKTtcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JC5nZXQoXCIvdGVtcGxhdGVzL2NvbnZlcnNhdGlvbi9wZW9wbGUvcGVyc29uL21vZGFsLmh0bWxcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5tb2RhbFRlbXBsYXRlID0gXy50ZW1wbGF0ZShkYXRhKTtcblx0XHR9KTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrIC5waWN0dXJlXCI6IFwicG9wdXBIYW5kbGVyXCIsXG5cdFx0XCJjbGljayAuc291cmNlcyBsaVwiOiBcInBvcHVwSGFuZGxlclwiLFxuXHRcdFwiY2xpY2sgLnBvcHVwIGJ1dHRvblwiOiBcInJlcG9ydFRvZ2dsZXJcIixcblx0XHRcImNsaWNrIC5tb2RhbCBidXR0b25cIjogXCJyZXBvcnRUb2dnbGVyXCJcblx0fSxcblx0cmVwb3J0VG9nZ2xlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyICRtb2RhbCA9IHRoaXMuJGVsLmZpbmQoXCIubW9kYWxcIik7XG5cdFx0XG5cdFx0Ly8gQ3JlYXRlIG1vZGFsIGlmIG5lZWRlZCwgb3RoZXJ3aXNlIHJlbW92ZVxuXHRcdGlmKCEkbW9kYWwubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLiRlbC5hcHBlbmQodGhpcy5tb2RhbFRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcblx0XHRcdCRtb2RhbCA9IHRoaXMuJGVsLmZpbmQoXCIubW9kYWxcIik7XG5cdFx0XHQkbW9kYWxJbm5lciA9ICRtb2RhbC5maW5kKFwiPiBkaXZcIik7XG5cdFx0XHQkbW9kYWxJbm5lci5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdFx0XG5cdFx0XHQkbW9kYWxJbm5lci53YWl0Rm9ySW1hZ2VzKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkbW9kYWwucmVtb3ZlQ2xhc3MoXCJzcGlubmVyXCIpLmFkZENsYXNzKFwic3Bpbk91dFwiKTtcblx0XHRcdFx0VHdlZW5NYXguZnJvbVRvKCRtb2RhbElubmVyLCAuNSxcblx0XHRcdFx0XHR7b3BhY2l0eTogMCwgdmlzaWJpbGl0eTogXCJ2aXNpYmxlXCJ9LFxuXHRcdFx0XHRcdHtvcGFjaXR5OiAxLCBvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCRtb2RhbC5yZW1vdmVDbGFzcyhcInNwaW5PdXRcIik7XG5cdFx0XHRcdFx0fX1cblx0XHRcdFx0KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBQcmV2ZW50IGJhY2tncm91bmQgY2xpY2tzXG5cdFx0XHQkbW9kYWwub24oXCJ0b3VjaHN0YXJ0IG1vdXNlZG93biBjbGlja1wiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdGlmKCEkKGUudGFyZ2V0KS5pcygkbW9kYWwuZmluZChcImJ1dHRvblwiKSkpIHtcblx0XHRcdFx0XHRlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VHdlZW5NYXgudG8oJG1vZGFsLCAuNSwge29wYWNpdHk6IDAsIG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkbW9kYWwucmVtb3ZlKCk7XG5cdFx0XHR9fSk7XG5cdFx0fVxuXHR9LFxuXHRvYnRhaW5EYXRhOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi4kKFwibGkuYXZhaWxhYmxlXCIpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJHRoaXMgPSAkKHRoaXMpO1xuXHRcdFx0XG5cdFx0XHQkdGhpcy5yZW1vdmVDbGFzcyhcInNwaW5PdXRcIikuYWRkQ2xhc3MoXCJzcGlubmVyXCIpO1xuXG5cdFx0XHQvLyBEYXRhIG9idGFpbmVkIGFmdGVyIHJhbmRvbSB0aW1lXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkdGhpcy5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFx0fSwgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjAwMCArIDEwMDApKTtcblx0XHR9KTtcblx0XHRcblx0XHQvLyBTaWduYWwgdG8gcGFyZW50IGRhdGEgaXMgcmVhZHlcblx0XHRzZWxmLiRlbC50cmlnZ2VyKFwiZGF0YVNvdXJjZWRcIik7XG5cdH0sXG5cdHBvcHVwSGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdC8vIENoZWNrIGlmIGN1cnJlbnQgcGVyc29uIGJlaW5nIGNsaWNrZWQgb25cblx0XHRpZih0aGlzLnNlbGVjdGVkKSB7XG5cdFx0XHRlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dmFyICRuZXdQb3B1cCA9ICQoZS50YXJnZXQpLnNpYmxpbmdzKFwiLnBvcHVwXCIpO1xuXHRcdFx0XG5cdFx0XHRpZighc2VsZi4kcG9wdXApIHtcblx0XHRcdFx0dGhpcy5wb3B1cFNob3dlcigkbmV3UG9wdXApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIGlzU2FtZUFzQ3VycmVudCA9IHNlbGYuJHBvcHVwLmlzKCRuZXdQb3B1cCk7XG5cblx0XHRcdFx0Ly8gSGlkZSBjdXJyZW50IHBvcHVwXG5cdFx0XHRcdHRoaXMucG9wdXBSZW1vdmVyKHNlbGYuJHBvcHVwKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmKCFpc1NhbWVBc0N1cnJlbnQpIHtcblx0XHRcdFx0XHQvLyBTaG93IG5ld1xuXHRcdFx0XHRcdHNlbGYuJHBvcHVwID0gJG5ld1BvcHVwO1xuXHRcdFx0XHRcdHRoaXMucG9wdXBTaG93ZXIoc2VsZi4kcG9wdXApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRwb3B1cFJlbW92ZXI6IGZ1bmN0aW9uKCRwKSB7XG5cdFx0dGhpcy4kcG9wdXAgPSBudWxsO1xuXHRcdFxuXHRcdC8vIEZhZGUgYW5kIGhpZGUgcG9wdXBcblx0XHRUd2Vlbk1heC50bygkcCwgLjUsIHtcblx0XHRcdG9wYWNpdHk6IDAsXG5cdFx0XHRkaXNwbGF5OiBcIm5vbmVcIixcblx0XHRcdG92ZXJ3cml0ZTogXCJhbGxcIlxuXHRcdH0pO1xuXG5cdFx0Ly8gVHVybiBvZmYgbGlzdGVuZXJcblx0XHQkKFwiYm9keVwiKS5vZmYoXCJ0b3VjaGVuZCBjbGlja1wiKTtcblx0fSxcblx0cG9wdXBTaG93ZXI6IGZ1bmN0aW9uKCRwKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJHBvcHVwID0gJHA7XG5cdFx0XG5cdFx0Ly8gU2hvdyBhbmQgZmFkZSBpblxuXHRcdFR3ZWVuTWF4LmZyb21UbygkcCwgLjUsXG5cdFx0XHR7b3BhY2l0eTogMCwgZGlzcGxheTogXCJibG9ja1wifSxcblx0XHRcdHtvcGFjaXR5OiAxLCBvdmVyd3JpdGU6IFwiYWxsXCJ9XG5cdFx0KTtcblx0XHRcblx0XHQvLyBMaXN0ZW4gZm9yIGFueXRoaW5nIHRvIHR1cm4gb2ZmXG5cdFx0JChcImJvZHlcIikub25lKFwidG91Y2hlbmQgY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLnBvcHVwUmVtb3ZlcigkcCk7XG5cdFx0fSk7XG5cdH1cbn0pOyIsInZhciBRdWVzdGlvbk1vZGVsID0gcmVxdWlyZShcIm9tZS9hcHAvbW9kZWxzL3F1ZXN0aW9uXCIpO1xudmFyIFF1ZXN0aW9uc0NvbGxlY3Rpb24gPSByZXF1aXJlKFwib21lL2FwcC9jb2xsZWN0aW9ucy9xdWVzdGlvbnNcIik7XG52YXIgUXVlc3Rpb25WaWV3ID0gcmVxdWlyZShcIm9tZS9hcHAvdmlld3MvY29udmVyc2F0aW9uL3F1ZXN0aW9ucy9xdWVzdGlvblwiKTtcbnZhciBDdXN0b21RdWVzdGlvblZpZXcgPSByZXF1aXJlKFwib21lL2FwcC92aWV3cy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL2N1c3RvbVF1ZXN0aW9uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0Y2xhc3NOYW1lOiBcInF1ZXN0aW9uc1wiLFxuXHR0YWdOYW1lOiBcInVsXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHQkLmdldEpTT04oXCIvanMvanNvbi9xdWVzdGlvbnMuanNcIiwgZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0c2VsZi5xdWVzdGlvbnNDb2xsZWN0aW9uID0gbmV3IFF1ZXN0aW9uc0NvbGxlY3Rpb24oZGF0YSk7XG5cdFx0XHRzZWxmLnZpZXdzID0gW107XG5cblx0XHRcdC8vIENyZWF0ZSBxdWVzdGlvbiB2aWV3c1xuXHRcdFx0c2VsZi5xdWVzdGlvbnNDb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwpIHtcblx0XHRcdFx0c2VsZi52aWV3cy5wdXNoKG5ldyBRdWVzdGlvblZpZXcoe21vZGVsOiBtb2RlbH0pKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHQvLyBBZGQgaW4gY3VzdG9tIHF1ZXN0aW9uXG5cdFx0XHRzZWxmLnZpZXdzLnB1c2gobmV3IEN1c3RvbVF1ZXN0aW9uVmlldyh7XG5cdFx0XHRcdG1vZGVsOiBuZXcgUXVlc3Rpb25Nb2RlbCgpXG5cdFx0XHR9KSk7XG5cdFx0XHRcblx0XHRcdHNlbGYucmVuZGVyKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdHNlbGYuJGVsLmVtcHR5KCk7XG5cdFx0XG5cdFx0dmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblx0XHRcblx0XHQvLyBSZW5kZXIgZWFjaCBxdWVzdGlvbiBhbmQgYWRkIGF0IGVuZFxuXHRcdF8uZWFjaChzZWxmLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQodmlldy5lbCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0c2VsZi4kZWwuYXBwZW5kKGNvbnRhaW5lcik7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwicXVlc3Rpb25DbGlja2VkXCI6IFwicXVlc3Rpb25DbGlja2VkXCIsXG5cdFx0XCJyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb25cIjogXCJyZWdlbmVyYXRlQ3VzdG9tUXVlc3Rpb25cIlxuXHR9LFxuXHRxdWVzdGlvbkNsaWNrZWQ6IGZ1bmN0aW9uKGV2ZW50LCBvYmplY3RzKSB7XG5cdFx0aWYoIXRoaXMuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0Ly8gU2F2ZSB2aWV3IGFuZCBoaWRlIG90aGVyc1xuXHRcdFx0dGhpcy5zZWxlY3RlZFF1ZXN0aW9uID0gb2JqZWN0cy5zZWxlY3RlZFF1ZXN0aW9uO1xuXHRcdFx0dGhpcy5oaWRlQWxsRXhjZXB0U2VsZWN0ZWRRdWVzdGlvbigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicmVxdWVzdFRvUmV2ZWFsU2VsZWN0ZWRRdWVzdGlvblwiKTtcblx0XHR9XG5cdH0sXG5cdGhpZGVBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gQnViYmxlIHVwIHRoZSBldmVudFxuXHRcdHNlbGYuJGVsLnRyaWdnZXIoXCJoaWRBbGxFeGNlcHRTZWxlY3RlZFF1ZXN0aW9uXCIpO1xuXHRcdFxuXHRcdF8uZWFjaCh0aGlzLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRpZih2aWV3ID09IHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0XHQvLyBTYXZlIGN1cnJlbnQgb2Zmc2V0XG5cdFx0XHRcdHZhciBjdXJyZW50T2Zmc2V0ID0gdmlldy4kZWwub2Zmc2V0KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2aWV3LiRlbC5jc3MoXCJwb3NpdGlvblwiLCBcImFic29sdXRlXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gU2F2ZSBkZXNpcmVkIG9mZnNldFxuXHRcdFx0XHR2YXIgZGVzaXJlZE9mZnNldCA9IHZpZXcuJGVsLm9mZnNldCgpO1xuXHRcdFx0XHRcblx0XHRcdFx0dmlldy4kZWwuY3NzKFwicG9zaXRpb25cIiwgXCJyZWxhdGl2ZVwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIFJlc2V0IHBvc2l0aW9uaW5nIGFuZCBtb3ZlIHF1ZXN0aW9uXG5cdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge1xuXHRcdFx0XHRcdHRvcDogZGVzaXJlZE9mZnNldC50b3AgLSBjdXJyZW50T2Zmc2V0LnRvcFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEhpZGUgYWxsIG90aGVyIHF1ZXN0aW9uc1xuXHRcdFx0XHRUd2Vlbk1heC50byh2aWV3LiRlbCwgLjUsIHthdXRvQWxwaGE6IDB9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0cmV2ZWFsQWxsUXVlc3Rpb25zOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0aWYoc2VsZi5zZWxlY3RlZFF1ZXN0aW9uKSB7XG5cdFx0XHQvLyBCdWJibGUgdXAgdGhlIGV2ZW50XG5cdFx0XHRzZWxmLiRlbC50cmlnZ2VyKFwicmV2ZWFsZWRBbGxRdWVzdGlvbnNcIik7XG5cdFx0XHRcblx0XHRcdF8uZWFjaCh0aGlzLnZpZXdzLCBmdW5jdGlvbih2aWV3KSB7XG5cdFx0XHRcdC8vIFJlc2V0IGN1c3RvbSBxdWVzdGlvblxuXHRcdFx0XHRpZih2aWV3IGluc3RhbmNlb2YgQ3VzdG9tUXVlc3Rpb25WaWV3KSB7XG5cdFx0XHRcdFx0dmlldy5zdGFsZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZih2aWV3ID09IHNlbGYuc2VsZWN0ZWRRdWVzdGlvbikge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0ZWRRdWVzdGlvbiA9IG51bGw7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSBiYWNrIHRvIHBvc2l0aW9uLCBpZiBuZWVkZWRcblx0XHRcdFx0XHRpZighdmlldy4kZWwuaXMoXCI6Zmlyc3QtY2hpbGRcIikpIHtcblx0XHRcdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge1xuXHRcdFx0XHRcdFx0XHR0b3A6IDAsXG5cdFx0XHRcdFx0XHRcdG9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmKHZpZXcgaW5zdGFuY2VvZiBDdXN0b21RdWVzdGlvblZpZXcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYucmVnZW5lcmF0ZUN1c3RvbVF1ZXN0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gUmV2ZWFsIG90aGVyIHF1ZXN0aW9uc1xuXHRcdFx0XHRcdFR3ZWVuTWF4LnRvKHZpZXcuJGVsLCAuNSwge2F1dG9BbHBoYTogMX0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHJlZ2VuZXJhdGVDdXN0b21RdWVzdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdC8vIEJyaW5nIGN1cnJlbnQgb3V0IG9mIHBvc2l0aW9uXG5cdFx0dmFyIGN1cnJlbnQgPSBzZWxmLnZpZXdzLnNsaWNlKC0xKVswXTtcblx0XHRjdXJyZW50LiRlbC5jc3Moe1xuXHRcdFx0cG9zaXRpb246IFwiYWJzb2x1dGVcIixcblx0XHRcdHRvcDogY3VycmVudC4kZWwucG9zaXRpb24oKS50b3AsXG5cdFx0XHRsZWZ0OiBjdXJyZW50LiRlbC5wb3NpdGlvbigpLmxlZnQsXG5cdFx0XHR3aWR0aDogY3VycmVudC4kZWwub3V0ZXJXaWR0aCgpLFxuXHRcdFx0ekluZGV4OiAxMFxuXHRcdH0pO1xuXHRcdFxuXHRcdC8vIEFkZCBpbiBuZXcgb25lXG5cdFx0dmFyIHZpZXcgPSBuZXcgQ3VzdG9tUXVlc3Rpb25WaWV3KHttb2RlbDogbmV3IFF1ZXN0aW9uTW9kZWwoKX0pO1xuXHRcdHNlbGYuJGVsLmFwcGVuZCh2aWV3LmVsKTtcblx0XHRcblx0XHQvLyBSZW1vdmUgb2xkIHdoZW4gbmV3IHByZXNlbnRcblx0XHR2YXIgaSA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoalF1ZXJ5LmNvbnRhaW5zKHNlbGYuZWwsIHZpZXcuZWwpKSB7XG5cdFx0XHRcdGNsZWFySW50ZXJ2YWwoaSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjdXJyZW50LnJlbW92ZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQ2xlYW51cCBhcnJheVxuXHRcdFx0XHRzZWxmLnZpZXdzLnBvcCgpO1xuXHRcdFx0XHRzZWxmLnZpZXdzLnB1c2godmlldyk7XG5cdFx0XHR9XG5cdFx0fSwgMSk7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHR0YWdOYW1lOiBcImxpXCIsXG5cdGNsYXNzTmFtZTogXCJjdXN0b21cIixcblx0c3RhdHVzOiBcInN0YWxlXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdCQuZ2V0KFwiL3RlbXBsYXRlcy9jb252ZXJzYXRpb24vcXVlc3Rpb25zL2N1c3RvbS5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHRcdHNlbGYuJGlucHV0ID0gc2VsZi4kKFwiaW5wdXRcIik7XG5cdFx0XHRzZWxmLiRidXR0b24gPSBzZWxmLiQoXCJidXR0b25cIik7XG5cdFx0XHRzZWxmLiRidXR0b24uY3NzKFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2tcIjogXCJyb3V0ZXJcIixcblx0XHRcImtleXVwIGlucHV0XCI6IFwia2V5SGFuZGxlclwiXG5cdH0sXG5cdHJvdXRlcjogZnVuY3Rpb24oZSkge1xuXHRcdGlmKCQoZS50YXJnZXQpLmlzKHRoaXMuJGJ1dHRvbikgJiYgdGhpcy4kaW5wdXQudmFsKCkgIT09IFwiXCIpIHtcblx0XHRcdHRoaXMuc2VsZWN0ZWQoKTtcblx0XHR9IGVsc2UgaWYodGhpcy5zdGF0dXMgPT0gXCJzZWxlY3RlZFwiKSB7XG5cdFx0XHR0aGlzLiRlbC50cmlnZ2VyKFwicXVlc3Rpb25DbGlja2VkXCIsIHtzZWxlY3RlZFF1ZXN0aW9uOiB0aGlzfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuZWRpdGluZygpO1xuXHRcdH1cblx0fSxcblx0a2V5SGFuZGxlcjogZnVuY3Rpb24oZSkge1xuXHRcdGlmKGUua2V5Q29kZSA9PSAxMyl7XG5cdFx0XHR0aGlzLiRidXR0b24uY2xpY2soKTtcblx0XHR9XG5cdH0sXG5cdGVkaXRpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnN0YXR1cyA9IFwiZWRpdGluZ1wiO1xuXHRcdFxuXHRcdC8vIEFsbG93IGVkaXRpbmdcblx0XHRzZWxmLiRpbnB1dC5wcm9wKFwicmVhZG9ubHlcIiwgZmFsc2UpLmZvY3VzKCk7XG5cdFx0XG5cdFx0Ly8gQW5pbWF0ZSBpZiBub3QgYWxyZWFkeSBkb25lXG5cdFx0aWYoIXNlbGYuJGVsLmhhc0NsYXNzKFwiZm9jdXNlZFwiKSkge1xuXHRcdFx0VHdlZW5NYXgudG8oc2VsZi4kZWwsIC41LCB7Y2xhc3NOYW1lOiBcIis9Zm9jdXNlZFwifSk7XG5cdFx0XHRcblx0XHRcdFR3ZWVuTWF4LmZyb21UbyhzZWxmLiRidXR0b24sIC41LFxuXHRcdFx0XHR7b3BhY2l0eTogMCwgZGlzcGxheTogXCJibG9ja1wifSxcblx0XHRcdFx0e29wYWNpdHk6IDF9XG5cdFx0XHQpO1xuXHRcdH1cblx0fSxcblx0c2VsZWN0ZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnN0YXR1cyA9IFwic2VsZWN0ZWRcIjtcblx0XHRcblx0XHQvLyBTYXZlIGRhdGEgdG8gbW9vZGVsXG5cdFx0c2VsZi5tb2RlbC5zZXQoe1widGV4dFwiOiBzZWxmLiRpbnB1dC52YWwoKX0pO1xuXHRcdFxuXHRcdC8vIERpc2FibGUgZWRpdGluZyBhbmQgc2hyaW5rXG5cdFx0c2VsZi4kaW5wdXQuYmx1cigpLnByb3AoXCJyZWFkb25seVwiLCB0cnVlKTtcblx0XHRzZWxmLnNocmluaygpO1xuXG5cdFx0Ly8gRmlyZSBldmVudCB0byBwYXJlbnRcblx0XHRzZWxmLiRlbC50cmlnZ2VyKFwicXVlc3Rpb25DbGlja2VkXCIsIHtzZWxlY3RlZFF1ZXN0aW9uOiBzZWxmfSk7XG5cdH0sXG5cdHN0YWxlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRpbnB1dC52YWwoXCJcIik7XG5cdFx0XG5cdFx0aWYodGhpcy5zdGF0dXMgPT0gXCJlZGl0aW5nXCIpIHtcblx0XHRcdHRoaXMuc2hyaW5rKCk7XG5cdFx0fVxuXHRcdFxuXHRcdHRoaXMuc3RhdHVzID0gXCJzdGFsZVwiO1xuXHR9LFxuXHRzaHJpbms6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRUd2Vlbk1heC50byhzZWxmLiRlbCwgLjUsIHtjbGFzc05hbWU6IFwiLT1mb2N1c2VkXCJ9KTtcblx0XHRcblx0XHRUd2Vlbk1heC50byhzZWxmLiRidXR0b24sIC41LCB7XG5cdFx0XHRvcGFjaXR5OiAwLFxuXHRcdFx0ZGlzcGxheTogXCJub25lXCJcblx0XHR9KTtcblx0fVxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdHRhZ05hbWU6IFwibGlcIixcblx0dGVtcGxhdGU6IF8udGVtcGxhdGUoXCI8JT0gdGV4dCAlPlwiKSxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC5odG1sKHRoaXMudGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRldmVudHM6IHtcblx0XHRcImNsaWNrXCI6IFwiY2xpY2tlZFwiXG5cdH0sXG5cdGNsaWNrZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGVsLnRyaWdnZXIoXCJxdWVzdGlvbkNsaWNrZWRcIiwge3NlbGVjdGVkUXVlc3Rpb246IHRoaXN9KTtcblx0fVxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJyZXNwb25zZVwiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0Ly8gR2V0IHN0b3JlZCByZXNwb25zZXMgYW5kIHNldHVwXG5cdFx0JC5nZXRKU09OKFwiL2pzL2pzb24vYW5zd2Vycy5qc1wiLCBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRzZWxmLmFuc3dlcnMgPSBkYXRhO1xuXHRcdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcdHNlbGYuc2V0VG9Mb2FkaW5nKCk7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zZXRUb0xvYWRpbmcoKTtcblx0XHR0aGlzLiRlbC5oaWRlKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdGV2ZW50czoge1xuXHRcdFwiY2xpY2sgZm9vdGVyIGRpdlwiOiBcIm1hcmtSYXRlZFwiXG5cdH0sXG5cdG1hcmtSYXRlZDogZnVuY3Rpb24oZSkge1xuXHRcdCQoZS5jdXJyZW50VGFyZ2V0KS5wYXJlbnQoKS5maW5kKFwiZGl2XCIpLnJlbW92ZUNsYXNzKFwiY2xpY2tlZFwiKTtcblx0XHQkKGUuY3VycmVudFRhcmdldCkuYWRkQ2xhc3MoXCJjbGlja2VkXCIpO1xuXHR9LFxuXHRzZXRUb0xvYWRpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGVsXG5cdFx0XHQuZW1wdHkoKVxuXHRcdFx0LmFkZENsYXNzKFwic3Bpbm5lclwiKVxuXHRcdFx0LnJlbW92ZUNsYXNzKFwic3Bpbk91dFwiKVxuXHRcdFx0LnJlbW92ZUNsYXNzKFwibWFwXCIpXG5cdFx0O1xuXHR9LFxuXHRwcmVwYXJlOiBmdW5jdGlvbihhbnN3ZXIpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQvLyBBZGp1c3Qgc2l6ZSBvZiBhbnN3ZXIgYXJlYSBiYXNlZCBvbiBxdWVzdGlvbiBzaXplXG5cdFx0dmFyIHRvcCA9IGFuc3dlci4kZWwucGFyZW50KCkub2Zmc2V0KCkudG9wICsgNTggKyAxMDtcblx0XHR2YXIgaGVpZ2h0ID0gNTIwIC0gNTg7XG5cdFx0XG5cdFx0c2VsZi4kZWwuY3NzKHtcblx0XHRcdGRpc3BsYXk6IFwiYmxvY2tcIixcblx0XHRcdHRvcDogdG9wLFxuXHRcdFx0aGVpZ2h0OiBoZWlnaHRcblx0XHR9KTtcblx0XHRcblx0XHQvLyBGYWRlIGluIHJlc3BvbnNlXG5cdFx0VHdlZW5NYXguZnJvbVRvKHNlbGYuJGVsLCAuNSwge29wYWNpdHk6IDB9LCB7b3BhY2l0eTogMX0pO1xuXHR9LFxuXHRnZXQ6IGZ1bmN0aW9uKHBlcnNvbiwgcXVlc3Rpb24pIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIHJlcXVlc3REYXRhO1xuXHRcdC8vIHZhciB1cmwgPSBcImh0dHA6Ly9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXNrXCI7XG5cdFx0IHZhciB1cmwgPSBcImh0dHA6Ly9hdGxkZXYucGF0aHdheS5jb206MzAwMC9hc2tcIjtcblx0XHQvLyB2YXIgdXJsID0gXCJodHRwOi8vb21lLWRlbW8ucGF0aHdheS5jb206ODA4MC9hc2tcIjtcblx0XHRzZWxmLmFuc3dlciA9IHt9O1xuXHRcdHNlbGYuYW5zd2VyLmNpZCA9IHBlcnNvbi5jaWQ7XG5cdFx0c2VsZi5hbnN3ZXIucGVyc29uSUQgPSBwZXJzb24ubW9kZWwuZ2V0KFwiaWRcIik7XG5cdFx0c2VsZi5hbnN3ZXIucXVlc3Rpb25JRCA9IHF1ZXN0aW9uLm1vZGVsLmdldChcImlkXCIpO1xuXHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBcIlwiO1xuXHRcdFxuXHRcdHZhciBudW1iZXJXaXRoQ29tbWFzID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0cmV0dXJuIHgudG9TdHJpbmcoKS5yZXBsYWNlKC9cXEIoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCBcIixcIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIENsZWFyIG9sZCB0aW1lb3V0cyBhbmQgcmVxdWVzdHNcblx0XHRpZihzZWxmLmpxeGhyKSB7XG5cdFx0XHRzZWxmLmpxeGhyLmFib3J0KCk7XG5cdFx0fVxuXHRcdGlmKHNlbGYudGltZW91dCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHNlbGYudGltZW91dCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIENoZWNrIGlmIHN0b3JlZCByZXNwb25zZVxuXHRcdGlmKHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQgPCA0KSB7XG5cdFx0XHR2YXIgaHRtbCA9IFwiXCI7XG5cdFx0XHRcblx0XHRcdHN3aXRjaChzZWxmLmFuc3dlci5xdWVzdGlvbklEKSB7XG5cdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHQvLyBHZXQgZml0bmVzcyBkYXRhIGFib3V0IHBlcnNvblxuXHRcdFx0XHRcdHJlcXVlc3REYXRhID0ge1xuXHRcdFx0XHRcdFx0XCJ1c2VySWRcIjogc2VsZi5hbnN3ZXIucGVyc29uSUQsXG5cdFx0XHRcdFx0XHRcImZpdG5lc3NcIjogXCJ0cnVlXCJcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIEdldCB0aGUgYW5zd2VyXG5cdFx0XHRcdFx0c2VsZi5qcXhociA9ICQuYWpheCh7XG5cdFx0XHRcdFx0XHR1cmw6IHVybCxcblx0XHRcdFx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0XHRcdFx0ZGF0YVR5cGU6IFwianNvbnBcIixcblx0XHRcdFx0XHRcdHRpbWVvdXQ6IDE1MDAwXG5cdFx0XHRcdFx0fSkuYWx3YXlzKGZ1bmN0aW9uKGRhdGEsIHN0YXR1cywganF4aHIpIHtcblx0XHRcdFx0XHRcdGlmKHN0YXR1cyA9PSBcInN1Y2Nlc3NcIiAmJiBkYXRhLmZpdG5lc3MuY29kZSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRodG1sID1cblx0XHRcdFx0XHRcdFx0XHRwZXJzb24ubW9kZWwuZ2V0KFwibmFtZVwiKSArXG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnBhcnRzWzBdICtcblx0XHRcdFx0XHRcdFx0XHRcIjxzcGFuIGNsYXNzPSdoaWdobGlnaHQnPlwiICsgbnVtYmVyV2l0aENvbW1hcyhkYXRhLmZpdG5lc3Muc3VtbWFyeS5jYWxvcmllc091dCkgKyBcIjwvc3Bhbj5cIiArXG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnBhcnRzWzFdICtcblx0XHRcdFx0XHRcdFx0XHRwZXJzb24ubW9kZWwuZ2V0KFwiZ29hbHNcIikgK1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2Vyc1swXS5wYXJ0c1syXSArXG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5hbnN3ZXJzWzBdLnJlc3BvbnNlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA2KV1cblx0XHRcdFx0XHRcdFx0O1xuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sID0gaHRtbDtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBcIjxwPlNvcnJ5LCBwbGVhc2UgdHJ5IGFnYWluLjwvcD5cIjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c2VsZi50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTt9LCAyNTAwKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgPSBzZWxmLmFuc3dlcnNbMV1bc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXS5odG1sO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBsb2NhdGlvbnMgPSBzZWxmLmFuc3dlcnNbMV1bc2VsZi5hbnN3ZXIucGVyc29uSUQgLSAxXS5sb2NhdGlvbnM7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gQWRkIGxvY2F0aW9uIG5hbWVzIHRvIGh0bWxcblx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IFwiPHVsPlwiO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBsb2NhdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgKz0gXCI8bGk+XCIgKyBsb2NhdGlvbnNbaV0udGl0bGUgKyBcIjwvbGk+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmh0bWwgKz0gXCI8L3VsPlwiO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHNlbGYuYW5zd2VyLmxvY2F0aW9ucyA9IGxvY2F0aW9ucztcblx0XHRcdFx0XHRzZWxmLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge3NlbGYudHJpZ2dlcihcImFuc3dlclJlYWR5XCIpO30sIDMwMDApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIDM6XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IHNlbGYuYW5zd2Vyc1syXVtzZWxmLmFuc3dlci5wZXJzb25JRCAtIDFdO1xuXHRcdFx0XHRcdHNlbGYudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiYW5zd2VyUmVhZHlcIik7fSwgMzAwMCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFRvIGJlIHNlbnQgdG8gQVBJXG5cdFx0XHRyZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFx0XCJ1c2VySWRcIjogMSwgLy8gc2VsZi5hbnN3ZXIucGVyc29uSUQsXG5cdFx0XHRcdFwicXVlc3Rpb25cIjoge1xuXHRcdFx0XHRcdFwicXVlc3Rpb25UZXh0XCI6IHF1ZXN0aW9uLm1vZGVsLmdldChcInRleHRcIilcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Ly8gR2V0IHRoZSBhbnN3ZXJcblx0XHRcdHNlbGYuanF4aHIgPSAkLmFqYXgoe1xuXHRcdFx0XHR1cmw6IHVybCxcblx0XHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRcdGRhdGFUeXBlOiBcImpzb25wXCIsXG5cdFx0XHRcdHRpbWVvdXQ6IDE1MDAwXG5cdFx0XHR9KS5hbHdheXMoZnVuY3Rpb24oZGF0YSwgc3RhdHVzLCBqcXhocikge1xuXHRcdFx0XHRpZihzdGF0dXMgPT0gXCJzdWNjZXNzXCIgJiYgZGF0YS5hbnN3ZXIuYW5zd2Vyc1swXSkge1xuXHRcdFx0XHRcdGlmKHNlbGYuYW5zd2VyLnF1ZXN0aW9uSUQgPT0gNSAmJiBzZWxmLmFuc3dlci5wZXJzb25JRCA9PSAyKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5odG1sICs9IHNlbGYuYW5zd2Vyc1szXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCArPSBkYXRhLmFuc3dlci5hbnN3ZXJzWzBdLmZvcm1hdHRlZFRleHQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5hbnN3ZXIuaHRtbCA9IFwiPHA+U29ycnksIHBsZWFzZSB0cnkgYWdhaW4uPC9wPlwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLnRyaWdnZXIoXCJhbnN3ZXJSZWFkeVwiKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0c2hvdzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gR3JhY2VmdWxseSBoaWRlIHNwaW5uZXJcblx0XHRzZWxmLiRlbC5yZW1vdmVDbGFzcyhcInNwaW5uZXJcIikuYWRkQ2xhc3MoXCJzcGluT3V0XCIpO1xuXHRcdFxuXHRcdGlmKHNlbGYuYW5zd2VyLmh0bWwpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxtYWluPlwiICsgc2VsZi5hbnN3ZXIuaHRtbCArIFwiPC9tYWluPlwiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2VsZi4kZWwuYXBwZW5kKFwiPG1haW4+PHA+U29ycnksIHBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuPC9wPjwvbWFpbj5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIFNob3cgbWFwIGlmIGxvY2F0aW9ucyBhcmUgYXZhaWxhYmxlXG5cdFx0aWYoc2VsZi5hbnN3ZXIubG9jYXRpb25zKSB7XG5cdFx0XHRzZWxmLiRlbC5hZGRDbGFzcyhcIm1hcFwiKTtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChcIjxkaXYgY2xhc3M9J2NvbnRhaW5lcic+PGRpdiBpZD0nbWFwJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0XHRcblx0XHRcdCQuZ2V0SlNPTihcIi9qcy9qc29uL21hcC5qc1wiLCBmdW5jdGlvbihzdHlsZXMpIHtcblx0XHRcdFx0dmFyIHN0eWxlZE1hcCA9IG5ldyBnb29nbGUubWFwcy5TdHlsZWRNYXBUeXBlKFxuXHRcdFx0XHRcdHN0eWxlcyxcblx0XHRcdFx0XHR7bmFtZTogXCJTdHlsZWRcIn1cblx0XHRcdFx0KTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBtYXBPcHRpb25zID0ge1xuXHRcdFx0XHRcdG1hcFR5cGVDb250cm9sT3B0aW9uczoge1xuXHRcdFx0XHRcdFx0bWFwVHlwZUlkczogW2dvb2dsZS5tYXBzLk1hcFR5cGVJZC5ST0FETUFQLCBcIm1hcF9zdHlsZVwiXVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0bWFwVHlwZUNvbnRyb2w6IGZhbHNlLFxuXHRcdFx0XHRcdHN0cmVldFZpZXdDb250cm9sOiBmYWxzZSxcblx0XHRcdFx0XHR6b29tQ29udHJvbDogdHJ1ZSxcblx0XHRcdFx0XHR6b29tQ29udHJvbE9wdGlvbnM6IHtcblx0XHRcdFx0XHRcdHN0eWxlOiBnb29nbGUubWFwcy5ab29tQ29udHJvbFN0eWxlLkxBUkdFLFxuXHRcdFx0XHRcdFx0cG9zaXRpb246IGdvb2dsZS5tYXBzLkNvbnRyb2xQb3NpdGlvbi5MRUZUX1RPUFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBtYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFwXCIpLCBtYXBPcHRpb25zKTtcblx0XHRcdFx0XG5cdFx0XHRcdG1hcC5tYXBUeXBlcy5zZXQoXCJtYXBfc3R5bGVcIiwgc3R5bGVkTWFwKTtcblx0XHRcdFx0bWFwLnNldE1hcFR5cGVJZChcIm1hcF9zdHlsZVwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XG5cdFx0XHRcdHZhciBpbmZvd2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coKTsgIFxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gQWRkIG1hcmtlcnNcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IHNlbGYuYW5zd2VyLmxvY2F0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdC8vIEZvcm1hdCB0aXRsZVxuXHRcdFx0XHRcdHZhciBjb250ZW50ID0gXCJcIjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZihzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0udGl0bGUpIHtcblx0XHRcdFx0XHRcdGNvbnRlbnQgPSBcIjxkaXYgY2xhc3M9J3RpdGxlJz5cIiArIHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS50aXRsZSArIFwiPC9kaXY+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmKHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5kZXNjcmlwdGlvbikge1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSBcIjxkaXYgY2xhc3M9J2Rlc2NyaXB0aW9uJz5cIiArIHNlbGYuYW5zd2VyLmxvY2F0aW9uc1tpXS5kZXNjcmlwdGlvbiArIFwiPC9kaXY+XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHZhciBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uY29vcmRpbmF0ZXMubGF0dGl0dWRlLFxuXHRcdFx0XHRcdFx0XHRzZWxmLmFuc3dlci5sb2NhdGlvbnNbaV0uY29vcmRpbmF0ZXMubG9uZ2l0dWRlXG5cdFx0XHRcdFx0XHQpLFxuXHRcdFx0XHRcdFx0bWFwOiBtYXAsXG5cdFx0XHRcdFx0XHR0aXRsZTogY29udGVudCxcblx0XHRcdFx0XHRcdHZpc2libGU6IHRydWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvL2V4dGVuZCB0aGUgYm91bmRzIHRvIGluY2x1ZGUgZWFjaCBtYXJrZXIncyBwb3NpdGlvblxuXHRcdFx0XHRcdGJvdW5kcy5leHRlbmQobWFya2VyLnBvc2l0aW9uKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcihtYXJrZXIsIFwiY2xpY2tcIiwgKGZ1bmN0aW9uKG1hcmtlciwgaSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRpbmZvd2luZG93LnNldENvbnRlbnQobWFya2VyLnRpdGxlKTtcblx0XHRcdFx0XHRcdFx0aW5mb3dpbmRvdy5vcGVuKG1hcCwgbWFya2VyKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSkobWFya2VyLCBpKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdG1hcC5maXRCb3VuZHMoYm91bmRzKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIEFkZCBpbiB0aHVtYnMgdXAgYW5kIGRvd25cblx0XHQkLmdldChcIi90ZW1wbGF0ZXMvY29udmVyc2F0aW9uL3Jlc3BvbnNlL2Zvb3Rlci5odG1sXCIsIGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdHNlbGYuJGVsLmFwcGVuZChkYXRhKTtcblx0XHR9KTtcblx0fSxcblx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFxuXHRcdFR3ZWVuTWF4LmZyb21UbyhzZWxmLiRlbCwgLjUsIHtvcGFjaXR5OiAxfSwge1xuXHRcdFx0b3BhY2l0eTogMCxcblx0XHRcdGRpc3BsYXk6IFwibm9uZVwiLFxuXHRcdFx0b25Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuc2V0VG9Mb2FkaW5nKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pOyIsIm1vZHVsZS5leHBvcnRzID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRjbGFzc05hbWU6IFwidmlldyBoZWxsb1wiLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XG5cdFx0c2VsZi5yZW5kZXIoKTtcblx0XHRcblx0XHQvLyBCdXR0b24gdG8gZW5kXG5cdFx0c2VsZi4kZWwub25lKFwiY2xpY2tcIiwgXCJidXR0b25cIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJlbmRcIik7XG5cdFx0fSk7XG5cdH0sXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0c2VsZi4kZWwubG9hZChcIi90ZW1wbGF0ZXMvaGVsbG8uaHRtbFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdC8vIFNpZ25hbCB0byBwYXJlbnRcblx0XHRcdHNlbGYudHJpZ2dlcihcImxvYWRlZFwiKTtcblx0XHR9KTtcblx0XHRcblx0XHRyZXR1cm4gc2VsZjtcblx0fVxufSk7IiwibW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdGNsYXNzTmFtZTogXCJ2aWV3IGludHJvXCIsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcblx0XHRzZWxmLnJlbmRlcigpO1xuXHRcdFxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7c2VsZi50cmlnZ2VyKFwiZW5kXCIpO30sIDcwMDApO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGVsLmxvYWQoXCIvdGVtcGxhdGVzL2ludHJvLmh0bWxcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBTaWduYWwgdG8gcGFyZW50XG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJsb2FkZWRcIik7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIHNlbGY7XG5cdH1cbn0pOyJdfQ==
