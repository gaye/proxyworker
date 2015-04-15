proxyworker
===========

Lightweight utility to proxy api requests from main thread to web worker. Assumes platform support for a number of es6 features like:

+ arrow functions
+ generators
+ promises
+ template strings

Check out the test suite [here](http://gaye.github.io/proxyworker/test/).

### Usage

```js
define(function(require, exports) {
'use strict';
let ProxyWorker = require('proxyworker').ProxyWorker;
let worker = new ProxyWorker(new Worker('./path/to/echo_worker.js'));

// Call 'echo' method on worker with some arguments.
// This returns a promise that will resolve with the worker api response.
worker.callWithArgs('echo', ['a', 'b', 'c', 1, 2, 3]);

// Subscribe to worker event.
worker.subscribe('breakfast', breakfast => {
  // breakfast => ['green', 'eggs', 'and', 'tofu']
});

});

// echo_worker.js
define(function(require) {
'use strict';
let emit = require('proxyworker').emit;
let proxy = require('proxyworker').proxy;

proxy({
  methods: {
    echo: function() {
      let result = Array.prototype.slice.call(arguments);
      return Promise.resolve(result);
    }
  },

  events: [
    'breakfast'
  ]
});

// Time for breakfast?
setInterval(function() {
  emit('breakfast', [
    'green',
    'eggs',
    'and',
    'tofu'
  ]);
}, 24 * 60 * 60 * 1000);

});
```
