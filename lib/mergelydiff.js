MglyDiff = {};

MglyDiff.StockBehavior = {
	DiffLines: function(lhs, rhs, settings) {
		var d = new MglyDiff.diff(lhs, rhs, settings);
		return d.normal_form();
	},
	DiffChars: function(lhs_lines, rhs_lines, added, deleted, settings) {
		// apply LCS changes to each line
		for (var j = 0; j < lhs_lines.length || j < rhs_lines.length; ++j) {
			if (j >= rhs_lines.length) {
				// lhs continues past rhs, mark lhs as deleted
				var lhs_line = lhs_lines[j];
				deleted(j, 0, j, lhs_line.length);
				continue;
			}
			if (j >= lhs_lines.length) {
				// rhs continues past lhs, mark rhs as added
				var rhs_line = rhs_lines[j];
				added(j, 0, j, rhs_line.length);
				continue;
			}
			var lhs_line = lhs_lines[j];
			var rhs_line = rhs_lines[j];

			var lcs = new MglyDiff.LCS(lhs_line, rhs_line);
			lcs.diff(function (from, to) {
				added(j, from, j, to);
			}, function (from, to) {
				deleted(j, from, j, to);
			});
		}
	},
	Parse: function(diff, settings) {
		return MglyDiff.DiffParser(diff);
	}
};

MglyDiff.ChangeExpression = new RegExp(/(^(?![><-])*\d+(?:,\d+)?)([acd])(\d+(?:,\d+)?)/);

MglyDiff.DiffParser = function(diff) {
	var changes = [];
	var change_id = 0;
	// parse diff
	var diff_lines = diff.split(/\n/);
	for (var i = 0; i < diff_lines.length; ++i) {
		if (diff_lines[i].length == 0) continue;
		var change = {};
		var test = MglyDiff.ChangeExpression.exec(diff_lines[i]);
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
		change['op'] = test[2];
		changes[change_id++] = change;
	}
	return changes;
}

MglyDiff.LCS = function(x, y) {
	this.x = x.replace(/[ ]{1}/g, '\n');
	this.y = y.replace(/[ ]{1}/g, '\n');
}
jQuery.extend(MglyDiff.LCS.prototype, {
	clear: function() { this.ready = 0; },
	diff: function(added, removed) {
		var d = new MglyDiff.diff(this.x, this.y, {ignorews: false});
		var changes = MglyDiff.DiffParser(d.normal_form());
		var li = 0, lj = 0;
		for (var i = 0; i < changes.length; ++i) {
			var change = changes[i];
			if (change.op != 'a') {
				// find the starting index of the line
				li = d.getLines('lhs').slice(0, change['lhs-line-from']).join(' ').length;
				// get the index of the the span of the change
				lj = change['lhs-line-to'] + 1;
				// get the changed text
				var lchange = d.getLines('lhs').slice(change['lhs-line-from'], lj).join(' ');
				if (change.op == 'd') lchange += ' ';// include the leading space
				else if (li > 0 && change.op == 'c') li += 1; // ignore leading space if not first word
				// output the changed index and text
				removed(li, li + lchange.length);
			}
			if (change.op != 'd') {
				// find the starting index of the line
				li = d.getLines('rhs').slice(0, change['rhs-line-from']).join(' ').length;
				// get the index of the the span of the change
				lj = change['rhs-line-to'] + 1;
				// get the changed text
				var rchange = d.getLines('rhs').slice(change['rhs-line-from'], lj).join(' ');
				if (change.op == 'a') rchange += ' ';// include the leading space
				else if (li > 0 && change.op == 'c') li += 1; // ignore leading space if not first word
				// output the changed index and text
				added(li, li + rchange.length);
			}
		}
	}
});

MglyDiff.CodeifyText = function(settings) {
    this._max_code = 0;
    this._diff_codes = {};
	this.ctxs = {};
	this.options = {ignorews: false};
	jQuery.extend(this, settings);
	this.lhs = settings.lhs.split('\n');
	this.rhs = settings.rhs.split('\n');
}

jQuery.extend(MglyDiff.CodeifyText.prototype, {
	getCodes: function(side) {
		if (!this.ctxs.hasOwnProperty(side)) {
			var ctx = this._diff_ctx(this[side]);
			this.ctxs[side] = ctx;
			ctx.codes.length = Object.keys(ctx.codes).length;
		}
		return this.ctxs[side].codes;
	},
	getLines: function(side) {
		return this.ctxs[side].lines;
	},
	_diff_ctx: function(lines) {
		var ctx = {i: 0, codes: {}, lines: lines};
		this._codeify(lines, ctx);
		return ctx;
	},
	_codeify: function(lines, ctx) {
		var code = this._max_code;
		for (var i = 0; i < lines.length; ++i) {
			var line = lines[i];
			if (this.options.ignorews) {
				line = line.replace(/\s+/g, '');
			}
			var aCode = this._diff_codes[line];
			if (aCode != undefined) {
				ctx.codes[i] = aCode;
			}
			else {
				this._max_code++;
				this._diff_codes[line] = this._max_code;
				ctx.codes[i] = this._max_code;
			}
		}
	}
});

MglyDiff.diff = function(lhs, rhs, options) {
	var opts = jQuery.extend({ignorews: false}, options);
	this.codeify = new MglyDiff.CodeifyText({
		lhs: lhs,
		rhs: rhs,
		options: opts
	});
	var lhs_ctx = {
		codes: this.codeify.getCodes('lhs'),
		modified: {}
	};
	var rhs_ctx = {
		codes: this.codeify.getCodes('rhs'),
		modified: {}
	};
	var max = (lhs_ctx.codes.length + rhs_ctx.codes.length + 1);
	var vector_d = Array( 2 * max + 2 );
	var vector_u = Array( 2 * max + 2 );
	this._lcs(lhs_ctx, 0, lhs_ctx.codes.length, rhs_ctx, 0, rhs_ctx.codes.length, vector_u, vector_d);
	this._optimize(lhs_ctx);
	this._optimize(rhs_ctx);
	this.items = this._create_diffs(lhs_ctx, rhs_ctx);
};

jQuery.extend(MglyDiff.diff.prototype, {
	changes: function() { return this.items; },
	getLines: function(side) {
		return this.codeify.getLines(side);
	},
	normal_form: function() {
		var nf = '';
		for (var index = 0; index < this.items.length; ++index) {
			var item = this.items[index];
			var lhs_str = '';
			var rhs_str = '';
			var change = 'c';
			if (item.lhs_deleted_count == 0 && item.rhs_inserted_count > 0) change = 'a';
			else if (item.lhs_deleted_count > 0 && item.rhs_inserted_count == 0) change = 'd';
			
			if (item.lhs_deleted_count == 1) lhs_str = item.lhs_start + 1;
			else if (item.lhs_deleted_count == 0) lhs_str = item.lhs_start;
			else lhs_str = (item.lhs_start + 1) + ',' + (item.lhs_start + item.lhs_deleted_count);
			
			if (item.rhs_inserted_count == 1) rhs_str = item.rhs_start + 1;
			else if (item.rhs_inserted_count == 0) rhs_str = item.rhs_start;
			else rhs_str = (item.rhs_start + 1) + ',' + (item.rhs_start + item.rhs_inserted_count);
			nf += lhs_str + change + rhs_str + '\n';

			var lhs_lines = this.getLines('lhs');
			var rhs_lines = this.getLines('rhs');
			if (rhs_lines && lhs_lines) {
				// if rhs/lhs lines have been retained, output contextual diff
				for (var i = item.lhs_start; i < item.lhs_start + item.lhs_deleted_count; ++i) {
					nf += '< ' + lhs_lines[i] + '\n';
				}
				if (item.rhs_inserted_count && item.lhs_deleted_count) nf += '---\n';
				for (var i = item.rhs_start; i < item.rhs_start + item.rhs_inserted_count; ++i) {
					nf += '> ' + rhs_lines[i] + '\n';
				}
			}
		}
		return nf;
	},
	_lcs: function(lhs_ctx, lhs_lower, lhs_upper, rhs_ctx, rhs_lower, rhs_upper, vector_u, vector_d) {
		while ( (lhs_lower < lhs_upper) && (rhs_lower < rhs_upper) && (lhs_ctx.codes[lhs_lower] == rhs_ctx.codes[rhs_lower]) ) {
			++lhs_lower;
			++rhs_lower;
		}
		while ( (lhs_lower < lhs_upper) && (rhs_lower < rhs_upper) && (lhs_ctx.codes[lhs_upper - 1] == rhs_ctx.codes[rhs_upper - 1]) ) {
			--lhs_upper;
			--rhs_upper;
		}
		if (lhs_lower == lhs_upper) {
			while (rhs_lower < rhs_upper) {
				rhs_ctx.modified[ rhs_lower++ ] = true;
			}
		}
		else if (rhs_lower == rhs_upper) {
			while (lhs_lower < lhs_upper) {
				lhs_ctx.modified[ lhs_lower++ ] = true;
			}
		}
		else {
			var sms = this._sms(lhs_ctx, lhs_lower, lhs_upper, rhs_ctx, rhs_lower, rhs_upper, vector_u, vector_d);
			this._lcs(lhs_ctx, lhs_lower, sms.x, rhs_ctx, rhs_lower, sms.y, vector_u, vector_d);
			this._lcs(lhs_ctx, sms.x, lhs_upper, rhs_ctx, sms.y, rhs_upper, vector_u, vector_d);
		}
	},
	_sms: function(lhs_ctx, lhs_lower, lhs_upper, rhs_ctx, rhs_lower, rhs_upper, vector_u, vector_d) {
		var max = lhs_ctx.codes.length + rhs_ctx.codes.length + 1;
		var kdown = lhs_lower - rhs_lower;
		var kup = lhs_upper - rhs_upper;
		var delta = (lhs_upper - lhs_lower) - (rhs_upper - rhs_lower);
		var odd = (delta & 1) != 0;
		var offset_down = max - kdown;
		var offset_up = max - kup;
		var maxd = ((lhs_upper - lhs_lower + rhs_upper - rhs_lower) / 2) + 1;
		vector_d[ offset_down + kdown + 1 ] = lhs_lower;
		vector_u[ offset_up + kup - 1 ] = lhs_upper;
		var ret = {x:0,y:0};
		for (var d = 0; d <= maxd; ++d) {
			for (var k = kdown - d; k <= kdown + d; k += 2) {
				var x, y;
				if (k == kdown - d) {
					x = vector_d[ offset_down + k + 1 ];//down
				}
				else {
					x = vector_d[ offset_down + k - 1 ] + 1;//right
					if ((k < (kdown + d)) && (vector_d[ offset_down + k + 1 ] >= x)) {
						x = vector_d[ offset_down + k + 1 ];//down
					}
				}
				y = x - k;
				// find the end of the furthest reaching forward D-path in diagonal k.
				while ((x < lhs_upper) && (y < rhs_upper) && (lhs_ctx.codes[x] == rhs_ctx.codes[y])) {
					x++; y++;
				}
				vector_d[ offset_down + k ] = x;
				// overlap ?
				if (odd && (kup - d < k) && (k < kup + d)) {
					if (vector_u[offset_up + k] <= vector_d[offset_down + k]) {
						ret.x = vector_d[offset_down + k];
						ret.y = vector_d[offset_down + k] - k;
						return (ret);
					}
				}
			}
			// Extend the reverse path.
			for (var k = kup - d; k <= kup + d; k += 2) {
				// find the only or better starting point
				var x, y;
				if (k == kup + d) {
					x = vector_u[offset_up + k - 1]; // up
				} else {
					x = vector_u[offset_up + k + 1] - 1; // left
					if ((k > kup - d) && (vector_u[offset_up + k - 1] < x))
						x = vector_u[offset_up + k - 1]; // up
				}
				y = x - k;
				while ((x > lhs_lower) && (y > rhs_lower) && (lhs_ctx.codes[x - 1] == rhs_ctx.codes[y - 1])) {
					// diagonal
					x--;
					y--;
				}
				vector_u[offset_up + k] = x;
				// overlap ?
				if (!odd && (kdown - d <= k) && (k <= kdown + d)) {
					if (vector_u[offset_up + k] <= vector_d[offset_down + k]) {
						ret.x = vector_d[offset_down + k];
						ret.y = vector_d[offset_down + k] - k;
						return (ret);
					}
				}
			}
		}
		throw "the algorithm should never come here.";
	},
	_optimize: function(ctx) {
		var start = 0, end = 0;
		while (start < ctx.length) {
			while ((start < ctx.length) && (ctx.modified[start] == undefined || ctx.modified[start] == false)) {
				start++;
			}
			end = start;
			while ((end < ctx.length) && (ctx.modified[end] == true)) {
				end++;
			}
			if ((end < ctx.length) && (ctx.ctx[start] == ctx.codes[end])) {
				ctx.modified[start] = false;
				ctx.modified[end] = true;
			}
			else {
				start = end;
			}
		}
	},
	_create_diffs: function(lhs_ctx, rhs_ctx) {
		var items = [];
		var lhs_start = 0, rhs_start = 0;
		var lhs_line = 0, rhs_line = 0;

		while (lhs_line < lhs_ctx.codes.length || rhs_line < rhs_ctx.codes.length) {
			if ((lhs_line < lhs_ctx.codes.length) && (!lhs_ctx.modified[lhs_line])
				&& (rhs_line < rhs_ctx.codes.length) && (!rhs_ctx.modified[rhs_line])) {
				// equal lines
				lhs_line++;
				rhs_line++;
			}
			else {
				// maybe deleted and/or inserted lines
				lhs_start = lhs_line;
				rhs_start = rhs_line;

				while (lhs_line < lhs_ctx.codes.length && (rhs_line >= rhs_ctx.codes.length || lhs_ctx.modified[lhs_line]))
					lhs_line++;

				while (rhs_line < rhs_ctx.codes.length && (lhs_line >= lhs_ctx.codes.length || rhs_ctx.modified[rhs_line]))
					rhs_line++;

				if ((lhs_start < lhs_line) || (rhs_start < rhs_line)) {
					// store a new difference-item
					items.push({
						lhs_start: lhs_start,
						rhs_start: rhs_start,
						lhs_deleted_count: lhs_line - lhs_start,
						rhs_inserted_count: rhs_line - rhs_start
					});
				}
			}
		}
		return items;
	}
});
