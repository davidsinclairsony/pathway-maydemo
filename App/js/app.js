(function() {
	// ------------------------------------
	//	Models
	
	// Person model
	var Person = Backbone.Model.extend({});
	
	// People collection
	var People = Backbone.Collection.extend({
		model: Person,
		localStorage: new Backbone.LocalStorage("maydemo-backbone")
	});
	
	var people = new People();

	// ------------------------------------
	//	Views
	
	var AppView = Backbone.View.extend({
		el: $("#app"),
		events: {
			"click .refresh": "refresh"
		},
		refresh: function() {
			window.location.replace("/");
		},
		goTo: function(view) {
			var previous = this.currentView || null;
			var next = view;
			
			if(previous) {
				previous.transitionOut(function () {
					previous.remove();
				});
			}
			console.log(this.$el.find(".refresh"));
			this.$el.$(".refresh");
			//this.transitionIn.call(next);
			//this.currentView = next;
		},
		transitionIn: function(callback) {
			var view = this;
			
			var transitionIn = function () {
				view.$el.addClass('is-visible');
				view.$el.one('transitionend', function () {
					if (_.isFunction(callback)) {
						callback();
					}
				})
			};
			
			_.delay(transitionIn, 20);
		},
		transitionOut: function(callback) {
			var view = this;
			
			view.$el.removeClass('is-visible');
			view.$el.one('transitionend', function () {
				if (_.isFunction(callback)) {
					callback();
				};
			});
		}
	});
	
	var IntroView = Backbone.View.extend({
		className: "view intro",
		initialize: function() {
			var self = this;
			
			self.render();
			
			// Fire event when animations end
			self.$el.one(
				"webkitAnimationEnd oanimationend msAnimationEnd animationend",
				"p",
				function() {self.trigger("end");}
			);
		},
		render: function() {
			var self = this;

			$.get("templates/intro.html", function(data) {
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
		},
		render: function() {
			var self = this;

			$.get("templates/hello.html", function(data) {
				self.$el.html(data);
			}, 'html');
			
			return self;
		},
		events: {
			"click button": "end"
		},
		end: function() {
			this.trigger("end");
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
		},
		intro: function() {
			console.log("intro");
			var view = new IntroView();
			app.instance.goTo(view);
			
		},
		hello: function() {
			console.log("hello");
		},
		conversation: function() {
			console.log("conversation");
		},
		error: function() {
			console.log("error");
		}
	});
	
	// ------------------------------------
	//	Setup
	
	window.app = {
		Views: {},
		Extensions: {},
		Router: null,
		initialize: function() {
			this.instance = new AppView();
			this.Router = new Router();
			Backbone.history.start({pushState: true});
		}
	};
	
	// ------------------------------------
	//	Initiation
	
	$(function() {
		window.app.initialize();
	});
} ());