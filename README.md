proxyworker
===========

Lightweight utility to proxy api requests from main thread to web worker.

### Usage

```js
// echo.js
define(function(require, exports) {
'use strict';
let ProxyWorker = require('proxyworker').ProxyWorker;

let worker = new ProxyWorker(new Worker('./path/to/echo_worker.js'));

// Send arguments from main thread to worker and back.
worker.callWithArgs('echo', Array.slice(arguments));

// Subscribe to worker event.
worker.subscribe('breakfast', breakfastEvent => {
  // ...
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
emit('breakfast', [
  'green',
  'eggs',
  'and',
  'tofu'
]);

});
```
