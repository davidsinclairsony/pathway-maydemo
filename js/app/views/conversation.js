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