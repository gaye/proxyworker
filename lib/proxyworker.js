export class ProxyWorker {
  constructor(worker) {
    this.worker = worker;
    this.nextMessageId = 0;
    this.workerReady = this._connectToWorker();
    this.subscriptions = {};
  }

  async callWithArgs(method, args) {
    let worker = this.worker;
    let messageId = this.nextMessageId++;

    await this.workerReady;

    let message = {
      messageType: 'rpc',
      messageId: messageId,
      method: method,
      args: args
    };

    console.log(`Send message to worker ${JSON.stringify(message)}`);
    worker.postMessage(message);
    return waitForResponse(worker, messageId);
  }

  async subscribe(eventType, subscriber) {
    if (eventType in this.subscriptions) {
      // The worker already knows to send us this event.
      let subscription = this.subscriptions[eventType];
      return subscription.subscribers.push(subscriber);
    }

    let worker = this.worker;
    let messageId = this.nextMessageId++;

    await this.workerReady;

    let message = {
      messageType: 'subscribe',
      messageId: messageId,
      eventType: eventType
    };

    console.log(`Send message to worker ${JSON.stringify(message)}`);
    worker.postMessage(message);
    await waitForResponse(worker, messageId);

    let subscription = { subscribers: [subscriber] };
    subscription.onmessage = message => {
      let data = message.data;
      if (data.messageType !== 'event' || data.eventType !== eventType) {
        // This message is for someone else.
        return;
      }

      subscription.subscribers.forEach(subscriber => subscriber(data.args));
    };

    worker.addEventListener('message', subscription.onmessage);
    this.subscriptions[eventType] = subscription;
  }

  async unsubscribe(eventType, subscriber) {
    let subscription = this.subscriptions[eventType];
    let subscribers = subscription.subscribers;
    subscribers.splice(subscribers.indexOf(subscriber), 1);
    if (subscribers.length) {
      // Others still listening for this event so no need to unsubscribe.
      return;
    }

    let worker = this.worker;
    let messageId = this.nextMessageId++;
    let message = {
      messageType: 'unsubscribe',
      messageId: messageId,
      eventType: eventType
    };

    console.log(`Send message to worker ${JSON.stringify(message)}`);
    worker.postMessage(message);
    await waitForResponse(worker, messageId);

    delete this.subscriptions[eventType];
  }

  _connectToWorker() {
    let worker = this.worker;
    let timeout;

    function pollWorker() {
      let message = { messageType: 'connect' };
      console.log(`Send message to worker ${JSON.stringify(message)}`);
      worker.postMessage(message);
      timeout = setTimeout(pollWorker, 50);
    }

    timeout = setTimeout(pollWorker, 0);

    return new Promise(accept => {
      worker.addEventListener('message', function onmessage(message) {
        let data = message.data;
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
      let data = message.data;
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
