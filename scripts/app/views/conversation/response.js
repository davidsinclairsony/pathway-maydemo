/*jshint -W083, -W008 */

var config = require("../../../config");

module.exports = Backbone.View.extend({
	className: "response",
	initialize: function() {
		var self = this;
		
		// Load data and start
		var a1 = $.getJSON("/scripts/json/genes.js");
		var a2 = $.getJSON("/scripts/json/answers.js");
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
			
			$.getJSON("/scripts/json/map.js", function(styles) {
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