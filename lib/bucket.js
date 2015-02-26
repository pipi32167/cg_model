'use strict';
var _ = require('underscore');

var Bucket = function() {
	this.models = {};
}

Bucket.prototype.add = function(key, model) {
	this.models[key] = model;
}

Bucket.prototype.pour = function() {
	var res = this.models;
	this.models = {};
	return res;
}

Bucket.prototype.size = function() {
	return _.size(this.models);
}

module.exports = Bucket;