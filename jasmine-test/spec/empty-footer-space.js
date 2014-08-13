describe('empty-footer-space', function() {

  it('should not leave a gap at the bottom of the editor if a height is specified', function() {
    jasmine.Clock.useMock();

    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {height: 300}));
    jasmine.Clock.tick(0);

    var cmEditors = mglyElem.find('.CodeMirror');
    expect(cmEditors.length).toBe(2);
    cmEditors.each(function() {
      expect($(this).parent().height()).toBe($(this).height());
    });
  });
});
