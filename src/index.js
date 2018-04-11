// @flow

require('babel-polyfill');

const ProxyWorker = require('./ProxyWorker');
const proxy = require('./proxy');

exports.ProxyWorker = ProxyWorker;
exports.emit = proxy.emit;
exports.proxy = proxy.proxy;
