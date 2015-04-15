(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.proxyworker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var proxy = require('./proxy');
exports.ProxyWorker = require('./proxyworker');
exports.emit = proxy.emit;
exports.proxy = proxy.proxy;

},{"./proxy":2,"./proxyworker":3}],2:[function(require,module,exports){
var co = require('co');

var api;
var subscriptions = [];

exports.proxy = function(_api) {
  api = _api;
  self.addEventListener('message', message => {
    var data = message.data;
    var messageType = data.messageType;
    var messageId = data.messageId;
    console.log(`Worker received message ${messageType} ${messageId}`);

    switch (messageType) {
      case 'connect':
        // Initial connection
        return self.postMessage({ messageType: 'connect' });
      case 'rpc':
        return handleRPC(data);
      case 'subscribe':
      case 'unsubscribe':
        return handleSubscription(data);
      default:
        return sendError(messageId, `Unknown message type ${messageType}`);
    }
  });
}

exports.emit = function(eventType, args) {
  if (subscriptions.indexOf(eventType) === -1) {
    console.log(`No one is subscribed to ${eventType}`);
    return;
  }

  var message = {
    messageType: 'event',
    eventType: eventType,
    args: args
  };

  console.log(`Send event to main thread ${JSON.stringify(message)}`);
  self.postMessage(message);
}

function handleRPC(data) {
  var messageId = data.messageId;
  var method = data.method;

  if (!(method in api.methods)) {
    return sendError(messageId, `${method} not implemented by worker`);
  }

  co(function*() {
    console.log(`Call worker method ${method}`);
    var args = data.args;
    var result = api.methods[method].apply(null, args);
    return isPromise(result) ? yield result : result;
  })
  .then(result => sendResponse(messageId, result))
  .catch(error => sendError(messageId, error.message));
}

function handleSubscription(data) {
  var messageType = data.messageType;
  var messageId = data.messageId;
  var eventType = data.eventType;

  console.log(`Process subscription to ${eventType}`);
  if (!Array.isArray(api.events) || api.events.indexOf(eventType) === -1) {
    return sendError(messageId, `${eventType} not registered by worker`);
  }

  if (messageType === 'subscribe') {
    subscriptions.push(eventType);
  } else if (messageType === 'unsubscribe') {
    subscriptions.splice(subscriptions.indexOf(eventType), 1);
  }

  sendResponse(messageId, 'OK');
}

function sendResponse(messageId, response) {
  var message = {
    messageType: 'response',
    messageId: messageId,
    response: response
  };

  console.log(`Send response to main thread ${JSON.stringify(message)}`);
  self.postMessage(message);
}

function sendError(messageId, errorMessage) {
  var message = {
    messageType: 'response',
    messageId: messageId,
    errorMessage: errorMessage
  };

  console.log(`Send error to main thread ${JSON.stringify(message)}`);
  self.postMessage(message);
}

// See https://promisesaplus.com/
function isPromise(maybePromise) {
  switch (typeof maybePromise) {
    case 'function':
    case 'object':
      break;
    default:
      return false;
  }

  return typeof maybePromise.then === 'function';
}

},{"co":4}],3:[function(require,module,exports){
'use strict';
var co = require('co');

function ProxyWorker(worker) {
  this.worker = worker;
  this.nextMessageId = 0;
  this.workerReady = this._connectToWorker();
  this.subscriptions = {};
}
module.exports = ProxyWorker;

ProxyWorker.prototype = {
  callWithArgs: function(method, args) {
    return this._sendMessage({
      messageType: 'rpc',
      method: method,
      args: args
    });
  },

  subscribe: function(eventType, subscriber) {
    return co(function*() {
      if (eventType in this.subscriptions) {
        // The worker already knows to send us this event.
        var subscription = this.subscriptions[eventType];
        return subscription.subscribers.push(subscriber);
      }

      yield this._sendMessage({
        messageType: 'subscribe',
        eventType: eventType
      });

      var subscription = { subscribers: [subscriber] };
      subscription.onmessage = message => {
        var data = message.data;
        if (data.messageType !== 'event' || data.eventType !== eventType) {
          // This message is for someone else.
          return;
        }

        subscription.subscribers.forEach(subscriber => subscriber(data.args));
      };


      this.worker.addEventListener('message', subscription.onmessage);
      this.subscriptions[eventType] = subscription;
    }.bind(this));
  },

  unsubscribe: function(eventType, subscriber) {
    return co(function*() {
      var subscription = this.subscriptions[eventType];
      var subscribers = subscription.subscribers;
      subscribers.splice(subscribers.indexOf(subscriber), 1);
      if (subscribers.length) {
        // Others still listening for this event so no need to unsubscribe.
        return;
      }

      yield this._sendMessage({
        messageType: 'unsubscribe',
        eventType: eventType
      });

      delete this.subscriptions[eventType];
    }.bind(this));
  },

  _sendMessage: function(message) {
    return co(function*() {
      yield this.workerReady;

      var worker = this.worker;
      var messageId = this.nextMessageId++;

      message.messageId = messageId;
      console.log(`Send message to worker ${JSON.stringify(message)}`);
      worker.postMessage(message);
      return yield waitForResponse(worker, messageId);
    }.bind(this));
  },

  _connectToWorker: function() {
    var worker = this.worker;
    var timeout;

    function pollWorker() {
      var message = { messageType: 'connect' };
      console.log(`Send message to worker ${JSON.stringify(message)}`);
      worker.postMessage(message);
      timeout = setTimeout(pollWorker, 50);
    }

    timeout = setTimeout(pollWorker, 0);

    return new Promise(accept => {
      worker.addEventListener('message', function onmessage(message) {
        var data = message.data;
        if (data.messageType !== 'connect') {
          // Ruh-roh
          return;
        }

        worker.removeEventListener('message', onmessage);
        clearTimeout(timeout);
        accept();
      });
    });
  }
}

function waitForResponse(worker, messageId) {
  return new Promise((accept, reject) => {
    worker.addEventListener('message', function onmessage(message) {
      var data = message.data;
      if (data.messageType !== 'response' || data.messageId !== messageId) {
        // This response is for someone else.
        return;
      }

      // Stop listening for our response since we've already received it.
      worker.removeEventListener('message', onmessage);

      if (data.errorMessage) return reject(new Error(data.errorMessage));
      accept(data.response);
    });
  });
}

},{"co":4}],4:[function(require,module,exports){

/**
 * slice() reference.
 */

var slice = Array.prototype.slice;

/**
 * Expose `co`.
 */

module.exports = co['default'] = co.co = co;

/**
 * Wrap the given generator `fn` into a
 * function that returns a promise.
 * This is a separate function so that
 * every `co()` call doesn't create a new,
 * unnecessary closure.
 *
 * @param {GeneratorFunction} fn
 * @return {Function}
 * @api public
 */

co.wrap = function (fn) {
  createPromise.__generatorFunction__ = fn;
  return createPromise;
  function createPromise() {
    return co.call(this, fn.apply(this, arguments));
  }
};

/**
 * Execute the generator function or a generator
 * and return a promise.
 *
 * @param {Function} fn
 * @return {Promise}
 * @api public
 */

function co(gen) {
  var ctx = this;

  // we wrap everything in a promise to avoid promise chaining,
  // which leads to memory leak errors.
  // see https://github.com/tj/co/issues/180
  return new Promise(function(resolve, reject) {
    if (typeof gen === 'function') gen = gen.call(ctx);
    if (!gen || typeof gen.next !== 'function') return resolve(gen);

    onFulfilled();

    /**
     * @param {Mixed} res
     * @return {Promise}
     * @api private
     */

    function onFulfilled(res) {
      var ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    /**
     * @param {Error} err
     * @return {Promise}
     * @api private
     */

    function onRejected(err) {
      var ret;
      try {
        ret = gen.throw(err);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    /**
     * Get the next value in the generator,
     * return a promise.
     *
     * @param {Object} ret
     * @return {Promise}
     * @api private
     */

    function next(ret) {
      if (ret.done) return resolve(ret.value);
      var value = toPromise.call(ctx, ret.value);
      if (value && isPromise(value)) return value.then(onFulfilled, onRejected);
      return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, '
        + 'but the following object was passed: "' + String(ret.value) + '"'));
    }
  });
}

/**
 * Convert a `yield`ed value into a promise.
 *
 * @param {Mixed} obj
 * @return {Promise}
 * @api private
 */

function toPromise(obj) {
  if (!obj) return obj;
  if (isPromise(obj)) return obj;
  if (isGeneratorFunction(obj) || isGenerator(obj)) return co.call(this, obj);
  if ('function' == typeof obj) return thunkToPromise.call(this, obj);
  if (Array.isArray(obj)) return arrayToPromise.call(this, obj);
  if (isObject(obj)) return objectToPromise.call(this, obj);
  return obj;
}

/**
 * Convert a thunk to a promise.
 *
 * @param {Function}
 * @return {Promise}
 * @api private
 */

function thunkToPromise(fn) {
  var ctx = this;
  return new Promise(function (resolve, reject) {
    fn.call(ctx, function (err, res) {
      if (err) return reject(err);
      if (arguments.length > 2) res = slice.call(arguments, 1);
      resolve(res);
    });
  });
}

/**
 * Convert an array of "yieldables" to a promise.
 * Uses `Promise.all()` internally.
 *
 * @param {Array} obj
 * @return {Promise}
 * @api private
 */

function arrayToPromise(obj) {
  return Promise.all(obj.map(toPromise, this));
}

/**
 * Convert an object of "yieldables" to a promise.
 * Uses `Promise.all()` internally.
 *
 * @param {Object} obj
 * @return {Promise}
 * @api private
 */

function objectToPromise(obj){
  var results = new obj.constructor();
  var keys = Object.keys(obj);
  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var promise = toPromise.call(this, obj[key]);
    if (promise && isPromise(promise)) defer(promise, key);
    else results[key] = obj[key];
  }
  return Promise.all(promises).then(function () {
    return results;
  });

  function defer(promise, key) {
    // predefine the key in the result
    results[key] = undefined;
    promises.push(promise.then(function (res) {
      results[key] = res;
    }));
  }
}

/**
 * Check if `obj` is a promise.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isPromise(obj) {
  return 'function' == typeof obj.then;
}

/**
 * Check if `obj` is a generator.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */

function isGenerator(obj) {
  return 'function' == typeof obj.next && 'function' == typeof obj.throw;
}

/**
 * Check if `obj` is a generator function.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api private
 */
function isGeneratorFunction(obj) {
  var constructor = obj.constructor;
  if (!constructor) return false;
  if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName) return true;
  return isGenerator(constructor.prototype);
}

/**
 * Check for plain object.
 *
 * @param {Mixed} val
 * @return {Boolean}
 * @api private
 */

function isObject(val) {
  return Object == val.constructor;
}

},{}]},{},[1])(1)
});