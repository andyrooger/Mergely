describe('performance-improvements', function() {

  var noDiffBehaviour;
  beforeEach(function() {
    var noDiffSpy = jasmine.createSpy('noDiff').andCallFake(function(){ throw new Error('Shouldn\'t be diffing'); });
    noDiffBehaviour = {
      DiffLines: noDiffSpy,
      Parse: noDiffSpy,
      DiffChars: noDiffSpy,
      spy: noDiffSpy
    };
  });

  it('should update the size of the editor and the margins when resize is called', function(){
    var newHeight = 50;
  
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {autoupdate: false, autoresize: false}));
    jasmine.Clock.tick(0);
    if(mglyElem.children().height() === newHeight) {
      newHeight *= 2; // Need to use a different newHeight or we are not changing anything
    }
    
    mglyElem.mergely('options', {height: newHeight});
    
    mglyElem.mergely('resize');
    
    var columns = mglyElem.children();
    expect(columns.length).toBe(5);
    columns.each(function() {
      expect($(this).height()).toBe(newHeight);
    });
    var editors = mglyElem.find('.CodeMirror');
    expect(editors.length).toBe(2);
    editors.each(function(){
      expect($(this).height()).toBe(newHeight);
    });
  });
  
  it('should not re-diff the editor contents when resize is called', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {autoupdate: false, autoresize: false, diff_behavior: noDiffBehaviour}));
    jasmine.Clock.tick(0);
    noDiffBehaviour.spy.reset();
    
    mglyElem.mergely('resize');
    expect(noDiffBehaviour.spy).not.toHaveBeenCalled();
  });
  
  it('should update the size of the editor and margins if autoresize and autoupdate are turned on and the window is resized', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {autoupdate: true, autoresize: true, width: 'auto'}));
    jasmine.Clock.tick(0);
    
    var originalWidth = 0;
    mglyElem.children().each(function(){ originalWidth += $(this).width(); });
    var newWidth = originalWidth / 2;
    expect(originalWidth).not.toBe(newWidth);
    
    getSandbox().css({ width: newWidth + 'px', minWidth: newWidth + 'px', maxWidth: newWidth + 'px' });
    jQuery(window).resize();
    jasmine.Clock.tick(0);
    
    var finalWidth = 0;
    mglyElem.children().each(function(){ finalWidth += $(this).width(); });
    expect(finalWidth).toBeLessThan(originalWidth);
    
    expect(mglyElem.width()).toBe(Math.round(newWidth));
  });
  
  it('should not re-diff the editor contents if autoresize and autoupdate are turned on and the window is resized', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {autoupdate: true, autoresize: true, diff_behavior: noDiffBehaviour}));
    jasmine.Clock.tick(0);
    noDiffBehaviour.spy.reset();
    
    jQuery(window).resize();
    jasmine.Clock.tick(0);
    expect(noDiffBehaviour.spy).not.toHaveBeenCalled();
  });
  
  it('should redraw correctly aligned sidebars and centre gutter if autoupdate is on and an editor is scrolled', function(){
    var longText = 'line';
    for(var i=0; i<250; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: true}));
    jasmine.Clock.tick(0);
    
    // Fake a scroll (happens asynchronously :( no matter what we tell jasmine to do)
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    mglyElem.find('#someid-editor-lhs .CodeMirror-scroll').trigger('scroll');

    waits(1);
    runs(function(){
      // Event should have fired, it actual work will happen after a mergely timeout
      jasmine.Clock.tick(0);
      
      manualConfirmation([
        { q: 'Does the left sidebar show the viewport around the middle of the bar?', a: true },
        { q: 'Do the lines in the center canvas line up with the changes on the left and right?', a: true }
      ], mglyElem);
    });
  });
  
  it('should not re-diff the editor contents if autoupdate is on and an editor is scrolled', function(){
    var longText = 'line';
    for(var i=0; i<250; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: true}));
    jasmine.Clock.tick(0);
    noDiffBehaviour.spy.reset();
    
    // Fake a scroll (happens asynchronously :( no matter what we tell jasmine to do)
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    mglyElem.find('#someid-editor-lhs .CodeMirror-scroll').trigger('scroll');

    waits(1);
    runs(function(){
      // Event should have fired, it actual work will happen after a mergely timeout
      jasmine.Clock.tick(0);
      expect(noDiffBehaviour.spy).not.toHaveBeenCalled();
    });
  });
  
  it('should only redraw the gutters and sidebars once if multiple actions cause redraw in the same callstack', function(){
    var longText = 'line';
    for(var i=0; i<250; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: true, layout_change_timeout: 10}));
    jasmine.Clock.tick(10);
    spyOn(mglyElem.data('mergely'), '_draw_diff');
    
    // Window resize
    jQuery(window).resize();
    expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(0);
    jasmine.Clock.tick(0); // Get past resize timeout, we have 10ms before the layout is updated
    
    // Forced resize
    mglyElem.mergely('resize');
    expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(0);
    
    // Fake a scroll (happens asynchronously :( no matter what we tell jasmine to do)
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    mglyElem.find('#someid-editor-lhs .CodeMirror-scroll').trigger('scroll');
    expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(0);

    waits(1);
    runs(function(){
      expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(0);
      // Event should have fired, it actual work will happen after a mergely timeout
      jasmine.Clock.tick(10);
      expect(mglyElem.data('mergely')._draw_diff).toHaveBeenCalled();
      expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(1);
    });
  });

});
