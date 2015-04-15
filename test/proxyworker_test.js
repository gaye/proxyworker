define(function(require) {
'use strict';

var ProxyWorker = require('proxyworker').ProxyWorker;
var expect = require('chai').expect;

var worker = new ProxyWorker(new Worker('./echo_worker.js'));

describe('proxyworker', function() {
  it('should reject when method not implemented', function() {
    var call = worker.callWithArgs('quantumComputer');
    return expect(call).to.be.rejectedWith(
      Error,
      'quantumComputer not implemented by worker'
    );
  });

  it('should return args', function() {
    var call = worker.callWithArgs('echo', ['l', 3, 3, 7]);
    return expect(call).to.eventually.deep.equal(['l', 3, 3, 7]);
  });

  it('should do promises', function() {
    var call = worker.callWithArgs('echoWithPromise', ['b', 2, 'g']);
    return expect(call).to.eventually.deep.equal(['b', 2, 'g']);
  });

  it('should handle multiple, simultaneous requests', function() {
    var call1 = worker.callWithArgs('echo', ['l', 3, 3, 7]);
    var call2 = worker.callWithArgs('echoWithPromise', ['b', 2, 'g']);
    return expect(Promise.all([call1, call2])).to.eventually.deep.equal([
      ['l', 3, 3, 7],
      ['b', 2, 'g']
    ]);
  });

  it('should reject when worker throws error', function() {
    var call = worker.callWithArgs('throwError');
    return expect(call).to.be.rejectedWith(
      Error,
      'Some error message'
    );
  });

  it('should reject when worker rejects', function() {
    var call = worker.callWithArgs('reject');
    return expect(call).to.be.rejectedWith(
      Error,
      'Some error message'
    );
  });

  describe('events', function() {
    var elapsed = 0;
    var args;

    before(function() {
      return worker.subscribe('every100ms', function(_args) {
        args = _args;
        elapsed += 1;
      });
    });

    it('should call subscribers', function(done) {
      setTimeout(function() {
        expect(elapsed).to.be.least(5);
        done();
      }, 750);
    });

    it('should pass along args', function() {
      expect(args).to.deep.equal(['d', 'e', 'a', 'd', 'b', 3, 3, 'f']);
    });

    it('should not call after unsubscribe', function(done) {
      return worker.unsubscribe('every100ms').then(function() {
        var prev = elapsed;
        setTimeout(function() {
          // This proves we weren't called after unsubscribe resolved.
          expect(elapsed).to.equal(prev);
          done();
        }, 750);
      });
    });
  });
});

});
