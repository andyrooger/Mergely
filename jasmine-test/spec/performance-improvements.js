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
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: true}));
    jasmine.Clock.tick(0);
    
    // Fake a scroll
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
      
      manualConfirmation([
        { q: 'Does the left sidebar show the viewport around the middle of the bar?', a: true },
        { q: 'Do the lines in the center canvas line up with the changes on the left and right?', a: true }
      ], mglyElem);
    });
  });
  
  it('should not re-diff the editor contents if autoupdate is on and an editor is scrolled', function(){
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: true}));
    jasmine.Clock.tick(0);
    noDiffBehaviour.spy.reset();
    
    // Fake a scroll
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
    
      expect(noDiffBehaviour.spy).not.toHaveBeenCalled();
    });
  });
  
  it('should only redraw the gutters and sidebars once if multiple actions cause redraw in the same callstack', function(){
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
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
    
    // Fake a scroll
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(0);
    
      jasmine.Clock.tick(10);
      expect(mglyElem.data('mergely')._draw_diff).toHaveBeenCalled();
      expect(mglyElem.data('mergely')._draw_diff.calls.length).toBe(1);
    });
  });

  it('should keep the canvas drawing in sync while scrolling even when autoupdate is false', function() {
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: false}));
    mglyElem.mergely('update'); // Need to do this manually if autoupdate is off
    jasmine.Clock.tick(0);
    
    // Fake a scroll
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
    
      manualConfirmation([
        { q: 'Does the left sidebar show the viewport around the middle of the bar?', a: true },
        { q: 'Do the lines in the center canvas line up with the changes on the left and right?', a: true }
      ], mglyElem);
    });
  });
  
  it('should keep the canvas drawing in sync while resizing due to autoresize even when autoupdate is false', function() {
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {autoupdate: false, autoresize: true, height: 200, width: 'auto'}));
    mglyElem.mergely('update'); // Need to do this manually if autoupdate is off
    jasmine.Clock.tick(0);
    
    // Move to unchanged line
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
    
      getSandbox().css({ height: '400px', minHeight: '400px', maxHeight: '400px' });
      jQuery(window).resize();
      jasmine.Clock.tick(0);
      
      manualConfirmation([
        { q: 'Does the left sidebar show the viewport around the middle of the bar?', a: true },
        { q: 'Do the lines in the center canvas line up with the changes on the left and right?', a: true }
      ], mglyElem);
    });
  });
  
  it('should not throw errors when resize is called before update', function(){
    // Jasmine mock clock unhelpfully swallows errors
    //jasmine.Clock.useMock();
    var errors = [];
    window.onerror = function(msg, url, line, col, error){ errors.push(error); }
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {autoupdate: false, autoresize: false}));
    mglyElem.mergely('resize');
    mglyElem.mergely('update');
    waits(0);
    runs(function(){
      expect(errors.length).toBe(0);
    });
  });
  
  it('should count change as inside the viewport if it\'s completely inside', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 15, 'lhs-line-to': 16, 'rhs-line-from': 100, 'rhs-line-to': 100});
    expect(inside).toBe(true);
  });
  
  it('should count change as inside the viewport if it overlaps the top edge', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 5, 'lhs-line-to': 15, 'rhs-line-from': 100, 'rhs-line-to': 100});
    expect(inside).toBe(true);
  });
  
  it('should count change as inside the viewport if it overlaps the bottom edge', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 15, 'lhs-line-to': 25, 'rhs-line-from': 100, 'rhs-line-to': 100});
    expect(inside).toBe(true);
  });
  
  it('should count change as outside the viewport if it is completely above', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 5, 'lhs-line-to': 6, 'rhs-line-from': 100, 'rhs-line-to': 100});
    expect(inside).toBe(false);
  });
  
  it('should count change as outside the viewport if it is completely below', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 25, 'lhs-line-to': 26, 'rhs-line-from': 100, 'rhs-line-to': 100});
    expect(inside).toBe(false);
  });
  
  it('should count change as inside the viewport if just the left side is in', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 15, 'lhs-line-to': 16, 'rhs-line-from': 100, 'rhs-line-to': 100});
    expect(inside).toBe(true);
  });
  
  it('should count change as inside the viewport if just the right side is in', function(){
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions('left text', 'right text', {viewport: true}));
    var inside = mglyElem.mergely('_is_change_in_view', {from: 10, to: 20}, {'lhs-line-from': 100, 'lhs-line-to': 100, 'rhs-line-from': 15, 'rhs-line-to': 16});
    expect(inside).toBe(true);
  });
  
  it('should mark up changes when scrolled to a particular line with viewport turned off', function(){
    var sharedText = 'same';
    for(var i=0; i<99; i++) sharedText += '\nsame';
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\n' + sharedText;
    for(var i=0; i<250; i++) longText += '\nline';
    
    // delete: lhs (1->250) rhs (0->0), unchanged: lhs (251->350) rhs (1->100), delete lhs (351->600) rhs (101->101)
    // Long unchanged block makes sure that the second delete is outside of the initial viewport and so not rendered in the initial diff
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, sharedText, {viewport: false}));
    jasmine.Clock.tick(0);
    
    // Move to unchanged line
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 355, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
    
      expect(getMergelyLine(mglyElem, 'lhs', 355).find('pre span').length).toBeGreaterThan(0); // span in pre means it's marked up
    });
  });
  
  it('should mark up changes when scrolled to a particular line with viewport turned on', function(){
    var sharedText = 'same';
    for(var i=0; i<99; i++) sharedText += '\nsame';
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\n' + sharedText;
    for(var i=0; i<250; i++) longText += '\nline';
    
    // delete: lhs (1->250) rhs (0->0), unchanged: lhs (251->350) rhs (1->100), delete lhs (351->600) rhs (101->101)
    // Long unchanged block makes sure that the second delete is outside of the initial viewport and so not rendered in the initial diff
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, sharedText, {viewport: true}));
    jasmine.Clock.tick(0);
    
    // Move to unchanged line
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 355, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
    
      expect(getMergelyLine(mglyElem, 'lhs', 355).find('pre span').length).toBeGreaterThan(0); // span in pre means it's marked up
    });
  });
  
  it('should not re-markup changes when scrolling with viewport off', function(){
    var longText = 'line';
    for(var i=0; i<249; i++) longText += '\nline';
    longText += '\nsame';
    for(var i=0; i<250; i++) longText += '\nline';
    
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(longText, 'same', {viewport: false}));
    mglyElem.mergely('update'); // Need to do this manually if autoupdate is off
    jasmine.Clock.tick(0);
    
    spyOn(mglyElem.data('mergely'), '_markup_changes');
    
    // Scrolling
    mglyElem.mergely('cm', 'lhs').scrollIntoView({line: 251, ch: 0});
    
    waits(0); // Scroll event is async
    runs(function() {
      jasmine.Clock.tick(0);
    
      expect(mglyElem.data('mergely')._markup_changes).not.toHaveBeenCalled();
    });
  });
});
