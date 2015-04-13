export class ProxyWorker {
  constructor(worker) {
    this.worker = worker;
    this.nextMessageId = 0;
    this.workerReady = this._connectToWorker();
  }

  async callWithArgs(method, args) {
    let worker = this.worker;
    let messageId = this.nextMessageId++;

    await this.workerReady;

    worker.postMessage({
      messageId: messageId,
      method: method,
      args: args
    });

    return new Promise((accept, reject) => {
      worker.addEventListener('message', function onmessage(event) {
        let data = event.data;
        if (data.messageId !== messageId) {
          // This response is for someone else.
          return;
        }

        // Stop listening for our response since we've already received it.
        worker.removeEventListener('message', onmessage);

        if (data.errorMsg)
          return reject(new Error(data.errorMsg));

        accept(data.response);
      });
    });
  }

  _connectToWorker() {
    let worker = this.worker;
    let timeout;

    function pollWorker() {
      worker.postMessage('ping');
      timeout = setTimeout(pollWorker, 50);
    }

    timeout = setTimeout(pollWorker, 0);

    return new Promise(accept => {
      worker.addEventListener('message', function onmessage(event) {
        let data = event.data;
        if (data === 'pong') {
          worker.removeEventListener('message', onmessage);
          clearTimeout(timeout);
          accept();
        }
      });
    });
  }
}

export function proxy(api) {
  self.addEventListener('message', async function onmessage(event) {
    let data = event.data;

    if (data === 'ping') {
      // Initial connection
      return self.postMessage('pong');
    }

    let messageId = data.messageId;
    let method = data.method;

    if (!(method in api)) {
      return sendError(messageId, `${method} not implemented by worker`);
    }

    let args = data.args;
    let result;
    try {
      result = api[method].apply(null, args);
    } catch (error) {
      return sendError(messageId, error.message);
    }

    if (isPromise(result)) {
      try {
        result = await result;
      } catch (error) {
        return sendError(messageId, error.message);
      }
    }

    sendResponse(messageId, result);
  });
}

function sendResponse(messageId, response) {
  self.postMessage({ messageId: messageId, response: response });
}

function sendError(messageId, errorMsg) {
  self.postMessage({ messageId: messageId, errorMsg: errorMsg });
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
