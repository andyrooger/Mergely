describe('override-diff-behaviour', function() {
  var spiedDiffBehaviors;
  beforeEach(function() {
    // andCallThrough breaks constructor functions
    spyOn(MglyDiff, 'diff').andReturn({ normal_form: function () { return 'this would be normal form diff'; } });
    spyOn(MglyDiff, 'DiffParser').andReturn([{
      'lhs-line-from': 0,
      'lhs-line-to': 0,
      'op': "c",
      'rhs-line-from': 0,
      'rhs-line-to': 0
    }]);
    spyOn(MglyDiff, 'LCS').andReturn({ diff: function() {} });

    spiedDiffBehaviors = $.extend({}, MglyDiff.StockBehavior);
  });

  it('should use original diffing behavior (Diff, LCS, DiffParser) by default', function() {
    jasmine.Clock.useMock();

    var mglyElem = createMergely('someid', testingOptions('left text', 'right text'));
    jasmine.Clock.tick(0);
    expect(MglyDiff.diff).toHaveBeenCalled();
    expect(MglyDiff.DiffParser).toHaveBeenCalled();
    expect(MglyDiff.LCS).toHaveBeenCalled();
  });

  it('should use the DiffLines function from diff_behavior option when asked to provide a diff', function() {
    jasmine.Clock.useMock();

    var diffLinesSpy = jasmine.createSpy('DiffLines').andReturn('normal form');
    var mglyElem = createMergely('someid',
      testingOptions('left text', 'right text', { diff_behavior: $.extend(spiedDiffBehaviors, { DiffLines: diffLinesSpy }) })
    );
    jasmine.Clock.tick(0);

    MglyDiff.diff.reset();
    diffLinesSpy.reset();
    expect(mglyElem.mergely('diff')).toBe('normal form');
    expect(MglyDiff.diff).not.toHaveBeenCalled();
    expect(diffLinesSpy).toHaveBeenCalled();
  });

  it('should use the DiffLines and Parser functions from diff_behavior option when the text is first diffed', function() {
    jasmine.Clock.useMock();

    var diffLinesSpy = jasmine.createSpy('DiffLines').andReturn('normal form'),
        parseSpy = jasmine.createSpy('Parse').andReturn([{
          'lhs-line-from': 1,
          'lhs-line-to': 1,
          'op': "c",
          'rhs-line-from': 1,
          'rhs-line-to': 1
        }]);
    var mglyElem = createMergely('someid',
      testingOptions('left text\nline 2', 'right text\nline 2', {
        diff_behavior: $.extend(spiedDiffBehaviors, { DiffLines: diffLinesSpy, Parse: parseSpy })
      })
    );
    jasmine.Clock.tick(0);

    expect(MglyDiff.diff).not.toHaveBeenCalled();
    expect(MglyDiff.DiffParser).not.toHaveBeenCalled();
    expect(diffLinesSpy).toHaveBeenCalled();
    expect(parseSpy).toHaveBeenCalled();

    var lines = mglyElem.find('#someid-editor-lhs .CodeMirror-lines');
    var lineElems = lines.find('div > div:not([style]):not([class]) > div');
    expect($(lineElems[0]).has('.CodeMirror-linebackground').length).toBe(0);
    expect($(lineElems[1]).has('.CodeMirror-linebackground').length).toBeGreaterThan(0);
  });

  it('should use the DiffChars function from diff_behavior option to diff each batch of line changes if lcs option is on', function() {
    jasmine.Clock.useMock();

    var diffCharsSpy = jasmine.createSpy('DiffChars').andCallFake(function(ls, rs, added, removed) {
      added(0, 0, 0, 2);
      removed(0, 4, 0, 7);
      expect(ls.length).toBe(2);
      expect(rs.length).toBe(1);
    });
    var mglyElem = createMergely('someid',
      testingOptions('some text\nother changed line', 'other text', {
        diff_behavior: $.extend(spiedDiffBehaviors, { DiffChars: diffCharsSpy })
      })
    );
    jasmine.Clock.tick(0);

    expect(MglyDiff.LCS).not.toHaveBeenCalled();
    expect(diffCharsSpy).toHaveBeenCalled();

    expect(mglyElem.find('.CodeMirror-lines > div > div:not(.CodeMirror-measure) pre .rhs.mergely.ch.a').text()).toBe('ot');
    expect(mglyElem.find('.CodeMirror-lines > div > div:not(.CodeMirror-measure) pre .lhs.mergely.ch.d').text()).toBe(' te');
  });

  it('should pass mergely settings as the last parameter to each of DiffLines, DiffChars, and Parse', function() {
    jasmine.Clock.useMock();

    var lineSettings, parseSettings, charSettings;
    var mglyElem = createMergely('someid',
      testingOptions('some text', 'other text', {
        diff_behavior: $.extend({}, spiedDiffBehaviors, {
          DiffLines: function() { lineSettings = arguments[arguments.length-1]; return spiedDiffBehaviors.DiffLines.apply(spiedDiffBehaviors, arguments); },
          Parse: function() { parseSettings = arguments[arguments.length-1]; return spiedDiffBehaviors.Parse.apply(spiedDiffBehaviors, arguments); },
          DiffChars: function() { charSettings = arguments[arguments.length-1]; return spiedDiffBehaviors.DiffChars.apply(spiedDiffBehaviors, arguments); }
        }),
        testOption: 'success'
      })
    );
    jasmine.Clock.tick(0);

    expect(lineSettings).toBe(parseSettings);
    expect(parseSettings).toBe(charSettings);
    expect(charSettings.testOption).toBe('success');
  });

  it('should pass use the diff behavior object for the context of DiffLines, DiffChars, and Parse', function() {
    jasmine.Clock.useMock();

    var lineThis, parseThis, charThis;
    var diff_behavior = $.extend({}, spiedDiffBehaviors, {
      DiffLines: function() { lineThis = this; return spiedDiffBehaviors.DiffLines.apply(spiedDiffBehaviors, arguments); },
      Parse: function() { parseThis = this; return spiedDiffBehaviors.Parse.apply(spiedDiffBehaviors, arguments); },
      DiffChars: function() { charThis = this; return spiedDiffBehaviors.DiffChars.apply(spiedDiffBehaviors, arguments); }
    });
    var mglyElem = createMergely('someid',
      testingOptions('some text', 'other text', {
        diff_behavior: diff_behavior,
        testOption: 'success'
      })
    );
    jasmine.Clock.tick(0);

    expect(lineThis).toBe(parseThis);
    expect(parseThis).toBe(charThis);
    expect(charThis).toBe(diff_behavior);
  });

  it('should use dummy behavior that does nothing if the mergelydiff.js file is not included', function() {
    // Pretend mglydiff.js is not included
    var originalMglyDiff = window.MglyDiff;
    delete window.MglyDiff;
    var mglyElem = createMergely('someid', testingOptions('some text', 'other text'));
    expect(mglyElem.mergely('options').diff_behavior._dummyBehavior).toBe(true);
    window.MglyDiff = originalMglyDiff;
  });
});
