(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.proxyworker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var proxy = require('./proxy');
exports.ProxyWorker = require('./proxyworker');
exports.emit = proxy.emit;
exports.proxy = proxy.proxy;

},{"./proxy":2,"./proxyworker":3}],2:[function(require,module,exports){
'use strict';

var api;
var subscriptions = [];

exports.proxy = function(_api) {
  api = _api;
  self.addEventListener('message', function(message) {
    var data = message.data;
    var messageType = data.messageType;
    var messageId = data.messageId;
    console.log('Worker received message', messageType, messageId);

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
        return sendError(messageId, 'Unknown message type ' + messageType);
    }
  });
};

exports.emit = function(eventType, args) {
  if (subscriptions.indexOf(eventType) === -1) {
    console.log('No one is subscribed to', eventType);
    return;
  }

  var message = {
    messageType: 'event',
    eventType: eventType,
    args: args
  };

  console.log('Send event to main thread', JSON.stringify(message));
  self.postMessage(message);
};

function handleRPC(data) {
  var messageId = data.messageId;
  var method = data.method;

  if (!(method in api.methods)) {
    return sendError(messageId, method + ' not implemented by worker');
  }

  console.log('Call worker method', method);
  var args = data.args;
  var result;
  try {
    result = api.methods[method].apply(null, args);
    result = isPromise(result) ? result : Promise.resolve(result);
    return result
    .then(function(value) {
      sendResponse(messageId, value);
    })
    .catch(function(error) {
      sendError(messageId, error.message);
    });
  } catch (error) {
    sendError(messageId, error.message);
  }
}

function handleSubscription(data) {
  var messageType = data.messageType;
  var messageId = data.messageId;
  var eventType = data.eventType;

  console.log('Process subscription to', eventType);
  if (!Array.isArray(api.events) || api.events.indexOf(eventType) === -1) {
    return sendError(messageId, eventType + ' not registered by worker');
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

  console.log('Send response to main thread', JSON.stringify(message));
  self.postMessage(message);
}

function sendError(messageId, errorMessage) {
  var message = {
    messageType: 'response',
    messageId: messageId,
    errorMessage: errorMessage
  };

  console.log('Send error to main thread', JSON.stringify(message));
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

},{}],3:[function(require,module,exports){
'use strict';

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
    if (eventType in this.subscriptions) {
      // The worker already knows to send us this event.
      var subscription = this.subscriptions[eventType];
      return subscription.subscribers.push(subscriber);
    }

    return this._sendMessage({
      messageType: 'subscribe',
      eventType: eventType
    })
    .then(function() {
      var subscription = { subscribers: [subscriber] };
      subscription.onmessage = function(message) {
        var data = message.data;
        if (data.messageType !== 'event' || data.eventType !== eventType) {
          // This message is for someone else.
          return;
        }

        subscription.subscribers.forEach(function(subscriber) {
          subscriber(data.args);
        });
      };


      this.worker.addEventListener('message', subscription.onmessage);
      this.subscriptions[eventType] = subscription;
    }.bind(this));
  },

  unsubscribe: function(eventType, subscriber) {
    var subscription = this.subscriptions[eventType];
    var subscribers = subscription.subscribers;
    subscribers.splice(subscribers.indexOf(subscriber), 1);
    if (subscribers.length) {
      // Others still listening for this event so no need to unsubscribe.
      return;
    }

    return this._sendMessage({
      messageType: 'unsubscribe',
      eventType: eventType
    })
    .then(function() {
      delete this.subscriptions[eventType];
    }.bind(this));
  },

  _sendMessage: function(message) {
    return this.workerReady.then(function() {
      var worker = this.worker;
      var messageId = this.nextMessageId++;

      message.messageId = messageId;
      console.log('Send message to worker', JSON.stringify(message));
      worker.postMessage(message);
      return waitForResponse(worker, messageId);
    }.bind(this));
  },

  _connectToWorker: function() {
    var worker = this.worker;
    var timeout;

    function pollWorker() {
      var message = { messageType: 'connect' };
      console.log('Send message to worker', JSON.stringify(message));
      worker.postMessage(message);
      timeout = setTimeout(pollWorker, 50);
    }

    timeout = setTimeout(pollWorker, 0);

    return new Promise(function(accept) {
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
};

function waitForResponse(worker, messageId) {
  return new Promise(function(accept, reject) {
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

},{}]},{},[1])(1)
});