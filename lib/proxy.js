let api;
let subscriptions = [];

export function proxy(_api) {
  api = _api;
  self.addEventListener('message', async function onmessage(message) {
    let data = message.data;
    let messageType = data.messageType;
    let messageId = data.messageId;
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
        return self.postMessage({
          messageType: 'response',
          messageId: messageId,
          errorMessage: `Unknown message type ${messageType}`
        });
    }
  });
}

export function emit(eventType, args) {
  if (subscriptions.indexOf(eventType) === -1) {
    console.log(`No one is subscribed to ${eventType}`);
    return;
  }

  let message = {
    messageType: 'event',
    eventType: eventType,
    args: args
  };

  console.log(`Send message to main thread ${JSON.stringify(message)}`);
  self.postMessage(message);
}

async function handleRPC(data) {
  let messageId = data.messageId;
  let method = data.method;

  if (!(method in api.methods)) {
    return self.postMessage({
      messageType: 'response',
      messageId: messageId,
      errorMessage: `${method} not implemented by worker`
    });
  }

  let args = data.args;
  let result;
  try {
    console.log(`Calling worker method ${method}`);
    result = api.methods[method].apply(null, args);
  } catch (error) {
    return self.postMessage({
      messageType: 'response',
      messageId: messageId,
      errorMessage: error.message
    });
  }

  if (isPromise(result)) {
    console.log(`Awaiting resolution of promise from ${method}`);
    try {
      result = await result;
    } catch (error) {
      return self.postMessage({
        messageType: 'response',
        messageId: messageId,
        errorMessage: error.message
      });
    }
  }

  let message = {
    messageType: 'response',
    messageId: messageId,
    response: result
  };

  console.log(`Send response to main thread ${JSON.stringify(message)}`);
  self.postMessage(message);
}

async function handleSubscription(data) {
  let messageType = data.messageType;
  let messageId = data.messageId;
  let eventType = data.eventType;

  console.log(`Processing subscription to ${eventType}`);
  if (!Array.isArray(api.events) || api.events.indexOf(eventType) === -1) {
    return self.postMessage({
      messageType: 'response',
      messageId: messageId,
      errorMessage: `${eventType} not registered by worker`
    });
  }

  if (messageType === 'subscribe') {
    subscriptions.push(eventType);
  } else if (messageType === 'unsubscribe') {
    subscriptions.splice(subscriptions.indexOf(eventType), 1);
  }

  return self.postMessage({
    messageType: 'response',
    messageId: messageId
  });
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
