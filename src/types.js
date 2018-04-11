export type Message = {
  args: Array<any>,
  error: Error,
  eventType: string,
  messageId: number,
  messageType: 'connect' | 'event' | 'response' | 'rpc' | 'subscribe' | 'unsubscribe',
  response: any,
};

type MessageId = {messageId: number};
type MessageArgs = {args: Array<any>};
type RpcResponseMessage = MessageId & {messageType: 'response'};
type Errorlike = {
  message: string,
  name: string,
  stack: string,
};

export type ConnectMessage = {messageType: 'connect'};
export type RpcMessageDetail = MessageArgs & {
  messageType: 'rpc',
  method: string,
};
export type RpcRequestMessage = MessageId & MessageArgs & {method: string};
export type RpcSuccessMessage = RpcResponseMessage & {response: any};
export type RpcFailureMessage = RpcResponseMessage & {error: Errorlike};
export type SubscriptionMessageDetail = {
  messageType: 'subscribe' | 'unsubscribe',
  eventType: string,
};
export type SubscriptionMessage = MessageId & SubscriptionMessageDetail;
export type EventMessage = MessageArgs & {
  eventType: string,
  messageType: 'event',
};
export type IncomingMessage =
  ConnectMessage |
  EventMessage |
  RpcSuccessMessage |
  RpcFailureMessage;
export type OutgoingMessage =
  ConnectMessage |
  RpcRequestMessage |
  SubscriptionMessage;
