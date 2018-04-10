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
      //console.log('Send message to worker', JSON.stringify(message));
      worker.postMessage(message);
      return waitForResponse(worker, messageId);
    }.bind(this));
  },

  _connectToWorker: function() {
    var worker = this.worker;
    var timeout;

    function pollWorker() {
      var message = { messageType: 'connect' };
      //console.log('Send message to worker', JSON.stringify(message));
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

        if (typeof worker.removeEventListener === 'function') {
          worker.removeEventListener('message', onmessage);
        }

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
      if (typeof worker.removeEventListener === 'function') {
        worker.removeEventListener('message', onmessage);
      }

      if (data.error) {
        var error = new Error(data.error.message);
        error.name = data.error.name;
        error.stack = data.error.stack;
        return reject(error);
      }

      accept(data.response);
    });
  });
}
