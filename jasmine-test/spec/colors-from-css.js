describe('colors-from-css', function() {
  var knownColors = {
    a: 'rgb(111, 0, 0)',
    c: 'rgb(0, 111, 0)',
    d: 'rgb(0, 0, 111)'
  };

  var styleElem;
  beforeEach(function() {
    var style = '';
    for(var cls in knownColors) {
      style += '.mergely.lhs.start.' + cls + ' { border-top-color: ' + knownColors[cls] + ' }'
    }
    styleElem = $('<style>').text(style);
    getSandbox().append(styleElem);
  });
  afterEach(function() {
    styleElem.remove();
    styleElem = null;
  });

  it('should take foreground color from diff top border color if fgcolor is \'auto\'', function () {
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', { fgcolor: 'auto' }));
    expect(mglyElem.mergely('options').fgcolor).toEqual(knownColors);
  });

  ['a', 'c', 'd'].forEach(function (changetype) {
    it('should take changetype ' + changetype + ' foreground color from ' + changetype + ' diff border colors if fgcolor.' + changetype + ' is \'auto\'', function () {
      var passColors = { a: '#000', c: '#000', d: '#000' };
      passColors[changetype] = 'auto';
      var mglyElem = createMergely('someid', testingOptions('left text', 'right text', { fgcolor: passColors }));
      expect(mglyElem.mergely('options').fgcolor[changetype]).toEqual(knownColors[changetype]);
    });
  });

});
