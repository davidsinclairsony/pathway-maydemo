(function($) {
 	$(function() {
		console.log("-");
		
		// Person model
		var Person = Backbone.Model.extend({});
		
		// People collection
		var People = Backbone.Collection.extend({
			model: Person,
			localStorage: new Backbone.LocalStorage("maydemo-backbone")
		});
		
		var people = new People();
		alert(1);
		var cld_view=Backbone.View.extend({
			el: 'template_div',
			initialize: function() {
				
			},
			render: function() {
				// Compile the external template file using underscore
				$.get(App.baseUrl + 'templates/your-template-file.html', function (data) {
					template = _.template(data, {  });
					this.$el.html(template);  
				}, 'html');
			}
		});
		
		
		
		
		// Load questions to model
		
	});
 })(jQuery);