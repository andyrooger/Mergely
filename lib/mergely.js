Mgly = {};

Mgly.Timer = function(){
	var self = this;
	self.start = function() { self.t0 = new Date().getTime(); }
	self.stop = function() {
		var t1 = new Date().getTime();
		var d = t1 - self.t0; 
		self.t0 = t1;
		return d;
	}
	self.start();
}

Mgly.sizeOf = function(obj) {
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
}

Mgly.mergely = function(el, options) {
	if (el) {
		this.init(el, options);
	}
};

jQuery.extend(Mgly.mergely.prototype, {
	name: 'mergely',
	//http://jupiterjs.com/news/writing-the-perfect-jquery-plugin
	init: function(el, options) {
		this.diffView = new Mgly.CodeMirrorDiffView(el, options);
		this.bind(el);
	},
	bind: function(el) {
		this.diffView.bind(el);
	}
});

Mgly.CodeMirrorDiffView = function(el, options) {
	CodeMirror.defineExtension('centerOnCursor', function() {
		var coords = this.cursorCoords(null, 'local');
		this.scrollTo(null, 
			(coords.y + coords.yBot) / 2 - (this.getScrollerElement().clientHeight / 2));
	});
	this.init(el, options);
};

jQuery.extend(Mgly.CodeMirrorDiffView.prototype, {
	init: function(el, options) {
		this.settings = {
                        diff_behavior: (window.MglyDiff ? MglyDiff.StockBehavior : {
				_dummyBehavior: true,
				DiffLines: function() { return null; },
				Parse: function() { return []; },
				DiffChars: function() { }
			}),
			autoupdate: true,
			autoresize: true,
			rhs_margin: 'right',
			lcs: true,
			sidebar: true,
			viewport: false,
			fadein: 'fast',
			editor_width: '400px',
			editor_height: '400px',
			resize_timeout: 500,
			change_timeout: 150,
			fgcolor: {a:'#4ba3fa',c:'#a3a3a3',d:'#ff7f7f'},
			bgcolor: '#eee',
			vpcolor: 'rgba(0, 0, 200, 0.5)',
			hcolor: '#edfa00',
			lhs: function(setValue) { },
			rhs: function(setValue) { },
			loaded: function() { },
			//_auto_height: function(h) { return h - 20; },
			_auto_width: function(w) { return w; },
			resize: function(init) {
				var scrollbar = init ? 16 : 0;
				var w = jQuery(el).parent().width() + scrollbar;
				if (this.width == 'auto') {
					w = this._auto_width(w);
				}
				else {
					w = this.width;
					this.editor_width = w;
				}
				var h;
				if (this.height == 'auto') {
					//h = this._auto_height(h);
					h = jQuery(el).parent().height();
				}
				else {
					h = this.height;
					this.editor_height = h;
				}
				var content_width = w / 2.0 - 2 * 8 - 8;
				var content_height = h;
				var self = jQuery(el);
				self.find('.mergely-column').css({ width: content_width + 'px' });
				self.find('.mergely-column, .mergely-canvas, .mergely-margin, .mergely-column textarea, .CodeMirror-scroll, .cm-s-default').css({ height: content_height + 'px' });
				self.find('.mergely-canvas').css({ height: content_height + 'px' });
				self.find('.mergely-column textarea').css({ width: content_width + 'px' });
				self.css({ width: w, height: h, clear: 'both' });
				if (self.css('display') == 'none') {
					if (this.fadein != false) self.fadeIn(this.fadein);
					else self.show();
					if (this.loaded) this.loaded();
				}
				if (this.resized) this.resized();
			},
			_debug: '', //scroll,draw,calc,diff,markup,change
			resized: function() { }
		};
		var cmsettings = {
			mode: 'text/plain',
			readOnly: false,
			lineWrapping: false,
			lineNumbers: true,
			gutters: ['merge', 'CodeMirror-linenumbers']
		}
		this.lhs_cmsettings = {};
		this.rhs_cmsettings = {};
		
		// save this element for faster queries
		this.element = jQuery(el);
		
		// save options if there are any
		if (options && options.cmsettings) jQuery.extend(this.lhs_cmsettings, cmsettings, options.cmsettings, options.lhs_cmsettings);
		if (options && options.cmsettings) jQuery.extend(this.rhs_cmsettings, cmsettings, options.cmsettings, options.rhs_cmsettings);
		if (options) jQuery.extend(this.settings, options);

		// Set up automatic colors
		if (this.settings.fgcolor === 'auto') {
			this.settings.fgcolor = {
				a: 'auto:borderTopColor:mergely lhs rhs start a',
				c: 'auto:borderTopColor:mergely lhs rhs start c',
				d: 'auto:borderTopColor:mergely lhs rhs start d'
			};
		}
		
		var fetchableColors = {
			fgcolor: jQuery.extend({}, this.settings.fgcolor),
			bgcolor: this.settings.bgcolor,
			vpcolor: this.settings.vpcolor,
			hcolor: this.settings.hcolor
		};
		this._replace_auto_colors(fetchableColors);
		jQuery.extend(this.settings, fetchableColors);
		
		// Complain if we are missing diff behavior
		if (this.settings.diff_behavior._dummyBehavior)
			console.error('No diff behavior specified. Include mergelydiff.js for a default behavior.');

		// bind if the element is destroyed
		this.element.bind('destroyed', jQuery.proxy(this.teardown, this));

		// save this instance in jQuery data, binding this view to the node
		jQuery.data(el, 'mergely', this);
	},
	unbind: function() {
		if (this.changed_timeout != null) clearTimeout(this.changed_timeout);
		if (this.resize_handler != null) jQuery(window).off(this.resizeHandler);
		this.editor[this.id + '-lhs'].toTextArea();
		this.editor[this.id + '-rhs'].toTextArea();
		this.codemirror_style_override.remove();
	},
	destroy: function() {
		this.element.unbind('destroyed', this.teardown);
		this.teardown();
	},
	teardown: function() {
		this.unbind();
	},
	lhs: function(text) {
		this.editor[this.id + '-lhs'].setValue(text);
	},
	rhs: function(text) {
		this.editor[this.id + '-rhs'].setValue(text);
	},
	additionalHighlights: function(highlights) {
		if(highlights) {
			this._additionalHighlights = highlights;
			if(this.settings.autoupdate) this.update();
		}
		else {
			return this._additionalHighlights;
		}
	},
	update: function() {
		this._changing(this.id + '-lhs', this.id + '-rhs');
	},
	unmarkup: function() {
		this._clear();
	},
	scrollTo: function(side, num) {
		var le = this.editor[this.id + '-lhs'];
		var re = this.editor[this.id + '-rhs'];
		if (side == 'lhs') {
			le.setCursor(num);
			le.centerOnCursor();
		}
		else {
			re.setCursor(num);
			re.centerOnCursor();
		}
	},
	options: function(opts) {
		if (opts) {
			jQuery.extend(this.settings, opts);
			if (this.settings.autoresize) this.resize();
			if (this.settings.autoupdate) this.update();
			if (this.settings.hasOwnProperty('rhs_margin')) {
				// dynamically swap the margin
				if (this.settings.rhs_margin == 'left') {
					this.element.find('.mergely-margin:last-child').insertAfter(
						this.element.find('.mergely-canvas'));
				}
				else {
					var target = this.element.find('.mergely-margin').last();
					target.appendTo(target.parent());
				}
			}
			if (this.settings.hasOwnProperty('sidebar')) {
				// dynamically enable sidebars
				if (this.settings.sidebar) {
					jQuery(this.element).find('.mergely-margin').css({display: 'block'});
				}
				else {
					jQuery(this.element).find('.mergely-margin').css({display: 'none'});
				}
			}
		}
		else {
			return this.settings;
		}
	},
	swap: function() {
		if (this.lhs_cmsettings.readOnly || this.rhs_cmsettings.readOnly) return;
		var le = this.editor[this.id + '-lhs'];
		var re = this.editor[this.id + '-rhs'];
		var tmp = re.getValue();
		re.setValue(le.getValue());
		le.setValue(tmp);
	},
	merge: function(side) {
		var le = this.editor[this.id + '-lhs'];
		var re = this.editor[this.id + '-rhs'];
		if (side == 'lhs' && !this.lhs_cmsettings.readOnly) le.setValue(re.getValue());
		else if (!this.rhs_cmsettings.readOnly) re.setValue(le.getValue());
	},
	get: function(side) {
		var ed = this.editor[this.id + '-' + side];
		var t = ed.getValue();
		if (t == undefined) return '';
		return t;
	},
	clear: function(side) {
		if (side == 'lhs' && this.lhs_cmsettings.readOnly) return;
		if (side == 'rhs' && this.rhs_cmsettings.readOnly) return;
		var ed = this.editor[this.id + '-' + side];
		ed.setValue('');
	},
	cm: function(side) {
		return this.editor[this.id + '-' + side];
	},
	search: function(side, query, direction) {
		var le = this.editor[this.id + '-lhs'];
		var re = this.editor[this.id + '-rhs'];
		var editor;
		if (side == 'lhs') editor = le;
		else editor = re;
		direction = (direction == 'prev') ? 'findPrevious' : 'findNext';
		if ((editor.getSelection().length == 0) || (this.prev_query[side] != query)) {
			this.cursor[this.id] = editor.getSearchCursor(query, { line: 0, ch: 0 }, false);
			this.prev_query[side] = query;
		}
		var cursor = this.cursor[this.id];
		
		if (cursor[direction]()) {
			editor.setSelection(cursor.from(), cursor.to());
		}
		else {
			cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, false);
		}
	},
	resize: function() {
		this.settings.resize();
		this._changing(this.id + '-lhs', this.id + '-rhs');
		this._set_top_offset(this.id + '-lhs');
	},
	diff: function() {
		var lhs = this.editor[this.id + '-lhs'].getValue();
		var rhs = this.editor[this.id + '-rhs'].getValue();
		return this.settings.diff_behavior.DiffLines(lhs, rhs, this.settings);
	},
	bind: function(el) {
		jQuery(this.element).hide();//hide
		this.id = jQuery(el).attr('id');
		var height = this.settings.editor_height;
		var width = this.settings.editor_width;
		this.changed_timeout = null;
		this.resize_handler = null;
		this.chfns = {};
		this.chfns[this.id + '-lhs'] = [];
		this.chfns[this.id + '-rhs'] = [];
		this.prev_query = [];
		this.cursor = [];
		this._skipscroll = {};
		this.change_exp = new RegExp(/(\d+(?:,\d+)?)([acd])(\d+(?:,\d+)?)/);
		var merge_lhs_button;
		var merge_rhs_button;
		if (jQuery.button != undefined) {
			//jquery ui
			merge_lhs_button = '<button title="Merge left"></button>';
			merge_rhs_button = '<button title="Merge right"></button>';
		}
		else {
			// homebrew
			var style = 'opacity:0.4;width:10px;height:15px;background-color:#888;cursor:pointer;text-align:center;color:#eee;border:1px solid: #222;margin-right:5px;';
			merge_lhs_button = '<div style="' + style + '" title="Merge left">&lt;</div>';
			merge_rhs_button = '<div style="' + style + '" title="Merge right">&gt;</div>';
		}
		this.merge_rhs_button = jQuery(merge_rhs_button);
		this.merge_lhs_button = jQuery(merge_lhs_button);
		
		// create the textarea and canvas elements
		jQuery(this.element).append(jQuery('<div class="mergely-margin" style="height: ' + height + '"><canvas id="' + this.id + '-lhs-margin" width="8px" height="' + height + '"></canvas></div>'));
		jQuery(this.element).append(jQuery('<div style="position:relative;width:' + width + '; height:' + height + '" id="' + this.id + '-editor-lhs" class="mergely-column"><textarea style="" id="' + this.id + '-lhs"></textarea></div>'));
		jQuery(this.element).append(jQuery('<div class="mergely-canvas" style="height: ' + height + '"><canvas id="' + this.id + '-lhs-' + this.id + '-rhs-canvas" style="width:28px" width="28px" height="' + height + '"></canvas></div>'));
		var rmargin = jQuery('<div class="mergely-margin" style="height: ' + height + '"><canvas id="' + this.id + '-rhs-margin" width="8px" height="' + height + '"></canvas></div>');
		if (!this.settings.sidebar) {
			jQuery(this.element).find('.mergely-margin').css({display: 'none'});
		}
		if (this.settings.rhs_margin == 'left') {
			jQuery(this.element).append(rmargin);
		}
		jQuery(this.element).append(jQuery('<div style="width:' + width + '; height:' + height + '" id="' + this.id + '-editor-rhs" class="mergely-column"><textarea style="" id="' + this.id + '-rhs"></textarea></div>'));
		if (this.settings.rhs_margin != 'left') {
			jQuery(this.element).append(rmargin);
		}
		//codemirror
		var cmstyle = '#' + this.id + ' .CodeMirror-gutter-text { padding: 5px 0 0 0; }' +
			'#' + this.id + ' .CodeMirror-lines pre, ' + '#' + this.id + ' .CodeMirror-gutter-text pre { line-height: 18px; }' +
			'.CodeMirror-linewidget { overflow: hidden; };';
		if (this.settings.autoresize) {
			cmstyle += this.id + ' .CodeMirror-scroll { height: 100%; overflow: auto; }';
		}
		this.codemirror_style_override = jQuery('<style type="text/css">' + cmstyle + '</style>').appendTo('head');

		//bind
		var rhstx = jQuery('#' + this.id + '-rhs').get(0);
		if (!rhstx) {
			console.error('rhs textarea not defined - Mergely not initialized properly');
			return;
		}
		var lhstx = jQuery('#' + this.id + '-lhs').get(0);
		if (!rhstx) {
			console.error('lhs textarea not defined - Mergely not initialized properly');
			return;
		}
		var self = this;
		this.editor = [];
		this.editor[this.id + '-lhs'] = CodeMirror.fromTextArea(lhstx, this.lhs_cmsettings);
		this.editor[this.id + '-rhs'] = CodeMirror.fromTextArea(rhstx, this.rhs_cmsettings);
		this.editor[this.id + '-lhs'].on('change', function(){ if (self.settings.autoupdate) self._changing(self.id + '-lhs', self.id + '-rhs'); });
		this.editor[this.id + '-lhs'].on('scroll', function(){ self._scrolling(self.id + '-lhs'); });
		this.editor[this.id + '-rhs'].on('change', function(){ if (self.settings.autoupdate) self._changing(self.id + '-lhs', self.id + '-rhs'); });
		this.editor[this.id + '-rhs'].on('scroll', function(){ self._scrolling(self.id + '-rhs'); });
		// resize
		if (this.settings.autoresize) {
			var sz_timeout1 = null;
			var sz = function(init) {
				//self.em_height = null; //recalculate
				if (self.settings.resize) self.settings.resize(init);
				self.editor[self.id + '-lhs'].refresh();
				self.editor[self.id + '-rhs'].refresh();
				if (self.settings.autoupdate) {
					self._changing(self.id + '-lhs', self.id + '-rhs');
				}
			}
			this.resize_handler = function () {
				if (sz_timeout1) clearTimeout(sz_timeout1);
				sz_timeout1 = setTimeout(sz, self.settings.resize_timeout);
			};
			jQuery(window).resize(this.resize_handler);
			sz(true);
		}
		//bind
		
		if (this.settings.lhs) {
			var setv = this.editor[this.id + '-lhs'].getDoc().setValue;
			this.settings.lhs(setv.bind(this.editor[this.id + '-lhs'].getDoc()));
		}
		if (this.settings.rhs) {
			var setv = this.editor[this.id + '-rhs'].getDoc().setValue;
			this.settings.rhs(setv.bind(this.editor[this.id + '-rhs'].getDoc()));
		}
	},
	
	_scrolling: function(editor_name) {
		if (this._skipscroll[editor_name] === true) {
			// scrolling one side causes the other to event - ignore it
			this._skipscroll[editor_name] = false;
			return;
		}
		var scroller = jQuery(this.editor[editor_name].getScrollerElement());
		if (this.midway == undefined) {
			this.midway = (scroller.height() / 2.0 + scroller.offset().top).toFixed(2);
		}
		// balance-line
		var midline = this.editor[editor_name].coordsChar({left:0, top:this.midway});
		var top_to = scroller.scrollTop();
		var left_to = scroller.scrollLeft();
		
		this.trace('scroll', 'side', editor_name);
		this.trace('scroll', 'midway', this.midway);
		this.trace('scroll', 'midline', midline);
		this.trace('scroll', 'top_to', top_to);
		this.trace('scroll', 'left_to', left_to);
		
		var editor_name1 = this.id + '-lhs';
		var editor_name2 = this.id + '-rhs';
		
		for (var name in this.editor) {
			if (!this.editor.hasOwnProperty(name)) continue;
			if (editor_name == name) continue; //same editor
			var this_side = editor_name.replace(this.id + '-', '');
			var other_side = name.replace(this.id + '-', '');
			var top_adjust = 0;
			
			// find the last change that is less than or within the midway point
			// do not move the rhs until the lhs end point is >= the rhs end point.
			var last_change = null;
			var force_scroll = false;
			for (var i = 0; i < this.changes.length; ++i) {
				var change = this.changes[i];
				if ((midline.line >= change[this_side+'-line-from'])) {
					last_change = change;
					if (midline.line >= last_change[this_side+'-line-to']) {
						if (!change.hasOwnProperty(this_side+'-y-start') ||
							!change.hasOwnProperty(this_side+'-y-end') ||
							!change.hasOwnProperty(other_side+'-y-start') ||
							!change.hasOwnProperty(other_side+'-y-end')){
							// change outside of viewport
							force_scroll = true;
						}
						else {
							top_adjust += 
								(change[this_side+'-y-end'] - change[this_side+'-y-start']) - 
								(change[other_side+'-y-end'] - change[other_side+'-y-start']);
						}
					}
				}
			}
			
			var vp = this.editor[name].getViewport();
			var scroll = true;
			if (last_change) {
				this.trace('scroll', 'last change before midline', last_change);
				if (midline.line >= vp.from && midline <= vp.to) {
					scroll = false;
				}
			}
			this.trace('scroll', 'scroll', scroll);
			if (scroll || force_scroll) {
				// scroll the other side
				this.trace('scroll', 'scrolling other side', top_to - top_adjust);
				var scroller = jQuery(this.editor[name].getScrollerElement());
				this._skipscroll[name] = true;//disable next event
				scroller.scrollTop(top_to - top_adjust).scrollLeft(left_to);
			}
			else this.trace('scroll', 'not scrolling other side');
			
			if (this.settings.autoupdate) {
				var timer = new Mgly.Timer();
				this._calculate_offsets(editor_name1, editor_name2, this.changes, this._additionalHighlights || []);
				this.trace('change', 'offsets time', timer.stop());
				this._markup_changes(editor_name1, editor_name2, this.changes);
				this.trace('change', 'markup time', timer.stop());
				this._draw_diff(editor_name1, editor_name2, this.changes, this._additionalHighlights || []);
				this.trace('change', 'draw time', timer.stop());
			}
			this.trace('scroll', 'scrolled');
		}
	},
	_changing: function(editor_name1, editor_name2) {
		this.trace('change', 'changing-timeout', this.changed_timeout);
		var self = this;
		if (this.changed_timeout != null) clearTimeout(this.changed_timeout);
		this.changed_timeout = setTimeout(function(){
			var timer = new Mgly.Timer();
			self._changed(editor_name1, editor_name2);
			self.trace('change', 'total time', timer.stop());
		}, this.settings.change_timeout);
	},
	_changed: function(editor_name1, editor_name2) {
		this._clear();
		this._diff(editor_name1, editor_name2);
	},
	_clear: function() {
		var self = this;
		for (var name in this.editor) {
			if (!this.editor.hasOwnProperty(name)) continue;
			var editor = this.editor[name];
			var fns = self.chfns[name];
			// clear editor changes
			editor.operation(function() {
				var timer = new Mgly.Timer();
				for (var i = 0, l = editor.lineCount(); i < l; ++i) {
					editor.removeLineClass(i, 'background');
				}
				for (var i = 0; i < fns.length; ++i) {
					//var edid = editor.getDoc().id;
					var change = fns[i];
					//if (change.doc.id != edid) continue;
					if (change.lines.length) {
						self.trace('change', 'clear text', change.lines[0].text);
					}
					change.clear();
				}
				editor.clearGutter('merge');
				self.trace('change', 'clear time', timer.stop());
			});
		}
		self.chfns[name] = [];
		
		var ex = this._draw_info(this.id + '-lhs', this.id + '-rhs');
		var ctx_lhs = ex.clhs.get(0).getContext('2d');
		var ctx_rhs = ex.crhs.get(0).getContext('2d');
		var ctx = ex.dcanvas.getContext('2d');
		
		ctx_lhs.beginPath();
		ctx_lhs.fillStyle = this.settings.bgcolor;
		ctx_lhs.strokeStyle = '#888';
		ctx_lhs.fillRect(0, 0, 6.5, ex.visible_page_height);
		ctx_lhs.strokeRect(0, 0, 6.5, ex.visible_page_height);

		ctx_rhs.beginPath();
		ctx_rhs.fillStyle = this.settings.bgcolor;
		ctx_rhs.strokeStyle = '#888';
		ctx_rhs.fillRect(0, 0, 6.5, ex.visible_page_height);
		ctx_rhs.strokeRect(0, 0, 6.5, ex.visible_page_height);
		
		ctx.beginPath();
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, this.draw_mid_width, ex.visible_page_height);
	},
	_diff: function(editor_name1, editor_name2) {
		var lhs = this.editor[editor_name1].getValue();
		var rhs = this.editor[editor_name2].getValue();
		var timer = new Mgly.Timer();
		var d = this.settings.diff_behavior.DiffLines(lhs, rhs, this.settings);
		this.trace('change', 'diff time', timer.stop());
		this.changes = this.settings.diff_behavior.Parse(d, this.settings);
		this.trace('change', 'parse time', timer.stop());
		this._calculate_offsets(editor_name1, editor_name2, this.changes, this._additionalHighlights || []);
		this.trace('change', 'offsets time', timer.stop());
		this._markup_changes(editor_name1, editor_name2, this.changes);
		this.trace('change', 'markup time', timer.stop());
		this._draw_diff(editor_name1, editor_name2, this.changes, this._additionalHighlights || []);
		this.trace('change', 'draw time', timer.stop());
	},
	_parse_diff: function (editor_name1, editor_name2, diff) {
		this.trace('diff', 'diff results:\n', diff);
		var changes = [];
		var change_id = 0;
		// parse diff
		var diff_lines = diff.split(/\n/);
		for (var i = 0; i < diff_lines.length; ++i) {
			if (diff_lines[i].length == 0) continue;
			var change = {};
			var test = this.change_exp.exec(diff_lines[i]);
			if (test == null) continue;
			// lines are zero-based
			var fr = test[1].split(',');
			change['lhs-line-from'] = fr[0] - 1;
			if (fr.length == 1) change['lhs-line-to'] = fr[0] - 1;
			else change['lhs-line-to'] = fr[1] - 1;
			var to = test[3].split(',');
			change['rhs-line-from'] = to[0] - 1;
			if (to.length == 1) change['rhs-line-to'] = to[0] - 1;
			else change['rhs-line-to'] = to[1] - 1;
			// TODO: optimize for changes that are adds/removes
			if (change['lhs-line-from'] < 0) change['lhs-line-from'] = 0;
			if (change['lhs-line-to'] < 0) change['lhs-line-to'] = 0;
			if (change['rhs-line-from'] < 0) change['rhs-line-from'] = 0;
			if (change['rhs-line-to'] < 0) change['rhs-line-to'] = 0;
			change['op'] = test[2];
			changes[change_id++] = change;
			this.trace('diff', 'change', change);
		}
		return changes;
	},
	_replace_auto_colors: function(colors, existingTestElem) {
		var testElem = existingTestElem || jQuery('<div></div>').attr('style', 'display: none !important').appendTo(this.element);
		for(var c in colors) {
			if(typeof colors[c] === 'string') {
				var colorParams = /^auto:([^:]+):(.*)$/.exec(colors[c]);
				if(colorParams !== null) {
					testElem.attr('class', colorParams[2]);
					colors[c] = testElem.css(colorParams[1]);
				}
			}
			else { // Assume object
				this._replace_auto_colors(colors[c], testElem);
			}
		}
		if(!existingTestElem) testElem.remove();
	},
	_get_viewport: function(editor_name1, editor_name2) {
		var lhsvp = this.editor[editor_name1].getViewport();
		var rhsvp = this.editor[editor_name2].getViewport();
		return {from: Math.min(lhsvp.from, rhsvp.from), to: Math.max(lhsvp.to, rhsvp.to)};
	},
	_is_change_in_view: function(vp, change) {
		if (!this.settings.viewport) return true;
		if ((change['lhs-line-from'] < vp.from && change['lhs-line-to'] < vp.to) ||
			(change['lhs-line-from'] > vp.from && change['lhs-line-to'] > vp.to) ||
			(change['rhs-line-from'] < vp.from && change['rhs-line-to'] < vp.to) ||
			(change['rhs-line-from'] > vp.from && change['rhs-line-to'] > vp.to)) {
			// if the change is outside the viewport, skip
			return false;
		}
		return true;
	},
	_is_highlight_in_view: function(vp, highlight) {
		if (!this.settings.viewport) return true;
		if ((highlight['line-from'] < vp.from && highlight['line-to'] < vp.to) ||
			(highlight['line-from'] > vp.from && highlight['line-to'] > vp.to)) {
			// if the highlight is outside the viewport, skip
			return false;
		}
		return true;
	},
	_set_top_offset: function (editor_name1) {
		// save the current scroll position of the editor
		var saveY = this.editor[editor_name1].getScrollInfo().top;
		// temporarily scroll to top
		this.editor[editor_name1].scrollTo(null, 0);
		
		// this is the distance from the top of the screen to the top of the 
		// content of the first codemirror editor
		var topnode = jQuery('#' + this.id + ' .CodeMirror-measure').first();
		var top_offset = topnode.offset().top - 4;
		if(!top_offset) return false;
		
		// restore editor's scroll position
		this.editor[editor_name1].scrollTo(null, saveY);
		
		this.draw_top_offset = 0.5 - top_offset;
		return true;
	},
	_calculate_line_position: function(editor_name, lineNum, firstLineCoords) {
		if(!firstLineCoords) firstLineCoords = this.editor[editor_name].charCoords({line: 0}); // Much faster if this is passed in when used repeatedly
		if (this.editor[editor_name].getOption('lineWrapping')) {
			// If using line-wrapping, we must get the height of the line
			var coords = this.editor[editor_name].cursorCoords({line: lineNum, ch: 0}, 'page');
			var handle = this.editor[editor_name].getLineHandle(lineNum);
			return { top: coords.top, bottom: coords.top + handle.height };
		}
		else {
			// If not using line-wrapping, we can calculate the line position
			return {
				top: firstLineCoords.top + lineNum * this.em_height,
				bottom: firstLineCoords.bottom + lineNum * this.em_height + 2
			};
		}
	},
	_calculate_offsets: function (editor_name1, editor_name2, changes, additionalHighlights) {
		if (this.em_height == null) {
			if(!this._set_top_offset(editor_name1)) return; //try again
			this.em_height = this.editor[editor_name1].defaultTextHeight();
			if (!this.em_height) {
				console.warn('Failed to calculate offsets, using 18 by default');
				this.em_height = 18;
			}
			this.draw_lhs_min = 0.5;
			var c = jQuery('#' + editor_name1 + '-' + editor_name2 + '-canvas');
			if (!c.length) {
				console.error('failed to find canvas', '#' + editor_name1 + '-' + editor_name2 + '-canvas');
			}
			if (!c.width()) {
				console.error('canvas width is 0');
				return;
			}
			this.draw_mid_width = jQuery('#' + editor_name1 + '-' + editor_name2 + '-canvas').width();
			this.draw_rhs_max = this.draw_mid_width - 0.5; //24.5;
			this.draw_lhs_width = 5;
			this.draw_rhs_width = 5;
			this.trace('calc', 'change offsets calculated', {top_offset: this.draw_top_offset, lhs_min: this.draw_lhs_min, rhs_max: this.draw_rhs_max, lhs_width: this.draw_lhs_width, rhs_width: this.draw_rhs_width});
		}
		var lhschc = this.editor[editor_name1].charCoords({line: 0});
		var rhschc = this.editor[editor_name2].charCoords({line: 0});
		var vp = this._get_viewport(editor_name1, editor_name2);
		
		for (var i = 0; i < changes.length; ++i) {
			var change = changes[i];
			
			if (!this.settings.sidebar && !this._is_change_in_view(vp, change)) {
				// if the change is outside the viewport, skip
				delete change['lhs-y-start'];
				delete change['lhs-y-end'];
				delete change['rhs-y-start'];
				delete change['rhs-y-end'];
				continue;
			}
			var llf = change['lhs-line-from'] >= 0 ? change['lhs-line-from'] : 0;
			var llt = change['lhs-line-to'] >= 0 ? change['lhs-line-to'] : 0;
			var rlf = change['rhs-line-from'] >= 0 ? change['rhs-line-from'] : 0;
			var rlt = change['rhs-line-to'] >= 0 ? change['rhs-line-to'] : 0;
			
			var ls = this._calculate_line_position(editor_name1, llf, lhschc);
			var le = this._calculate_line_position(editor_name1, llt, lhschc);
			var rs = this._calculate_line_position(editor_name2, rlf, rhschc);
			var re = this._calculate_line_position(editor_name2, rlt, rhschc);
			
			if (change['op'] == 'a') {
				// adds (right), normally start from the end of the lhs,
				// except for the case when the start of the rhs is 0
				if (rlf > 0) {
					ls.top = ls.bottom;
					ls.bottom += this.em_height;
					le = ls;
				}
			}
			else if (change['op'] == 'd') {
				// deletes (left) normally finish from the end of the rhs,
				// except for the case when the start of the lhs is 0
				if (llf > 0) {
					rs.top = rs.bottom;
					rs.bottom += this.em_height;
					re = rs;
				}
			}
			change['lhs-y-start'] = this.draw_top_offset + ls.top;
			if (change['op'] == 'c' || change['op'] == 'd') {
				change['lhs-y-end'] = this.draw_top_offset + le.bottom;
			}
			else {
				change['lhs-y-end'] = this.draw_top_offset + le.top;
			}
			change['rhs-y-start'] = this.draw_top_offset + rs.top;
			if (change['op'] == 'c' || change['op'] == 'a') {
				change['rhs-y-end'] = this.draw_top_offset + re.bottom;
			}
			else {
				change['rhs-y-end'] = this.draw_top_offset + re.top;
			}
			this.trace('calc', 'change calculated', i, change);
		}

		for (var i = 0; i < additionalHighlights.length; ++i) {
			var highlight = additionalHighlights[i];

			if (!this.settings.sidebar && !this._is_highlight_in_view(vp, highlight)) {
				// if the highlight is outside the viewport, skip
				delete highlight['y-start'];
				delete highlight['y-end'];
				continue;
			}

			var editor_name = highlight.side === 'lhs' ? editor_name1 : (highlight.side === 'rhs' ? editor_name2 : undefined);
			var hschc = highlight.side === 'lhs' ? lhschc : (highlight.side === 'rhs' ? rhschc : undefined);

			var lf = highlight['line-from'] >= 0 ? highlight['line-from'] : 0;
			var lt = highlight['line-to'] >= 0 ? highlight['line-to'] : 0;

			var hs = this._calculate_line_position(editor_name, lf, hschc);
			var he = this._calculate_line_position(editor_name, lt, hschc);

			highlight['y-start'] = this.draw_top_offset + hs.top;
			highlight['y-end'] = this.draw_top_offset + he.bottom;
			this.trace('calc', 'highlight calculated', i, highlight);
		}

		return changes;
	},
	_markup_changes: function (editor_name1, editor_name2, changes) {
		jQuery('.merge-button').remove(); // clear
		
		var self = this;
		var led = this.editor[editor_name1];
		var red = this.editor[editor_name2];

		var timer = new Mgly.Timer();
		led.operation(function() {
			for (var i = 0; i < changes.length; ++i) {
				var change = changes[i];
				var llf = change['lhs-line-from'] >= 0 ? change['lhs-line-from'] : 0;
				var llt = change['lhs-line-to'] >= 0 ? change['lhs-line-to'] : 0;
				var rlf = change['rhs-line-from'] >= 0 ? change['rhs-line-from'] : 0;
				var rlt = change['rhs-line-to'] >= 0 ? change['rhs-line-to'] : 0;
				
				var clazz = ['mergely', 'lhs', change['op'], 'cid-' + i];
				led.addLineClass(llf, 'background', 'start');
				led.addLineClass(llt, 'background', 'end');
				
				if (llf == 0 && llt == 0 && rlf == 0) {
					led.addLineClass(llf, 'background', clazz.join(' '));
					led.addLineClass(llf, 'background', 'first');
				}
				else {
					// apply change for each line in-between the changed lines
					for (var j = llf; j <= llt; ++j) {
						led.addLineClass(j, 'background', clazz.join(' '));
						led.addLineClass(j, 'background', clazz.join(' '));
					}
				}
				
				if (!red.getOption('readOnly')) {
					// add widgets to lhs, if rhs is not read only
					var rhs_button = self.merge_rhs_button.clone();
					if (rhs_button.button) {
						//jquery-ui support
						rhs_button.button({icons: {primary: 'ui-icon-triangle-1-e'}, text: false});
					}
					rhs_button.addClass('merge-button');
					rhs_button.attr('id', 'merge-rhs-' + i);
					led.setGutterMarker(llf, 'merge', rhs_button.get(0));
				}
			}
		});

		var vp = this._get_viewport(editor_name1, editor_name2);
		
		this.trace('change', 'markup lhs-editor time', timer.stop());
		red.operation(function() {
			for (var i = 0; i < changes.length; ++i) {
				var change = changes[i];
				var llf = change['lhs-line-from'] >= 0 ? change['lhs-line-from'] : 0;
				var llt = change['lhs-line-to'] >= 0 ? change['lhs-line-to'] : 0;
				var rlf = change['rhs-line-from'] >= 0 ? change['rhs-line-from'] : 0;
				var rlt = change['rhs-line-to'] >= 0 ? change['rhs-line-to'] : 0;
				
				if (!self._is_change_in_view(vp, change)) {
					// if the change is outside the viewport, skip
					continue;
				}
				
				var clazz = ['mergely', 'rhs', change['op'], 'cid-' + i];
				red.addLineClass(rlf, 'background', 'start');
				red.addLineClass(rlt, 'background', 'end');
				
				if (rlf == 0 && rlt == 0 && llf == 0) {
					red.addLineClass(rlf, 'background', clazz.join(' '));
					red.addLineClass(rlf, 'background', 'first');
				}
				else {
					// apply change for each line in-between the changed lines
					for (var j = rlf; j <= rlt; ++j) {
						red.addLineClass(j, 'background', clazz.join(' '));
						red.addLineClass(j, 'background', clazz.join(' '));
					}
				}

				if (!led.getOption('readOnly')) {
					// add widgets to rhs, if lhs is not read only
					var lhs_button = self.merge_lhs_button.clone();
					if (lhs_button.button) {
						//jquery-ui support
						lhs_button.button({icons: {primary: 'ui-icon-triangle-1-w'}, text: false});
					}
					lhs_button.addClass('merge-button');
					lhs_button.attr('id', 'merge-lhs-' + i);
					red.setGutterMarker(rlf, 'merge', lhs_button.get(0));
				}
			}
		});
		this.trace('change', 'markup rhs-editor time', timer.stop());
		
		// mark text deleted, LCS changes
		var marktext = [];
		for (var i = 0; this.settings.lcs && i < changes.length; ++i) {
			var change = changes[i];
			var llf = change['lhs-line-from'] >= 0 ? change['lhs-line-from'] : 0;
			var llt = change['lhs-line-to'] >= 0 ? change['lhs-line-to'] : 0;
			var rlf = change['rhs-line-from'] >= 0 ? change['rhs-line-from'] : 0;
			var rlt = change['rhs-line-to'] >= 0 ? change['rhs-line-to'] : 0;
			
			if (!this._is_change_in_view(vp, change)) {
				// if the change is outside the viewport, skip
				continue;
			}
			if (change['op'] == 'd') {
				// apply delete to cross-out (left-hand side only)
				var from = llf;
				var to = llt;
				var to_ln = led.lineInfo(to);
				if (to_ln) {
					marktext.push([led, {line:from, ch:0}, {line:to, ch:to_ln.text.length}, {className: 'mergely ch d lhs'}]);
				}
			}
			else if (change['op'] == 'c') {
				var leftLines = [], rightLines = [];
				led.eachLine(llf, llt + 2, function(lh) { leftLines.push(lh.text); });
				red.eachLine(rlf, rlt + 2, function(lh) { rightLines.push(lh.text); });

				function added(fromLine, fromChar, toLine, toChar) {
					marktext.push([red, {line:rlf+fromLine, ch:fromChar}, {line:rlf+toLine, ch:toChar}, {className:'mergely ch a rhs'}]);
				}
				function deleted(fromLine, fromChar, toLine, toChar) {
					marktext.push([led, {line:llf+fromLine, ch:fromChar}, {line:llf+toLine, ch:toChar}, {className: 'mergely ch d lhs'}]);
				}

				this.settings.diff_behavior.DiffChars(
					leftLines, rightLines,
					added, deleted,
					this.settings
				);
			}
		}
		this.trace('change', 'LCS marktext time', timer.stop());
		
		// mark changes outside closure
		led.operation(function() {
			// apply lhs markup
			for (var i = 0; i < marktext.length; ++i) {
				var m = marktext[i];
				if (m[0].doc.id != led.getDoc().id) continue;
				self.chfns[self.id + '-lhs'].push(m[0].markText(m[1], m[2], m[3]));
			}
		});
		red.operation(function() {
			// apply lhs markup
			for (var i = 0; i < marktext.length; ++i) {
				var m = marktext[i];
				if (m[0].doc.id != red.getDoc().id) continue;
				self.chfns[self.id + '-rhs'].push(m[0].markText(m[1], m[2], m[3]));
			}
		});
		this.trace('change', 'LCS markup time', timer.stop());
		
		// merge buttons
		var ed = {lhs:led, rhs:red};
		jQuery('.merge-button').on('click', function(ev){
			// side of mouseenter
			var side = 'rhs';
			var oside = 'lhs';
			var parent = jQuery(this).parents('#' + self.id + '-editor-lhs');
			if (parent.length) {
				side = 'lhs';
				oside = 'rhs';
			}
			var pos = ed[side].coordsChar({left:ev.pageX, top:ev.pageY});

			// get the change id
			var cid = null;
			var info = ed[side].lineInfo(pos.line);
			jQuery.each(info.bgClass.split(' '), function(i, clazz) {
				if (clazz.indexOf('cid-') == 0) {
					cid = parseInt(clazz.split('-')[1], 10);
					return false;
				}
			});
			var change = self.changes[cid];

			var line = {lhs: ed['lhs'].lineInfo(llt), rhs: ed['rhs'].lineInfo(rlt)};
	
			var text = ed[side].getRange(
				CodeMirror.Pos(change[side + '-line-from'], 0),
				CodeMirror.Pos(change[side + '-line-to'] + 1, 0));
			
			if (change['op'] == 'c') {
				ed[oside].replaceRange(text,
					CodeMirror.Pos(change[oside + '-line-from'], 0),
					CodeMirror.Pos(change[oside + '-line-to'] + 1, 0));
			}
			else if (side == 'rhs') {
				if (change['op'] == 'a') {
					ed[oside].replaceRange(text,
						CodeMirror.Pos(change[oside + '-line-from'] + 1, 0),
						CodeMirror.Pos(change[oside + '-line-to'] + 1, 0));
				}
				else {// 'd'
					var from = parseInt(change[oside + '-line-from']);
					var to = parseInt(change[oside + '-line-to']);
					for (var i = to; i >= from; --i) {
						ed[oside].removeLine(i);
					}
				}
			}
			else if (side == 'lhs') {
				if (change['op'] == 'a') {
					var from = parseInt(change[oside + '-line-from']);
					var to = parseInt(change[oside + '-line-to']);
					for (var i = to; i >= from; --i) {
						ed[oside].removeLine(i);
					}
				}
				else {// 'd'
					ed[oside].replaceRange( text,
						CodeMirror.Pos(change[oside + '-line-from'] + 1, 0));
				}
			}
			//reset
			ed['lhs'].setValue(ed['lhs'].getValue());
			ed['rhs'].setValue(ed['rhs'].getValue());
			return false;
		});
		this.trace('change', 'markup buttons time', timer.stop());
	},
	_draw_info: function(editor_name1, editor_name2) {
		var visible_page_height = jQuery(this.editor[editor_name1].getScrollerElement()).height(); // Both sides same height
		var lhs_gutter_height = jQuery(this.editor[editor_name1].getScrollerElement()).children(':first-child').height();
		var rhs_gutter_height = jQuery(this.editor[editor_name2].getScrollerElement()).children(':first-child').height();
		var dcanvas = document.getElementById(editor_name1 + '-' + editor_name2 + '-canvas');
		if (dcanvas == undefined) throw 'Failed to find: ' + editor_name1 + '-' + editor_name2 + '-canvas';
		var clhs = jQuery('#' + this.id + '-lhs-margin');
		var crhs = jQuery('#' + this.id + '-rhs-margin');
		return {
			visible_page_height: visible_page_height,
			lhs_gutter_height: lhs_gutter_height,
			rhs_gutter_height: rhs_gutter_height,
			lhs_visible_page_ratio: (visible_page_height / lhs_gutter_height),
			rhs_visible_page_ratio: (visible_page_height / rhs_gutter_height),
			lhs_scroller: jQuery(this.editor[editor_name1].getScrollerElement()),
			rhs_scroller: jQuery(this.editor[editor_name2].getScrollerElement()),
			lhs_lines: this.editor[editor_name1].lineCount(),
			rhs_lines: this.editor[editor_name2].lineCount(),
			dcanvas: dcanvas,
			clhs: clhs,
			crhs: crhs,
			lhs_xyoffset: jQuery(clhs).offset(),
			rhs_xyoffset: jQuery(crhs).offset()
		};
	},
	_draw_diff: function(editor_name1, editor_name2, changes, additionalHighlights) {
		var ex = this._draw_info(editor_name1, editor_name2);
		var mcanvas_lhs = ex.clhs.get(0);
		var mcanvas_rhs = ex.crhs.get(0);
		var ctx = ex.dcanvas.getContext('2d');
		var ctx_lhs = mcanvas_lhs.getContext('2d');
		var ctx_rhs = mcanvas_rhs.getContext('2d');

		this.trace('draw', 'visible_page_height', ex.visible_page_height);
		this.trace('draw', 'lhs_gutter_height', ex.lhs_gutter_height);
		this.trace('draw', 'rhs_gutter_height', ex.rhs_gutter_height);
		this.trace('draw', 'lhs_visible_page_ratio', ex.lhs_visible_page_ratio);
		this.trace('draw', 'rhs_visible_page_ratio', ex.rhs_visible_page_ratio);
		this.trace('draw', 'lhs-scroller-top', ex.lhs_scroller.scrollTop());
		this.trace('draw', 'rhs-scroller-top', ex.rhs_scroller.scrollTop());
		
		jQuery.each(jQuery.find('#' + this.id + ' canvas'), function () {
			jQuery(this).get(0).height = ex.visible_page_height;
		});
		
		ex.clhs.unbind('click');
		ex.crhs.unbind('click');
		
		ctx_lhs.beginPath();
		ctx_lhs.fillStyle = this.settings.bgcolor;
		ctx_lhs.strokeStyle = '#888';
		ctx_lhs.fillRect(0, 0, 6.5, ex.visible_page_height);
		ctx_lhs.strokeRect(0, 0, 6.5, ex.visible_page_height);

		ctx_rhs.beginPath();
		ctx_rhs.fillStyle = this.settings.bgcolor;
		ctx_rhs.strokeStyle = '#888';
		ctx_rhs.fillRect(0, 0, 6.5, ex.visible_page_height);
		ctx_rhs.strokeRect(0, 0, 6.5, ex.visible_page_height);

		var vp = this._get_viewport(editor_name1, editor_name2);
		for (var i = 0; i < changes.length; ++i) {
			var change = changes[i];

			this.trace('draw', change);
			// margin indicators
			var lhs_y_start = ((change['lhs-y-start'] + ex.lhs_scroller.scrollTop()) * ex.lhs_visible_page_ratio);
			var lhs_y_end = ((change['lhs-y-end'] + ex.lhs_scroller.scrollTop()) * ex.lhs_visible_page_ratio) + 1;
			var rhs_y_start = ((change['rhs-y-start'] + ex.rhs_scroller.scrollTop()) * ex.rhs_visible_page_ratio);
			var rhs_y_end = ((change['rhs-y-end'] + ex.rhs_scroller.scrollTop()) * ex.rhs_visible_page_ratio) + 1;
			this.trace('draw', 'marker calculated', lhs_y_start, lhs_y_end, rhs_y_start, rhs_y_end);

			ctx_lhs.beginPath();
			ctx_lhs.fillStyle = this.settings.fgcolor[change['op']];
			ctx_lhs.strokeStyle = '#000';
			ctx_lhs.lineWidth = 0.5;
			ctx_lhs.fillRect(1.5, lhs_y_start, 4.5, Math.max(lhs_y_end - lhs_y_start, 5));
			ctx_lhs.strokeRect(1.5, lhs_y_start, 4.5, Math.max(lhs_y_end - lhs_y_start, 5));

			ctx_rhs.beginPath();
			ctx_rhs.fillStyle = this.settings.fgcolor[change['op']];
			ctx_rhs.strokeStyle = '#000';
			ctx_rhs.lineWidth = 0.5;
			ctx_rhs.fillRect(1.5, rhs_y_start, 4.5, Math.max(rhs_y_end - rhs_y_start, 5));
			ctx_rhs.strokeRect(1.5, rhs_y_start, 4.5, Math.max(rhs_y_end - rhs_y_start, 5));
			
			if (!this._is_change_in_view(vp, change)) {
				continue;
			}
			
			lhs_y_start = change['lhs-y-start'];
			lhs_y_end = change['lhs-y-end'];
			rhs_y_start = change['rhs-y-start'];
			rhs_y_end = change['rhs-y-end'];
			
			var radius = 3;
			
			// draw left box
			ctx.beginPath();
			ctx.strokeStyle = this.settings.fgcolor[change['op']];
			ctx.lineWidth = 1;
			
			var rectWidth = this.draw_lhs_width;
			var rectHeight = lhs_y_end - lhs_y_start - 1;
			var rectX = this.draw_lhs_min;
			var rectY = lhs_y_start;
			// top and top top-right corner
			
			// draw left box
			ctx.moveTo(rectX, rectY);
			if (navigator.appName == 'Microsoft Internet Explorer') {
				// IE arcs look awful
				ctx.lineTo(this.draw_lhs_min + this.draw_lhs_width, lhs_y_start);
				ctx.lineTo(this.draw_lhs_min + this.draw_lhs_width, lhs_y_end + 1);
				ctx.lineTo(this.draw_lhs_min, lhs_y_end + 1);
			}
			else {
				if (rectHeight <= 0) {
					ctx.lineTo(rectX + rectWidth, rectY);
				}
				else {
					ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius, radius);
					ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight, radius);
				}
				// bottom line
				ctx.lineTo(rectX, rectY + rectHeight);
			}
			ctx.stroke();
			
			rectWidth = this.draw_rhs_width;
			rectHeight = rhs_y_end - rhs_y_start - 1;
			rectX = this.draw_rhs_max;
			rectY = rhs_y_start;

			// draw right box
			ctx.moveTo(rectX, rectY);
			if (navigator.appName == 'Microsoft Internet Explorer') {
				ctx.lineTo(this.draw_rhs_max - this.draw_rhs_width, rhs_y_start);
				ctx.lineTo(this.draw_rhs_max - this.draw_rhs_width, rhs_y_end + 1);
				ctx.lineTo(this.draw_rhs_max, rhs_y_end + 1);
			}
			else {
				if (rectHeight <= 0) {
					ctx.lineTo(rectX - rectWidth, rectY);
				}
				else {
					ctx.arcTo(rectX - rectWidth, rectY, rectX - rectWidth, rectY + radius, radius);
					ctx.arcTo(rectX - rectWidth, rectY + rectHeight, rectX - radius, rectY + rectHeight, radius);
				}
				ctx.lineTo(rectX, rectY + rectHeight);
			}
			ctx.stroke();
			
			// connect boxes
			var cx = this.draw_lhs_min + this.draw_lhs_width;
			var cy = lhs_y_start + (lhs_y_end + 1 - lhs_y_start) / 2.0;
			var dx = this.draw_rhs_max - this.draw_rhs_width;
			var dy = rhs_y_start + (rhs_y_end + 1 - rhs_y_start) / 2.0;
			ctx.moveTo(cx, cy);
			if (cy == dy) {
				ctx.lineTo(dx, dy);
			}
			else {
				// fancy!
				ctx.bezierCurveTo(
					cx + 12, cy - 3, // control-1 X,Y
					dx - 12, dy - 3, // control-2 X,Y
					dx, dy);
			}
			ctx.stroke();
		}

		for (var i = 0; additionalHighlights && i < additionalHighlights.length; ++i) {
			var highlight = additionalHighlights[i];

			var ctx_side = highlight.side === 'lhs' ? ctx_lhs : (highlight.side === 'rhs' ? ctx_rhs : undefined);
			var visible_page_ratio = ex[highlight.side + '_visible_page_ratio'];

			this.trace('draw highlight', highlight);
			// margin indicators
			var y_start = ((highlight['y-start'] + ex[highlight.side + '_scroller'].scrollTop()) * visible_page_ratio);
			var y_end = ((highlight['y-end'] + ex[highlight.side + '_scroller'].scrollTop()) * visible_page_ratio) + 1;
			this.trace('draw highlight', 'marker calculated', y_start, y_end);

			ctx_side.beginPath();
			ctx_side.fillStyle = highlight.color || this.settings.hcolor;
			ctx_side.strokeStyle = '#000';
			ctx_side.lineWidth = 0.5;
			ctx_side.fillRect(1.5, y_start, 4.5, Math.max(y_end - y_start, 5));
			ctx_side.strokeRect(1.5, y_start, 4.5, Math.max(y_end - y_start, 5));
		}

		// visible window feedback
		ctx_lhs.fillStyle = this.settings.vpcolor;
		ctx_rhs.fillStyle = this.settings.vpcolor;
		
		var lto = ex.clhs.height() * ex.lhs_visible_page_ratio;
		var lfrom = (ex.lhs_scroller.scrollTop() / ex.lhs_gutter_height) * ex.clhs.height();
		var rto = ex.crhs.height() * ex.rhs_visible_page_ratio;
		var rfrom = (ex.rhs_scroller.scrollTop() / ex.rhs_gutter_height) * ex.crhs.height();
		this.trace('draw', 'cls.height', ex.clhs.height());
		this.trace('draw', 'lhs_scroller.scrollTop()', ex.lhs_scroller.scrollTop());
		this.trace('draw', 'lhs_gutter_height', ex.lhs_gutter_height);
		this.trace('draw', 'rhs_gutter_height', ex.rhs_gutter_height);
		this.trace('draw', 'lhs_visible_page_ratio', ex.lhs_visible_page_ratio);
		this.trace('draw', 'rhs_visible_page_ratio', ex.rhs_visible_page_ratio);
		this.trace('draw', 'lhs from', lfrom, 'lhs to', lto);
		this.trace('draw', 'rhs from', rfrom, 'rhs to', rto);
		
		ctx_lhs.fillRect(1.5, lfrom, 4.5, lto);
		ctx_rhs.fillRect(1.5, rfrom, 4.5, rto);
		
		ex.clhs.click(function (ev) {
			var y = ev.pageY - ex.lhs_xyoffset.top - (lto / 2);
			var sto = Math.max(0, (y / mcanvas_lhs.height) * ex.lhs_scroller.get(0).scrollHeight);
			ex.lhs_scroller.scrollTop(sto);
		});
		ex.crhs.click(function (ev) {
			var y = ev.pageY - ex.rhs_xyoffset.top - (rto / 2);
			var sto = Math.max(0, (y / mcanvas_rhs.height) * ex.rhs_scroller.get(0).scrollHeight);			
			ex.rhs_scroller.scrollTop(sto);
		});
	},
	trace: function(name) {
		if(this.settings._debug.indexOf(name) >= 0) {
			arguments[0] = name+':';
			console.log([].slice.apply(arguments));
		} 
	}
});

jQuery.pluginMaker = function(plugin) {
	// add the plugin function as a jQuery plugin
	jQuery.fn[plugin.prototype.name] = function(options) {
		// get the arguments 
		var args = jQuery.makeArray(arguments),
		after = args.slice(1);
		var rc = undefined;
		this.each(function() {
			// see if we have an instance
			var instance = jQuery.data(this, plugin.prototype.name);
			if (instance) {
				// call a method on the instance
				if (typeof options == "string") {
					rc = instance[options].apply(instance, after);
				} else if (instance.update) {
					// call update on the instance
					return instance.update.apply(instance, args);
				}
			} else {
				// create the plugin
				new plugin(this, options);
			}
		});
		if (rc != undefined) return rc;
	};
};

// make the mergely widget
jQuery.pluginMaker(Mgly.mergely);
