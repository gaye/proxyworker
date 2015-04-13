importScripts('../node_modules/requirejs/require.js');

require(['../proxyworker'], function(proxyworker) {
'use strict';

var proxy = proxyworker.proxy;

proxy({
  echo: function() {
    return Array.slice(arguments);
  },

  echoWithPromise: function() {
    return Promise.resolve(Array.slice(arguments));
  },

  reject: function() {
    return Promise.reject(new Error('Some error message'));
  },

  throwError: function() {
    throw new Error('Some error message');
  }
});

});
