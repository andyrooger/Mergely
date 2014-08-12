describe('mergely', function() {
  it('should be created using elem.mergely()', function() {
    var mglyElem = $('<div>').attr('id', 'mergelyid');
    getSandbox().append(mglyElem);
    mglyElem.mergely();
    expect(mglyElem.find('#mergelyid-editor-lhs').length).toBe(1);
    expect(mglyElem.find('#mergelyid-editor-rhs').length).toBe(1);
    mglyElem.mergely('destroy');
  });

  it('should be destroyed using elem.mergely(\'destroy\')', function() {
    var mglyElem = $('<div>').attr('id', 'mergelyid');
    getSandbox().append(mglyElem);
    mglyElem.mergely();
    mglyElem.mergely('destroy');
    // I really don't have any tests here other than checking it doesn't explode
  });
});