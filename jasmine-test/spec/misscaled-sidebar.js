describe('misscaled-sidebar', function() {

  var longText = '';
  for(var i=0; i<100; i++) {
    longText += '\nanother line';
  }

  it('should scale the sidebars correctly when the right side text has many more lines', function () {
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('short text', longText));
    jasmine.Clock.tick(0);

    manualConfirmation([
      {q: 'Does the viewport indicator on the left fill the entire height of the sidebar?', a: true},
      {q: 'Does the viewport indicator on the right fill the entire height of the sidebar?', a: false}
    ], mglyElem);
  });

  it('should scale the sidebars correctly when the left side text has many more lines', function () {
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'short text'));
    jasmine.Clock.tick(0);

    manualConfirmation([
      {q: 'Does the viewport indicator on the left fill the entire height of the sidebar?', a: false},
      {q: 'Does the viewport indicator on the right fill the entire height of the sidebar?', a: true}
    ], mglyElem);
  });

});
