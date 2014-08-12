describe('override-diff-behaviour', function() {
  var spiedDiffBehaviors;
  beforeEach(function() {
    // andCallFake breaks constructor functions
    spyOn(Mgly, 'diff').andReturn({ normal_form: function () { return 'this would be normal form diff'; } });
    spyOn(Mgly, 'DiffParser').andReturn([{
      'lhs-line-from': 0,
      'lhs-line-to': 0,
      'op': "c",
      'rhs-line-from': 0,
      'rhs-line-to': 0
    }]);
    spyOn(Mgly, 'LCS').andReturn({ diff: function() {} });

    spiedDiffBehaviors = {
      DiffLines: function(lhs, rhs, settings) {
        var d = new Mgly.diff(lhs, rhs, settings);
        return d.normal_form();
      },
      DiffChars: function(lhs_line, rhs_line, added, removed, settings) {
        var lcs = new Mgly.LCS(lhs_line, rhs_line);
        lcs.diff(added, removed);
      },
      Parse: function(diff, settings) {
        return Mgly.DiffParser(diff);
      }
    };
  });

  it('should use original diffing behavior (Diff, LCS, DiffParser) by default', function() {
    runs(function() {
      var mglyElem = createMergely('someid', testingOptions('left text', 'right text'));
    });
    waits(0);
    runs(function() {
      expect(Mgly.diff).toHaveBeenCalled();
      expect(Mgly.DiffParser).toHaveBeenCalled();
      expect(Mgly.LCS).toHaveBeenCalled();
    });
  });

  it('should use the DiffLines function from diff_behavior option when asked to provide a diff', function() {
    var diffLinesSpy;
    var mglyElem;
    runs(function() {
      diffLinesSpy = jasmine.createSpy('DiffLines').andReturn('normal form');
      mglyElem = createMergely('someid',
        testingOptions('left text', 'right text', { diff_behavior: $.extend(spiedDiffBehaviors, { DiffLines: diffLinesSpy }) })
      );
    });
    waits(0);
    runs(function() {
      Mgly.diff.reset();
      diffLinesSpy.reset();
      expect(mglyElem.mergely('diff')).toBe('normal form');
      expect(Mgly.diff).not.toHaveBeenCalled();
      expect(diffLinesSpy).toHaveBeenCalled();
    });
  });

  it('should use the DiffLines and Parser functions from diff_behavior option when the text is first diffed', function() {
    var diffLinesSpy, parseSpy;
    var mglyElem;
    runs(function() {
      diffLinesSpy = jasmine.createSpy('DiffLines').andReturn('normal form');
      parseSpy = jasmine.createSpy('Parse').andReturn([{
        'lhs-line-from': 1,
        'lhs-line-to': 1,
        'op': "c",
        'rhs-line-from': 1,
        'rhs-line-to': 1
      }]);
      mglyElem = createMergely('someid',
        testingOptions('left text\nline 2', 'right text\nline 2', {
          diff_behavior: $.extend(spiedDiffBehaviors, { DiffLines: diffLinesSpy, Parse: parseSpy })
        })
      );
    });
    waits(0);
    runs(function() {
      expect(Mgly.diff).not.toHaveBeenCalled();
      expect(Mgly.DiffParser).not.toHaveBeenCalled();
      expect(diffLinesSpy).toHaveBeenCalled();
      expect(parseSpy).toHaveBeenCalled();

      var lines = mglyElem.find('#someid-editor-lhs .CodeMirror-lines');
      var lineElems = lines.find('div > div:not([style]):not([class]) > div');
      expect($(lineElems[0]).has('.CodeMirror-linebackground').length).toBe(0);
      expect($(lineElems[1]).has('.CodeMirror-linebackground').length).toBeGreaterThan(0);
    });
  });

  it('should use the DiffChars function from diff_behavior option to diff each line if lcs option is on', function() {
    var diffCharsSpy;
    var mglyElem;
    runs(function() {
      diffCharsSpy = jasmine.createSpy('DiffChars').andCallFake(function(l, r, added, removed) {
        added(0, 2);
        removed(4, 7);
      });
      mglyElem = createMergely('someid',
        testingOptions('some text', 'other text', {
          diff_behavior: $.extend(spiedDiffBehaviors, { DiffChars: diffCharsSpy })
        })
      );
    });
    waits(0);
    runs(function() {
      expect(Mgly.LCS).not.toHaveBeenCalled();
      expect(diffCharsSpy).toHaveBeenCalled();

      expect(mglyElem.find('.CodeMirror-lines > div > div:not(.CodeMirror-measure) pre .rhs.mergely.ch.a').text()).toBe('ot');
      expect(mglyElem.find('.CodeMirror-lines > div > div:not(.CodeMirror-measure) pre .lhs.mergely.ch.d').text()).toBe(' te');
    });
  });

  it('should pass mergely settings as the last parameter to each of DiffLines, DiffChars, and Parse', function() {
    var lineSettings, parseSettings, charSettings;
    var mglyElem;
    runs(function() {
      mglyElem = createMergely('someid',
        testingOptions('some text', 'other text', {
          diff_behavior: $.extend({}, spiedDiffBehaviors, {
            DiffLines: function() { lineSettings = arguments[arguments.length-1]; return spiedDiffBehaviors.DiffLines.apply(spiedDiffBehaviors, arguments); },
            Parse: function() { parseSettings = arguments[arguments.length-1]; return spiedDiffBehaviors.Parse.apply(spiedDiffBehaviors, arguments); },
            DiffChars: function() { charSettings = arguments[arguments.length-1]; return spiedDiffBehaviors.DiffChars.apply(spiedDiffBehaviors, arguments); }
          }),
          testOption: 'success'
        })
      );
    });
    waits(0);
    runs(function() {
      expect(lineSettings).toBe(parseSettings);
      expect(parseSettings).toBe(charSettings);
      expect(charSettings.testOption).toBe('success');
    });
  });

  it('should pass use the diff behavior object for the context of DiffLines, DiffChars, and Parse', function() {
    var lineThis, parseThis, charThis;
    var mglyElem;
    var diff_behavior = $.extend({}, spiedDiffBehaviors, {
      DiffLines: function() { lineThis = this; return spiedDiffBehaviors.DiffLines.apply(spiedDiffBehaviors, arguments); },
      Parse: function() { parseThis = this; return spiedDiffBehaviors.Parse.apply(spiedDiffBehaviors, arguments); },
      DiffChars: function() { charThis = this; return spiedDiffBehaviors.DiffChars.apply(spiedDiffBehaviors, arguments); }
    });
    runs(function() {
      mglyElem = createMergely('someid',
        testingOptions('some text', 'other text', {
          diff_behavior: diff_behavior,
          testOption: 'success'
        })
      );
    });
    waits(0);
    runs(function() {
      expect(lineThis).toBe(parseThis);
      expect(parseThis).toBe(charThis);
      expect(charThis).toBe(diff_behavior);
    });
  });
});
