'use strict';
var proxy = require('./proxy');
exports.ProxyWorker = require('./proxyworker');
exports.emit = proxy.emit;
exports.proxy = proxy.proxy;
