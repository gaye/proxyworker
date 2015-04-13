define(function(require, exports) {
'use strict';

var ProxyWorker = require('../proxyworker').ProxyWorker;

var worker = new ProxyWorker(new Worker('./echo_worker.js'));

exports.echo = function() {
  var args = Array.slice(arguments);
  return worker.callWithArgs('echo', args);
};

exports.echoWithPromise = function() {
  var args = Array.slice(arguments);
  return worker.callWithArgs('echoWithPromise', args);
};

exports.reject = function() {
  return worker.callWithArgs('reject');
};

exports.throwError = function() {
  return worker.callWithArgs('throwError');
};

exports.quantumComputer = function() {
  return worker.callWithArgs('quantumComputer');
};

});
