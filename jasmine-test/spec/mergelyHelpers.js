(function() {

  var sandbox;

  beforeEach(function() {
    sandbox = $('<div>').appendTo(document.body);
  });

  afterEach(function() {
    sandbox.remove();
    sandbox = null;
  });

  window.getSandbox = function() {
    return sandbox;
  };

}());