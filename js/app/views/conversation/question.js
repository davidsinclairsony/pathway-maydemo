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