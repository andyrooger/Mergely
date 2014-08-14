describe('colors-from-css', function() {
  var changeTypeKnownColors = {
    a: 'rgb(111, 0, 0)',
    c: 'rgb(0, 111, 0)',
    d: 'rgb(0, 0, 111)'
  };
  var testColor = 'rgb(42, 42, 42)';

  var styleElem;
  beforeEach(function() {
    var style = '';
    for(var cls in changeTypeKnownColors) {
      style += '.mergely.lhs.start.' + cls + ' { border-top-color: ' + changeTypeKnownColors[cls] + ' }'
    }
    style += '.some.test.color { background-color: ' + testColor + ' }';
    styleElem = jQuery('<style>').text(style);
    getSandbox().append(styleElem);
  });
  afterEach(function() {
    styleElem.remove();
    styleElem = null;
  });

  it('should take foreground color from an element diff top border color if fgcolor is \'auto\'', function () {
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', { fgcolor: 'auto' }));
    expect(mglyElem.mergely('options').fgcolor).toEqual(changeTypeKnownColors);
  });

  ['a', 'c', 'd'].forEach(function (changetype) {
    it('should take changetype ' + changetype + ' foreground color from the class and property specified if it\'s of the form auto:prop:classes', function () {
      var passColors = { a: '#000', c: '#000', d: '#000' };
      passColors[changetype] = 'auto:backgroundColor:some test color';
      var mglyElem = createMergely('someid', testingOptions('left text', 'right text', { fgcolor: passColors }));
      for(var ct in mglyElem.mergely('options').fgcolor) {
        expect(mglyElem.mergely('options').fgcolor[ct]).toBe(ct === changetype ? testColor : '#000');
      }
    });
  });

  ['bgcolor', 'vpcolor', 'hcolor'].forEach(function (colorProp) {
    it('should take color ' + colorProp + ' from the class and property specified if it\'s of the form auto:prop:classes', function () {
      var passColors = {};
      passColors[colorProp] = 'auto:backgroundColor:some test color';
      var mglyElem = createMergely('someid', testingOptions('left text', 'right text', passColors));
      expect(mglyElem.mergely('options')[colorProp]).toBe(testColor );
    });
  });

});
