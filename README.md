proxyworker
===========

[![CircleCI](https://circleci.com/gh/scidock/proxyworker.svg?style=svg)](https://circleci.com/gh/scidock/proxyworker)

Lightweight utility to proxy api requests from main thread to web worker.

### Usage

```js
// Main thread
const {ProxyWorker} = require('proxyworker');

const worker = new ProxyWorker(new Worker('./path/to/worker.js'));

// Call 'echo' method on worker with some arguments.
// This returns a promise that will resolve with the worker api response.
worker.callWithArgs('echo', ['a', 'b', 'c', 1, 2, 3]);

// Subscribe to worker event.
worker.subscribe('breakfast', breakfast => {
  // breakfast => ['green', 'eggs', 'and', 'tofu']
});
```

```js
// worker.js
const {emit, proxy} = require('proxyworker');

proxy({
  methods: {
    echo: function() {
      let result = Array.prototype.slice.call(arguments);
      return Promise.resolve(result);
    }
  },

  events: [
    'breakfast',
  ]
});

// Time for breakfast?
setInterval(function() {
  emit('breakfast', [
    'green',
    'eggs',
    'and',
    'tofu',
  ]);
}, 24 * 60 * 60 * 1000);
```
