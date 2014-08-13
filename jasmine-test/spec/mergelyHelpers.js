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
      fadein: false,
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

  window.manualConfirmation = function(questions, elem) {
    // Can't currently think of a better way to test the canvas
    // Probably should be the last thing in a test

    if(elem) elem[0].scrollIntoView();

    /*
    var allQs = '';
    for(var i=0; i<questions.length; i++) allQs += questions[i].q + '\n';

    var wait = null;
    while(wait === null) {
      var waitResult = prompt(allQs + 'How many seconds do you want to inspect for?', 10);
      if(/\d+/.test(waitResult)) wait = parseInt(waitResult, 10);
    }

    waits(wait*1000);
    */
    waits(0);
    runs(function() {
      for(var i=0; i<questions.length; i++) {
        var confirmation = confirm(questions[i].q);
        expect(questions[i].q + ': ' + confirmation).toBe(questions[i].q + ': ' + questions[i].a);
      }
    });
  };

}());
