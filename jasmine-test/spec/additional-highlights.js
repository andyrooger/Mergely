describe('additional-highlights', function() {

  function makeTextWrap(mglyElem, side, lines) {
    var ed = mglyElem.mergely('cm', side);
    var text = 'wrap';
    mglyElem.mergely(side, text);
    jasmine.Clock.tick(0);
    var originalHeight = ed.getLineHandle(0).height;

    while(ed.getLineHandle(0).height < lines*originalHeight) {
      text += ' word';
      mglyElem.mergely(side, text);
      jasmine.Clock.tick(0);
    }
  }

  it('should calculate correct line position when line wrapping is on', function() {
    jasmine.Clock.useMock();

    var mglyElem = createMergely('someid', testingOptions('left text\n left text 2', 'right text', {cmsettings: {lineWrapping: true}}));
    jasmine.Clock.tick(0);
    makeTextWrap(mglyElem, 'rhs', 2);

    var leftLine1 = mglyElem.mergely('_calculate_line_position', 'someid-lhs', 0);
    var leftLine2 = mglyElem.mergely('_calculate_line_position', 'someid-lhs', 1);
    var rightLine = mglyElem.mergely('_calculate_line_position', 'someid-rhs', 0);

    expect(leftLine1.top).toBe(rightLine.top);
    expect(leftLine2.bottom).toBe(rightLine.bottom);
  });

  it('should calculate correct line position when line wrapping is off', function() {
    jasmine.Clock.useMock();

    var mglyElem = createMergely('someid', testingOptions('left text\n left text 2', 'right text', {cmsettings: {lineWrapping: false}}));
    jasmine.Clock.tick(0);

    var leftLine1 = mglyElem.mergely('_calculate_line_position', 'someid-lhs', 0);
    var leftLine2 = mglyElem.mergely('_calculate_line_position', 'someid-lhs', 1);
    var rightLine = mglyElem.mergely('_calculate_line_position', 'someid-rhs', 0);

    expect(leftLine1.top).toBe(rightLine.top);
    expect(leftLine1.bottom).toBe(rightLine.bottom);
    expect(leftLine2.top).not.toBeLessThan(rightLine.bottom);
  });

  it('should allow setting additional highlights with the additionalHighlights method', function(){
    jasmine.Clock.useMock(); // Stop the dodgy highlights from breaking after a timeout
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text'));
    var highlights = ['all', 'of', 'these', 'are', 'invalid', 'but', 'not', 'checked'];
    mglyElem.mergely('additionalHighlights', highlights);
    expect(mglyElem.data('mergely')._additionalHighlights).toBe(highlights);
  });

  it('should allow getting additional highlights from the additionalHighlights method', function(){
    jasmine.Clock.useMock(); // Stop the dodgy highlights from breaking after a timeout
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text'));
    var highlights = ['all', 'of', 'these', 'are', 'invalid', 'but', 'not', 'checked'];
    mglyElem.mergely('additionalHighlights', highlights);
    expect(mglyElem.mergely('additionalHighlights')).toBe(highlights);
  });

  it('should show highlights in the sidebar on the correct line', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('line 1\nline 2\nline 3\nline 4', 'line 1\nline 2\nline 3\nline 4', {vpcolor: 'rgba(0,0,0,0)'}));
    mglyElem.mergely('additionalHighlights', [{'line-from': 1, 'line-to': 1, side: 'lhs', color: 'black'}, {'line-from': 2, 'line-to': 3, side: 'rhs', color: 'pink'}]);
    mglyElem.mergely('update');
    jasmine.Clock.tick(0);

    manualConfirmation([
      {q: 'Is there a black highlight on the left sidebar at line 2?', a: true},
      {q: 'Is there a pink highlight on the right sidebar from line 3 to 4?', a: true},
      {q: 'Are there highlights on the sidebar anywhere other than those lines?', a: false}
    ], mglyElem);
  });

  it('should show highlights as soon as they are added if autoupdate is true', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('line 1\nline 2\nline 3\nline 4', 'line 1\nline 2\nline 3\nline 4', {autoupdate: true, vpcolor: 'rgba(0,0,0,0)'}));
    jasmine.Clock.tick(0);
    mglyElem.mergely('additionalHighlights', [{'line-from': 1, 'line-to': 1, side: 'lhs'}, {'line-from': 2, 'line-to': 3, side: 'rhs'}]);
    jasmine.Clock.tick(0);

    manualConfirmation([
      {q: 'Are there any highlights shown on the sidebar?', a: true}
    ], mglyElem);
  });

  it('should default highlight color to settings.hcolor', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('line 1\nline 2\nline 3\nline 4', 'line 1\nline 2\nline 3\nline 4', {autoupdate: true, hcolor: 'green', vpcolor: 'rgba(0,0,0,0)'}));
    mglyElem.mergely('additionalHighlights', [{'line-from': 1, 'line-to': 1, side: 'lhs', color: 'black'}, {'line-from': 2, 'line-to': 3, side: 'rhs'}]);
    jasmine.Clock.tick(0);

    manualConfirmation([
      {q: 'Is the highlight on the right sidebar green?', a: true}
    ], mglyElem);
  });
});
