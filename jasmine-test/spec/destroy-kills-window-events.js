describe('destroy-kills-window-events', function() {
  it('should not remove window event listeners it has not placed there', function(){
    var handler = jasmine.createSpy('handler');
    jQuery(window).resize(handler);

    var mglyElem = createMergely('someid', { autoresize: true }, false);
    mglyElem.mergely('destroy');
    mglyElem.remove();

    expect(handler).not.toHaveBeenCalled();
    jQuery(window).resize();
    expect(handler).toHaveBeenCalled();

    jQuery(window).unbind('resize', handler);
  });
});
