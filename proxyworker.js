(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.proxyworker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _defaults = function (obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; };

Object.defineProperty(exports, '__esModule', {
  value: true
});
require('regenerator/runtime');

var _proxyworker = require('./proxyworker');

_defaults(exports, _interopRequireWildcard(_proxyworker));

var _proxy = require('./proxy');

_defaults(exports, _interopRequireWildcard(_proxy));
},{"./proxy":2,"./proxyworker":3,"regenerator/runtime":4}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.proxy = proxy;
exports.emit = emit;
var api = undefined;
var subscriptions = [];

function proxy(_api) {
  api = _api;
  self.addEventListener('message', function onmessage(message) {
    var data, messageType, messageId;
    return regeneratorRuntime.async(function onmessage$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          data = message.data;
          messageType = data.messageType;
          messageId = data.messageId;

          console.log('Worker received message ' + messageType + ' ' + messageId);

          context$2$0.t0 = messageType;
          context$2$0.next = context$2$0.t0 === 'connect' ? 7 : context$2$0.t0 === 'rpc' ? 8 : context$2$0.t0 === 'subscribe' ? 9 : context$2$0.t0 === 'unsubscribe' ? 9 : 10;
          break;

        case 7:
          return context$2$0.abrupt('return', self.postMessage({ messageType: 'connect' }));

        case 8:
          return context$2$0.abrupt('return', handleRPC(data));

        case 9:
          return context$2$0.abrupt('return', handleSubscription(data));

        case 10:
          return context$2$0.abrupt('return', self.postMessage({
            messageType: 'response',
            messageId: messageId,
            errorMessage: 'Unknown message type ' + messageType
          }));

        case 11:
        case 'end':
          return context$2$0.stop();
      }
    }, null, this);
  });
}

function emit(eventType, args) {
  if (subscriptions.indexOf(eventType) === -1) {
    console.log('No one is subscribed to ' + eventType);
    return;
  }

  var message = {
    messageType: 'event',
    eventType: eventType,
    args: args
  };

  console.log('Send message to main thread ' + JSON.stringify(message));
  self.postMessage(message);
}

function handleRPC(data) {
  var messageId, method, args, result, message;
  return regeneratorRuntime.async(function handleRPC$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        messageId = data.messageId;
        method = data.method;

        if (method in api.methods) {
          context$1$0.next = 4;
          break;
        }

        return context$1$0.abrupt('return', self.postMessage({
          messageType: 'response',
          messageId: messageId,
          errorMessage: '' + method + ' not implemented by worker'
        }));

      case 4:
        args = data.args;
        result = undefined;
        context$1$0.prev = 6;

        console.log('Calling worker method ' + method);
        result = api.methods[method].apply(null, args);
        context$1$0.next = 14;
        break;

      case 11:
        context$1$0.prev = 11;
        context$1$0.t1 = context$1$0['catch'](6);
        return context$1$0.abrupt('return', self.postMessage({
          messageType: 'response',
          messageId: messageId,
          errorMessage: context$1$0.t1.message
        }));

      case 14:
        if (!isPromise(result)) {
          context$1$0.next = 25;
          break;
        }

        console.log('Awaiting resolution of promise from ' + method);
        context$1$0.prev = 16;
        context$1$0.next = 19;
        return result;

      case 19:
        result = context$1$0.sent;
        context$1$0.next = 25;
        break;

      case 22:
        context$1$0.prev = 22;
        context$1$0.t2 = context$1$0['catch'](16);
        return context$1$0.abrupt('return', self.postMessage({
          messageType: 'response',
          messageId: messageId,
          errorMessage: context$1$0.t2.message
        }));

      case 25:
        message = {
          messageType: 'response',
          messageId: messageId,
          response: result
        };

        console.log('Send response to main thread ' + JSON.stringify(message));
        self.postMessage(message);

      case 28:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this, [[6, 11], [16, 22]]);
}

function handleSubscription(data) {
  var messageType, messageId, eventType;
  return regeneratorRuntime.async(function handleSubscription$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        messageType = data.messageType;
        messageId = data.messageId;
        eventType = data.eventType;

        console.log('Processing subscription to ' + eventType);

        if (!(!Array.isArray(api.events) || api.events.indexOf(eventType) === -1)) {
          context$1$0.next = 6;
          break;
        }

        return context$1$0.abrupt('return', self.postMessage({
          messageType: 'response',
          messageId: messageId,
          errorMessage: '' + eventType + ' not registered by worker'
        }));

      case 6:

        if (messageType === 'subscribe') {
          subscriptions.push(eventType);
        } else if (messageType === 'unsubscribe') {
          subscriptions.splice(subscriptions.indexOf(eventType), 1);
        }

        return context$1$0.abrupt('return', self.postMessage({
          messageType: 'response',
          messageId: messageId
        }));

      case 8:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
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

// Initial connection
},{}],3:[function(require,module,exports){
'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var ProxyWorker = (function () {
  function ProxyWorker(worker) {
    _classCallCheck(this, ProxyWorker);

    this.worker = worker;
    this.nextMessageId = 0;
    this.workerReady = this._connectToWorker();
    this.subscriptions = {};
  }

  _createClass(ProxyWorker, [{
    key: 'callWithArgs',
    value: function callWithArgs(method, args) {
      var worker, messageId, message;
      return regeneratorRuntime.async(function callWithArgs$(context$2$0) {
        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            worker = this.worker;
            messageId = this.nextMessageId++;
            context$2$0.next = 4;
            return this.workerReady;

          case 4:
            message = {
              messageType: 'rpc',
              messageId: messageId,
              method: method,
              args: args
            };

            console.log('Send message to worker ' + JSON.stringify(message));
            worker.postMessage(message);
            return context$2$0.abrupt('return', waitForResponse(worker, messageId));

          case 8:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(eventType, subscriber) {
      var _subscription, worker, messageId, message, subscription;

      return regeneratorRuntime.async(function subscribe$(context$2$0) {
        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            if (!(eventType in this.subscriptions)) {
              context$2$0.next = 3;
              break;
            }

            _subscription = this.subscriptions[eventType];
            return context$2$0.abrupt('return', _subscription.subscribers.push(subscriber));

          case 3:
            worker = this.worker;
            messageId = this.nextMessageId++;
            context$2$0.next = 7;
            return this.workerReady;

          case 7:
            message = {
              messageType: 'subscribe',
              messageId: messageId,
              eventType: eventType
            };

            console.log('Send message to worker ' + JSON.stringify(message));
            worker.postMessage(message);
            context$2$0.next = 12;
            return waitForResponse(worker, messageId);

          case 12:
            subscription = { subscribers: [subscriber] };

            subscription.onmessage = function (message) {
              var data = message.data;
              if (data.messageType !== 'event' || data.eventType !== eventType) {
                // This message is for someone else.
                return;
              }

              subscription.subscribers.forEach(function (subscriber) {
                return subscriber(data.args);
              });
            };

            worker.addEventListener('message', subscription.onmessage);
            this.subscriptions[eventType] = subscription;

          case 16:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this);
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe(eventType, subscriber) {
      var subscription, subscribers, worker, messageId, message;
      return regeneratorRuntime.async(function unsubscribe$(context$2$0) {
        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            subscription = this.subscriptions[eventType];
            subscribers = subscription.subscribers;

            subscribers.splice(subscribers.indexOf(subscriber), 1);

            if (!subscribers.length) {
              context$2$0.next = 5;
              break;
            }

            return context$2$0.abrupt('return');

          case 5:
            worker = this.worker;
            messageId = this.nextMessageId++;
            message = {
              messageType: 'unsubscribe',
              messageId: messageId,
              eventType: eventType
            };

            console.log('Send message to worker ' + JSON.stringify(message));
            worker.postMessage(message);
            context$2$0.next = 12;
            return waitForResponse(worker, messageId);

          case 12:

            delete this.subscriptions[eventType];

          case 13:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this);
    }
  }, {
    key: '_connectToWorker',
    value: function _connectToWorker() {
      var worker = this.worker;
      var timeout = undefined;

      function pollWorker() {
        var message = { messageType: 'connect' };
        console.log('Send message to worker ' + JSON.stringify(message));
        worker.postMessage(message);
        timeout = setTimeout(pollWorker, 50);
      }

      timeout = setTimeout(pollWorker, 0);

      return new Promise(function (accept) {
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
  }]);

  return ProxyWorker;
})();

exports.ProxyWorker = ProxyWorker;

function waitForResponse(worker, messageId) {
  return new Promise(function (accept, reject) {
    worker.addEventListener('message', function onmessage(message) {
      var data = message.data;
      if (data.messageType !== 'response' || data.messageId !== messageId) {
        // This response is for someone else.
        return;
      }

      // Stop listening for our response since we've already received it.
      worker.removeEventListener('message', onmessage);

      if (data.errorMessage) {
        return reject(new Error(data.errorMessage));
      }accept(data.response);
    });
  });
}

// The worker already knows to send us this event.

// Others still listening for this event so no need to unsubscribe.
},{}],4:[function(require,module,exports){
(function (global){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var iteratorSymbol =
    typeof Symbol === "function" && Symbol.iterator || "@@iterator";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided, then outerFn.prototype instanceof Generator.
    var generator = Object.create((outerFn || Generator).prototype);

    generator._invoke = makeInvokeMethod(
      innerFn, self || null,
      new Context(tryLocsList || [])
    );

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunction.displayName = "GeneratorFunction";

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    genFun.__proto__ = GeneratorFunctionPrototype;
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    return new Promise(function(resolve, reject) {
      var generator = wrap(innerFn, outerFn, self, tryLocsList);
      var callNext = step.bind(generator, "next");
      var callThrow = step.bind(generator, "throw");

      function step(method, arg) {
        var record = tryCatch(generator[method], generator, arg);
        if (record.type === "throw") {
          reject(record.arg);
          return;
        }

        var info = record.arg;
        if (info.done) {
          resolve(info.value);
        } else {
          Promise.resolve(info.value).then(callNext, callThrow);
        }
      }

      callNext();
    });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          if (method === "return" ||
              (method === "throw" && delegate.iterator[method] === undefined)) {
            // A return or throw (when the delegate iterator has no throw
            // method) always terminates the yield* loop.
            context.delegate = null;

            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            var returnMethod = delegate.iterator["return"];
            if (returnMethod) {
              var record = tryCatch(returnMethod, delegate.iterator, arg);
              if (record.type === "throw") {
                // If the return method threw an exception, let that
                // exception prevail over the original return or throw.
                method = "throw";
                arg = record.arg;
                continue;
              }
            }

            if (method === "return") {
              // Continue with the outer return, now that the delegate
              // iterator has been terminated.
              continue;
            }
          }

          var record = tryCatch(
            delegate.iterator[method],
            delegate.iterator,
            arg
          );

          if (record.type === "throw") {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = record.arg;
            continue;
          }

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

          var info = record.arg;
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          if (state === GenStateSuspendedYield) {
            context.sent = arg;
          } else {
            delete context.sent;
          }

        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }

        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          var info = {
            value: record.arg,
            done: context.done
          };

          if (record.arg === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(arg) call above.
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  function defineGeneratorMethod(method) {
    Gp[method] = function(arg) {
      return this._invoke(method, arg);
    };
  }
  defineGeneratorMethod("next");
  defineGeneratorMethod("throw");
  defineGeneratorMethod("return");

  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset();
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function() {
      this.prev = 0;
      this.next = 0;
      this.sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      // Pre-initialize at least 20 temporary variables to enable hidden
      // class optimizations for simple generators.
      for (var tempIndex = 0, tempName;
           hasOwn.call(this, tempName = "t" + tempIndex) || tempIndex < 20;
           ++tempIndex) {
        this[tempName] = null;
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg < finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.next = finallyEntry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          return this.complete(entry.completion, entry.afterLoc);
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1])(1)
});