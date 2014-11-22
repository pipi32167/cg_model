'use strict';

module.exports.getLogger = function(opt) {

  var logger = function() {}

  logger.info = function() {
    console.log.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  }

  logger.warn = function() {
    console.warn.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  }

  logger.error = function() {
    console.error.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  }

  logger.debug = function() {
    if (opt.debug_mode) {
      console.log.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
    }
  }
  
  return logger;
}