describe('prevent-leftovers', function() {
  it('should not leave extra global variables after destroy', function() {
    var globalAttributes = Object.getOwnPropertyNames(window);
    var mglyElem = createMergely('someid', {}, false);

    mglyElem.mergely('destroy');
    var newAttributes = Object.getOwnPropertyNames(window);
    for(var i=0; i<newAttributes.length; i++) {
      expect(globalAttributes).toContain(newAttributes[i]);
    }
    expect(newAttributes.length).toBe(globalAttributes.length);
  });

  it('should not leave extra markup in the page after being destroyed and removed', function() {
    var initialHead = jQuery('head').html();
    var initialSandbox = getSandbox().html();
    var mglyElem = createMergely('someid', {}, false);
    mglyElem.mergely('destroy');
    mglyElem.remove();
    expect(jQuery('head').html()).toBe(initialHead);
    expect(getSandbox().html()).toBe(initialSandbox);
  });

  it('should not leave jquery events behind after being destroyed and removed, even with autoresize on', function(){
    jQuery('*').add(window).add(document).each(function () {
      var events = jQuery._data(this, 'events') || {};
      expect(Object.keys(events).length).toBe(0);
    });

    var mglyElem = createMergely('someid', { autoresize: true }, false);
    mglyElem.mergely('destroy');
    mglyElem.remove();

    jQuery('*').add(window).add(document).each(function () {
      var events = jQuery._data(this, 'events') || {};
      expect(Object.keys(events).length).toBe(0);
    });
  });
});
