// @flow

import type {
  ConnectMessage,
  IncomingMessage,
  RpcMessageDetail,
  RpcRequestMessage,
  SubscriptionMessage,
  SubscriptionMessageDetail,
} from './types';

type Subscriber = (args: Array<any>) => void;

type Subscription = {
  onmessage: (msg: MessageEvent) => void,
  subscribers: Array<Subscriber>,
};

const connectToWorker = (worker: Worker): Promise<void> => {
  const message: ConnectMessage = {messageType: 'connect'};
  const interval = setInterval(() => worker.postMessage(message), 25);

  return new Promise((resolve) => {
    // $FlowFixMe
    worker.addEventListener('message', function onmessage(event: MessageEvent) {
      const message: IncomingMessage = event.data;
      if (message.messageType !== 'connect') {
        // Ignore messages other than 'connect'.
        return;
      }

      worker.removeEventListener('message', onmessage);
      clearInterval(interval);
      resolve();
    });
  });
};

const createError = (name: string, message: string, stack: string): Error => {
  let result = new Error(message);
  result.name = name;
  result.stack = stack;
  return result;
};

const waitForResponse = (worker: Worker, messageId: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    // $FlowFixMe
    worker.addEventListener('message', function onmessage(event: MessageEvent) {
      const message: IncomingMessage = event.data;
      if (message.messageType !== 'response' || message.messageId !== messageId) {
        // This response is for someone else.
        return;
      }

      worker.removeEventListener('message', onmessage);
      if (message.error) {
        return reject(
          createError(
            message.error.name,
            message.error.message,
            message.error.stack
          )
        );
      }

      return resolve(message.response);
    });
  });
};

class ProxyWorker {
  worker: Worker;
  nextMessageId: number;
  workerReady: Promise<void>;
  subscriptions: {[string]: Subscription};

  constructor(worker: Worker) {
    this.worker = worker;
    this.nextMessageId = 0;
    this.subscriptions = {};
    this.workerReady = connectToWorker(worker);
  }

  callWithArgs(method: string, args: Array<any> = []): Promise<any> {
    const detail: RpcMessageDetail = {messageType: 'rpc', method, args};
    return this.sendMessage(detail);
  }

  async subscribe(eventType: string, subscriber: Subscriber): Promise<void> {
    if (eventType in this.subscriptions) {
      this.subscriptions[eventType].subscribers.push(subscriber);
      return;
    }

    const detail: SubscriptionMessageDetail = {messageType: 'subscribe', eventType};
    await this.sendMessage(detail);
    const subscribers = [subscriber];
    const subscription = {
      subscribers,
      onmessage: function(event: MessageEvent): void {
        const message: IncomingMessage = event.data;
        if (message.messageType !== 'event' || message.eventType !== eventType) {
          return;
        }

        subscribers.forEach((subscriber) => subscriber(message.args));
      },
    };

    // $FlowFixMe
    this.worker.addEventListener('message', subscription.onmessage);
    this.subscriptions[eventType] = subscription;
  }

  async unsubscribe(eventType: string, subscriber: Subscriber): Promise<void> {
    const {subscribers, onmessage} = this.subscriptions[eventType];
    subscribers.splice(subscribers.indexOf(subscriber), 1);
    if (subscribers.length) {
      return;
    }

    const detail: SubscriptionMessageDetail = {messageType: 'unsubscribe', eventType};
    await this.sendMessage(detail);
    // $FlowFixMe
    this.worker.removeEventListener('message', onmessage);
    delete this.subscriptions[eventType];
  }

  async sendMessage(detail: RpcMessageDetail | SubscriptionMessageDetail): Promise<any> {
    await this.workerReady;
    const messageId = this.nextMessageId++;
    const message: RpcRequestMessage | SubscriptionMessage = {messageId, ...detail};
    this.worker.postMessage(message);
    return await waitForResponse(this.worker, messageId);
  }
}

module.exports = ProxyWorker;
