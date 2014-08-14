(function() {

  var sandbox;

  beforeEach(function() {
    sandbox = jQuery('<div>').appendTo(document.body);
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
    var mglyElem = jQuery('<div>').attr('id', id);
    getSandbox().append(mglyElem);
    mglyElem.mergely(options);
    if(destroyAfter === undefined || destroyAfter)
      mergelyHitlist.push(mglyElem);
    return mglyElem;
  };

  window.testingOptions = function(leftText, rightText, other) {
    var settings = jQuery.extend({
      change_timeout: 0,
      layout_change_timeout: 0,
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

  var runManualTests = null;
  window.manualConfirmation = function(questions, elem) {
    // Can't currently think of a better way to test the canvas
    // Probably should be the last thing in a test

    if(runManualTests === null) {
      runManualTests = confirm('You are about to start the first manual test, so this is your only chance to avoid them. Do you want to proceed with the inclusion of manual tests?');
    }

    if(runManualTests === false) {
      return;
    }

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
  
  window.getMergelyLine = function(mglyElem, side, lineNumber) {
    // Must have line numbers on
    var editorLines = mglyElem.find('#someid-editor-' + side + ' .CodeMirror-lines > div > div:not([class]):not([style]) > div');
    return editorLines.has('.CodeMirror-linenumber:contains(' + lineNumber + ')');
  };

}());
