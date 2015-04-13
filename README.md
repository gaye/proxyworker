proxyworker
===========

Lightweight utility to proxy api requests from main thread to web worker.

```js
// echo.js
define(function(require, exports) {
'use strict';

let ProxyWorker = require('proxyworker').ProxyWorker;

let worker = new ProxyWorker(new Worker('./path/to/echo_worker.js'));

/**
 * Send arguments from main thread to worker and back.
 */
exports.echo = function() {
  return worker.callWithArgs('echo', Array.slice(arguments));
};

});

// echo_worker.js
define(function(require) {
'use strict';
let proxy = require('proxyworker').proxy;

proxy({
  echo: function() {
    let result = Array.prototype.slice.call(arguments);
    return Promise.resolve(result);
  }
});

});
```
