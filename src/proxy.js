// @flow

import type {
  ConnectMessage,
  EventMessage,
  OutgoingMessage,
  RpcFailureMessage,
  RpcRequestMessage,
  RpcSuccessMessage,
  SubscriptionMessage,
} from './types';

type Api = {
  events: Array<string>,
  methods: {[string]: Function},
};

let subscriptions: Array<string> = [];

const isPromise = (thing: any): boolean => {
  return (typeof thing === 'function' || typeof thing === 'object') &&
         typeof thing.then === 'function';
};

const toStringOrNull = (thing: any): string | null => {
  if (thing == null) {
    return null;
  }

  if (typeof thing === 'string') {
    return thing;
  }

  try {
    return thing.toString();
  } catch (error) {
    return null;
  }
};

const findString = (candidates: Array<any>): string | null => {
  return toStringOrNull(candidates.find(Boolean));
};

const respondToMessage = (messageId: number, response: any): void => {
  const message: RpcSuccessMessage = {messageType: 'response', messageId, response};
  self.postMessage(message);
};

const reportError = (messageId: number, error: Error): void => {
  const message: RpcFailureMessage = {
    messageType: 'response',
    messageId: messageId,
    error: {
      // $FlowFixMe
      name: findString([error.name, error.errorClass]),
      // $FlowFixMe
      message: findString([error.message, error.errorMessage]),
      // $FlowFixMe
      stack: findString([error.stack, error.stacktrace, error['opera#sourceloc']]),
    },
  };

  self.postMessage(message);
};

const emit = (eventType: string, args: Array<any> = []): void => {
  if (!subscriptions.includes(eventType)) {
    return;
  }

  const message: EventMessage = {messageType: 'event', eventType, args};
  self.postMessage(message);
};

const proxy = (api: Api): void => {
  const handleRpc = async (message: RpcRequestMessage): Promise<void> => {
    const {args, messageId, method} = message;
    if (!(method in api.methods)) {
      return reportError(messageId, new Error(`${method} not implemented by worker`));
    }

    try {
      const result = api.methods[method](...args);
      if (!isPromise(result)) {
        return respondToMessage(messageId, result);
      }

      const value = await result;
      return respondToMessage(messageId, value);
    } catch (error) {
      reportError(messageId, error);
    }
  };

  const handleSubscription = (message: SubscriptionMessage): void => {
    const {messageId, messageType, eventType} = message;
    if (!Array.isArray(api.events) || !api.events.includes(eventType)) {
      return reportError(messageId, new Error(`${eventType} not registered by worker`));
    }

    switch (messageType) {
      case 'subscribe':
        subscriptions.push(eventType);
        break;
      case 'unsubscribe':
        subscriptions.splice(subscriptions.indexOf(eventType), 1);
        break;
    }

    return respondToMessage(messageId, 'OK');
  };


  self.addEventListener('message', (event: MessageEvent) => {
    const message: OutgoingMessage = event.data;
    const {messageId, messageType} = message;
    switch (messageType) {
      case 'connect':
        const pong: ConnectMessage = {messageType: 'connect'};
        return self.postMessage(pong);
      case 'rpc':
        return handleRpc(message);
      case 'subscribe':
      case 'unsubscribe':
        return handleSubscription(message);
      default:
        return reportError(messageId, new Error(`Unknown message type ${messageType}`));
    }
  });
};

exports.emit = emit;
exports.proxy = proxy;
