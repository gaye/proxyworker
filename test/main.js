require.config({
  baseUrl: '../',

  paths: {
    'chai': '/node_modules/chai/chai',
    'chai-as-promised': '/node_modules/chai-as-promised/lib/chai-as-promised'
  }
});

require(['chai', 'chai-as-promised'], function(chai, chaiAsPromised) {
  chai.use(chaiAsPromised);

  require(
    ['test/proxyworker_test'],
    function() {
      mocha.run();
    }
  );
});
