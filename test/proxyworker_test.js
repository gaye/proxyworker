define(function(require) {
'use strict';

var echo = require('./echo');
var expect = require('chai').expect;

describe('proxyworker', function() {
  it('should reject when method not implemented', function() {
    return expect(echo.quantumComputer()).to.be.rejectedWith(
      Error,
      'quantumComputer not implemented by worker'
    );
  });

  it('should return args', function() {
    return expect(echo.echo('l', 3, 3, 7))
    .to
    .eventually
    .deep
    .equal(['l', 3, 3, 7]);
  });

  it('should do promises', function() {
    return expect(echo.echoWithPromise('b', 2, 'g'))
    .to
    .eventually
    .deep
    .equal(['b', 2, 'g']);
  });

  it('should reject when worker throws error', function() {
    return expect(echo.throwError()).to.be.rejectedWith(
      Error,
      'Some error message'
    );
  });

  it('should reject when worker rejects', function() {
    return expect(echo.reject()).to.be.rejectedWith(
      Error,
      'Some error message'
    );
  });
});

});
