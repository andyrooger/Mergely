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

  var mergelyHitlist = [];
  afterEach(function() {
    for(var i=0; i<mergelyHitlist.length; i++) {
      mergelyHitlist[i].mergely('destroy');
    }
    mergelyHitlist = [];
  });

  window.createMergely = function(id, options, destroyAfter) {
    var mglyElem = $('<div>').attr('id', id);
    getSandbox().append(mglyElem);
    mglyElem.mergely(options);
    if(destroyAfter === undefined || destroyAfter)
      mergelyHitlist.push(mglyElem);
    return mglyElem;
  };

  window.testingOptions = function(leftText, rightText, other) {
    var settings = $.extend({
      change_timeout: 0,
      resize_timeout: 0,
      cmsettings: { linenumbers: true },
      lhs: function (setValue) {
        setValue(leftText);
      },
      rhs: function (setValue) {
        setValue(rightText);
      }
    }, other);
    return settings;
  };

}());
