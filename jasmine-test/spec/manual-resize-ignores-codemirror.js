describe('manual-resize-ignores-codemirror', function() {

  function findFakeScrollbar(mglyElem, side) {
    var editor = mglyElem.mergely('cm', side);
	return jQuery(editor.getWrapperElement()).find('.CodeMirror-vscrollbar');
  }

  it('should refresh CodeMirror when editor is resized manually', function(){
    var tenLines = 'line\nline\nline\nline\nline\nline\nline\nline\nline\nline';
  
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(tenLines, tenLines, {autoupdate: true, autoresize: true, width: 300, height: 50}));
	jasmine.Clock.tick(0);
	var scrollbarL = findFakeScrollbar(mglyElem, 'lhs');
	var scrollbarR = findFakeScrollbar(mglyElem, 'lhs');
	
	expect(scrollbarL.is(':visible')).toBe(true);
	expect(scrollbarR.is(':visible')).toBe(true);
	mglyElem.mergely('options', {height: 500, autoresize: false}); // Autoresize was on to set up correctly initially, turn off here so we can force a manual refresh
	mglyElem.mergely('resize');
	jasmine.Clock.tick(0);
	
	// Should not need vertical scrollbars in editors now. If CodeMirror has not been refreshed, the fake scrollbars will still be displayed
	expect(scrollbarL.is(':visible')).toBe(false);
	expect(scrollbarR.is(':visible')).toBe(false);
  });
  
  it('should refresh CodeMirror when editor is resized automatically', function(){
    var tenLines = 'line\nline\nline\nline\nline\nline\nline\nline\nline\nline';
  
    jasmine.Clock.useMock();
    var mglyElem = createMergely('someid', testingOptions(tenLines, tenLines, {autoupdate: true, autoresize: true, width: 300, height: 50}));
	jasmine.Clock.tick(0);
	var scrollbarL = findFakeScrollbar(mglyElem, 'lhs');
	var scrollbarR = findFakeScrollbar(mglyElem, 'lhs');
	
	expect(scrollbarL.is(':visible')).toBe(true);
	expect(scrollbarR.is(':visible')).toBe(true);
	mglyElem.mergely('options', {height: 500});
	jQuery(window).resize();
	jasmine.Clock.tick(0);
	
	// Should not need vertical scrollbars in editors now. If CodeMirror has not been refreshed, the fake scrollbars will still be displayed
	expect(scrollbarL.is(':visible')).toBe(false);
	expect(scrollbarR.is(':visible')).toBe(false);
  });
});
