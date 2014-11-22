'use strict';

module.exports.getLogger = function(debug_mode) {

  return {
    info: function() {
      console.log.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
    },

    warn: function() {
      console.warn.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
    },

    error: function() {
      console.error.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
    },

    debug: function() {
      if (debug_mode) {
        console.log.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
      }
    }
  };
}