var PersonModel = require("../models/person");

module.exports = Backbone.Collection.extend({
	model: PersonModel
});