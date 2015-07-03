importScripts('../node_modules/requirejs/require.js');

require(['../proxyworker'], function(proxyworker) {
'use strict';

var emit = proxyworker.emit;
var proxy = proxyworker.proxy;

proxy({
  methods: {
    echo: function() {
      return Array.prototype.slice.call(arguments);
    },

    echoWithPromise: function() {
      return Promise.resolve(Array.prototype.slice.call(arguments));
    },

    reject: function() {
      return Promise.reject(new Error('Some error message'));
    },

    throwError: function() {
      throw new Error('Some error message');
    }
  },

  events: [
    'every100ms'
  ]
});

function ontimeout() {
  emit('every100ms', ['d', 'e', 'a', 'd', 'b', 3, 3, 'f']);
  setTimeout(ontimeout, 100);
}

setTimeout(ontimeout, 0);

});
