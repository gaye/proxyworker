'use strict';
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
};

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
};

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
