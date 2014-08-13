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
    expect(leftLine2.top).toBeGreaterThan(rightLine.bottom);
  });

});
