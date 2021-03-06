//________________________________________________________________________________________
// SequenceCanvasRow base class
function SequenceCanvasRow ( sc , is_primary ) {
	this.sc = sc ; // SequenceCanvas
	this.is_primary = is_primary ;
	this.targets = [] ;
	this.type = 'basic' ;
}

SequenceCanvasRow.prototype.init = function () {}
SequenceCanvasRow.prototype.updateForm = function () {}
SequenceCanvasRow.prototype.applySettings = function ( settings ) {}

SequenceCanvasRow.prototype.getSettings = function () {
	var settings = { type : this.type } ;
	return settings ;
}

SequenceCanvasRow.prototype.getHeight = function () {
	return this.sc.ch ;
}

SequenceCanvasRow.prototype.isOver = function ( x , y ) {
	var ret = null ;
	$.each ( this.targets , function ( k , target ) {
		if ( x >= target.left && x <= target.right && y >= target.top && y <= target.bottom ) {
			ret = target ;
			return false ;
		}
	} ) ;
	return ret ;
}

//________________________________________________________________________________________
// SCR Blank
SequenceCanvasRowBlank.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowBlank.prototype.constructor = SequenceCanvasRowBlank ;

SequenceCanvasRowBlank.prototype.show = function ( ctx ) {
}

function SequenceCanvasRowBlank ( sc , is_primary ) {
	this.sc = sc ;
	this.is_primary = is_primary ;
	this.type = 'blank' ;
}


//________________________________________________________________________________________
// SCR Spectrum
SequenceCanvasRowSpectrum.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowSpectrum.prototype.constructor = SequenceCanvasRowSpectrum ;

SequenceCanvasRowSpectrum.prototype.show = function ( ctx ) {
	var me = this ;
	var s = this.sc.sequence.seq ;
	var spectrum = this.sc.sequence.spectrum ;

	if (!spectrum) return;

	var w = ctx.canvas.width ;
	var h = ctx.canvas.height ;

	var x = this.sc.xoff ;
	var y = 2 - this.sc.yoff + me.line_off ;
	var miny = -this.sc.ch ;


	// Get bases per line
	var ox = x ;
	var bpl = 0 ; // Bases per line
	while ( 1 ) {
		bpl++ ;
		x += this.sc.cw ;
		if ( (bpl+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) break ;
		}
	}

	this.sc.bases_per_row = bpl + 1 ;
	x = ox ;


	for ( var p = 0 ; p < spectrum.length ; p++ ) {
	
		if ( y <= miny ) { // Speedup
			p += me.sc.bases_per_row - 1 ;
			y += me.sc.block_height ;
			continue ;
		}

		//if ( x == this.sc.xoff && y > miny && me.is_primary ) {
			draw_spectrum_curve(ctx, x, y, spectrum[p]['A'] || 0, 'red');
			draw_spectrum_curve(ctx, x, y, spectrum[p]['C'] || 0, 'blue');
			draw_spectrum_curve(ctx, x, y, spectrum[p]['G'] || 0, 'black');
			draw_spectrum_curve(ctx, x, y, spectrum[p]['T'] || 0, 'green');
		//}

		if ( (p+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) x = w ;
		}
		x += this.sc.cw ;
		if ( x + this.sc.cw >= w ) {
			x = this.sc.xoff ;
			y += me.sc.block_height ;
			if ( y > h ) break ;
		}
	}

}

function draw_spectrum_curve(ctx, x, y, sample, colour) {
	var height = 90;
	var width = 4;

	x += 4;
	y += 40;

	var h = Math.floor((sample / 100.0) * height);

	ctx.strokeStyle = colour;
	ctx.beginPath();
	ctx.moveTo(x - width, y);
	ctx.quadraticCurveTo(x, y - h, x + width, y);
	ctx.stroke() ;
}

function SequenceCanvasRowSpectrum ( sc , is_primary ) {
	this.sc = sc ;
	this.is_primary = is_primary ;
	this.type = 'spectrum' ;
}

//________________________________________________________________________________________
// SCR DNA
SequenceCanvasRowDNA.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowDNA.prototype.constructor = SequenceCanvasRowDNA ;

SequenceCanvasRowDNA.prototype.show = function ( ctx ) {
    var me = this ;
    
    var is_pcr_product = me.type == 'pcr_product' ;
    var is_primer = me.type.substr(0,6)=='primer' ;
    var is_primer_rev = false ;
    var primer_comp_seq ;
    var static_label ;
    
	var s = me.sc.sequence.seq ;
	
	if ( is_primer ) {
		if ( me.type == 'primer1' ) {
			primer_comp_seq = s ;
			s = me.sc.sequence.primer_sequence_1 ;
		} else if ( me.type == 'primer2' ) {
			primer_comp_seq = rcSequence(s).reverse() ;
			s = me.sc.sequence.primer_sequence_2 ;
			is_primer_rev = true ;
		}
		static_label = me.type=='primer1'?'P1':'P2' ;
	} else if ( is_pcr_product ) {
		primer_comp_seq = s ;
		s = me.sc.sequence.pcr_product ;
		static_label = '⇒' ;
	}
	
	this.targets = [] ;

	var w = ctx.canvas.width ;
	var h = ctx.canvas.height ;
	
	var is_editing_this = me.sc.edit.editing && ( me.sc.edit.line === undefined || ( me.sc.edit.line !== undefined && me.sc.edit.line.line_id == me.line_id ) ) ;

	
	var is_rc = me.type == 'dna_rc' ? true : false ;
	var is_secondary = is_rc||(me.is_secondary||false) ;
	var fs = is_secondary ? '#BBBBBB' : 'black' ;
	if ( is_pcr_product ) fs = 'green' ;
    ctx.fillStyle = fs ;
    ctx.font="9pt Courier";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
	var show_numbering = me.is_primary ;
	if ( is_primer && !is_rc ) show_numbering = true ;
	if ( is_pcr_product ) show_numbering = true ;
	
    this.start_base = undefined ;
    this.end_base = undefined ;
    

    var x = this.sc.xoff ;
    var y = 2 - this.sc.yoff + me.line_off ;
    var miny = -this.sc.ch ;
    var check_select = me.is_primary && me.sc.selections.length > 0 ;
    if ( check_select && me.sc.selections[0].line !== undefined && me.sc.selections[0].line.line_id != me.line_id ) check_select = false ;
    

//	if ( check_select ) console.log ( me.sc.selections[0].from + "-" + me.sc.selections[0].to ) ;


	// Get bases per line
	var ox = x ;
    var bpl = 0 ; // Bases per line
    while ( 1 ) {
    	bpl++ ;
    	x += this.sc.cw ;
		if ( (bpl+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) break ;
		}
    }
    this.sc.bases_per_row = bpl + 1 ;
	x = ox ;

	for ( var p = 0 ; p < s.length ; p++ ) {
	
		if ( y <= miny ) { // Speedup
			p += me.sc.bases_per_row - 1 ;
			y += me.sc.block_height ;
			continue ;
		}

		if ( x == this.sc.xoff && y > miny && show_numbering ) {
			var text = is_primer||is_pcr_product ? static_label : (p+1)  ;
			var ofs = ctx.fillStyle ;
			ctx.fillStyle = gentle_config.colors.numbering ;
		    ctx.textAlign = "right";
			ctx.fillText ( text , this.sc.xoff-this.sc.cw , y ) ;
		    ctx.textAlign = "left";
		    ctx.fillStyle = ofs ;
		}
		
		if ( y > miny ) {
			if ( this.start_base === undefined ) this.start_base = p ;
			this.end_base = p ;
			do_write = true ;
			if ( is_editing_this && this.sc.edit.base == p ) {
				ctx.fillRect ( x-1 , y+2 , this.sc.cw+1 , this.sc.ch+1 );
				ctx.fillStyle = "white";
				ctx.fillText ( s[p] , x , y ) ;
				ctx.fillStyle = fs;
				do_write = false ;
			} else if ( check_select ) {
				$.each ( me.sc.selections , function ( k , v ) {
					var from = v.from > v.to ? v.to : v.from ;
					var to = v.from < v.to ? v.to : v.from ;
					if ( from > p || to < p ) return ;
//					if ( ( v.from <= v.to ) && ( v.from > p || v.to < p ) ) return ;
//					if ( ( v.from > v.to ) && ( v.to > p || v.from < p ) ) return ;
					if ( to == p ) {
						me.sc.selection_end_pos = { x : Math.floor ( x + me.sc.cw/2 ) , y : y + me.sc.ch+2 } ;
					}
					ctx.fillStyle = v.fcol ;
					ctx.fillRect ( x-1 , y+2 , me.sc.cw+1 , me.sc.ch+1 );
					ctx.fillStyle = v.tcol ;
					if ( is_secondary ) ctx.fillText ( cd.rc[s[p]] , x , y ) ;
					else ctx.fillText ( s[p] , x , y ) ;
					ctx.fillStyle = fs;
					do_write = false ;
					return false ;
				} ) ;
			}
			if ( do_write ) {
				if ( (is_primer||is_pcr_product) && primer_comp_seq[p] != s[p] ) ctx.fillStyle = 'red' ;
				if ( is_rc ) ctx.fillText ( cd.rc[s[p]] , x , y ) ;
				else ctx.fillText ( s[p] , x , y ) ;
				if ( (is_primer||is_pcr_product) && primer_comp_seq[p] != s[p] ) ctx.fillStyle = fs ;
			}
			this.targets.push ( { left : x , top : y , right : x + this.sc.cw , bottom : y + this.sc.ch , base : p } ) ;
		}
		
		if ( (p+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) x = w ;
		}
		x += this.sc.cw ;
		if ( x + this.sc.cw >= w ) {
			if ( this.is_primary ) {
			}
			x = this.sc.xoff ;
			y += me.sc.block_height ;
			if ( y > h ) break ;
		}
	}
}

function SequenceCanvasRowDNA ( sc , is_primary ) {
	this.sc = sc ;
	this.is_primary = is_primary ;
	this.type = 'dna' ;
}

//________________________________________________________________________________________
// SCR Align
SequenceCanvasRowAlign.prototype = new SequenceCanvasRow();
SequenceCanvasRowAlign.prototype.constructor = SequenceCanvasRowAlign;

SequenceCanvasRowAlign.prototype.show = function (ctx) {
    var me = this;
    var s = this.sc.sequence.seq;
    var s2 = this.secondarySequence;
    this.targets = [];



    var w = ctx.canvas.width;
    var h = ctx.canvas.height;

    var is_align = me.type == 'dna_align' ? true : false;
    var fs = is_align ? '#BBBBBB' : 'black';
    ctx.fillStyle = fs;
    ctx.font = "9pt Courier";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    this.start_base = undefined;
    this.end_base = undefined;


    var x = this.sc.xoff;
    var y = 2 - this.sc.yoff + me.line_off;
    var miny = -this.sc.ch;
    var check_select = me.is_primary && me.sc.selections.length > 0;

    //	if ( check_select ) console.log ( me.sc.selections[0].from + "-" + me.sc.selections[0].to ) ;


    // Get bases per line
    var ox = x;
    var bpl = 0; // Bases per line
    while (1) {
        bpl++;
        x += this.sc.cw;
        if ((bpl + 1) % 10 == 0) {
            x += 5;
            if (x + this.sc.cw * 11 >= w) break;
        }
    }
    this.sc.bases_per_row = bpl + 1;
    x = ox;

    for (var p = 0; p < s.length; p++) {

        if (y <= miny) { // Speedup
            p += me.sc.bases_per_row - 1;
            y += me.sc.block_height;
            continue;
        }

        if (x == this.sc.xoff && y > miny && me.is_primary) {
            var ofs = ctx.fillStyle;
            ctx.fillStyle = gentle_config.colors.numbering;
            ctx.textAlign = "right";
            ctx.fillText((p + 1), this.sc.xoff - this.sc.cw, y);
            ctx.textAlign = "left";
            ctx.fillStyle = ofs;
        }

        if (y > miny) {
            if (this.start_base === undefined) this.start_base = p;
            this.end_base = p;
            do_write = true;
            if (this.is_primary && this.sc.edit.editing && this.sc.edit.base == p) {
                ctx.fillRect(x - 1, y + 2, this.sc.cw + 1, this.sc.ch + 1);
                ctx.fillStyle = "white";
                ctx.fillText(s[p], x, y);
                ctx.fillStyle = fs;
                do_write = false;
            } else if (check_select) {
                $.each(me.sc.selections, function (k, v) {
                    var from = v.from > v.to ? v.to : v.from;
                    var to = v.from < v.to ? v.to : v.from;
                    if (from > p || to < p) return;
                    //					if ( ( v.from <= v.to ) && ( v.from > p || v.to < p ) ) return ;
                    //					if ( ( v.from > v.to ) && ( v.to > p || v.from < p ) ) return ;
                    if (to == p) {
                        me.sc.selection_end_pos = { x: Math.floor(x + me.sc.cw / 2), y: y + me.sc.ch + 2 };
                    }
                    ctx.fillStyle = v.fcol;
                    ctx.fillRect(x - 1, y + 2, me.sc.cw + 1, me.sc.ch + 1);
                    ctx.fillStyle = v.tcol;
                    if (is_align) ctx.fillText(s2[p], x, y);
                    else ctx.fillText(s[p], x, y);
                    ctx.fillStyle = fs;
                    do_write = false;
                    return false;
                });
            }
            if (do_write) {
                if (s2.charAt(p) !== s.charAt(p)) ctx.fillStyle = "Red";
                else ctx.fillStyle = fs;
                if (is_align) ctx.fillText(s2[p], x, y);
                else ctx.fillText(s[p], x, y);
            }
            this.targets.push({ left: x, top: y, right: x + this.sc.cw, bottom: y + this.sc.ch, base: p });
        }

        if ((p + 1) % 10 == 0) {
            x += 5;
            if (x + this.sc.cw * 11 >= w) x = w;
        }
        x += this.sc.cw;
        if (x + this.sc.cw >= w) {
            if (this.is_primary) {
            }
            x = this.sc.xoff;
            y += me.sc.block_height;
            if (y > h) break;
        }
    }
}

function SequenceCanvasRowAlign(sc, is_primary, secondarySequence) {
    this.sc = sc;
    this.is_primary = is_primary;
    this.type = 'dna_align';
    this.secondarySequence = secondarySequence;
}

//________________________________________________________________________________________
// SCR Position
SequenceCanvasRowPosition.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowPosition.prototype.constructor = SequenceCanvasRowPosition ;

SequenceCanvasRowPosition.prototype.show = function ( ctx ) {
	var s = this.sc.sequence.seq ;

	var w = ctx.canvas.width ;
	var h = ctx.canvas.height ;
	
    ctx.fillStyle = gentle_config.colors.numbering ;
    ctx.font="9pt Courier";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    var me = this ;
    this.start_base = undefined ;
    this.end_base = undefined ;
    
    var x = this.sc.xoff ;
    var y = 2 - this.sc.yoff + me.line_off ;
    var miny = -this.sc.ch ;
	for ( var p = 0 ; p < s.length ; p++ ) {
	
		if ( y <= miny ) { // Speedup
			p += me.sc.bases_per_row - 1 ;
			y += me.sc.block_height ;
			continue ;
		}
		
		if ( y > miny && (p) % 10 == 0 ) {
			ctx.fillText ( addCommas(p+1) , x , y ) ;
		}
		
		if ( (p+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) x = w ;
		}
		x += this.sc.cw ;
		if ( x + this.sc.cw >= w ) {
			x = this.sc.xoff ;
			y += me.sc.block_height ;
			if ( y > h ) break ;
		}
	}
	
}

function SequenceCanvasRowPosition ( sc , is_primary ) {
	this.sc = sc ;
	this.is_primary = is_primary ;
	this.type = 'position' ;
}


//________________________________________________________________________________________
// SCR Annotation
SequenceCanvasRowAnnotation.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowAnnotation.prototype.constructor = SequenceCanvasRowAnnotation ;

/*
SequenceCanvasRowAnnotation.prototype.getAnnotationName = function ( v ) {
	var name = '' ;
	if ( v['gene'] !== undefined ) name = v['gene'] ;
	else if ( v['product'] !== undefined ) name = v['product'] ;
	else if ( v['name'] !== undefined ) name = v['name'] ;
	name = name.replace(/^"/,'').replace(/"$/,'') ;
	return name ;
}
*/

SequenceCanvasRowAnnotation.prototype.show = function ( ctx ) {
	var s = this.sc.sequence.seq ;
	this.targets = [] ;

	var w = ctx.canvas.width ;
	var h = ctx.canvas.height ;
	
    ctx.fillStyle = "black";
    ctx.font="6pt Verdana";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    
    var me = this ;
    
    // Get features in the displayed region from cache
    var showfeat = {} ;
    for ( var cid = Math.floor ( me.sc.start_base / me.cache_factor ) ; cid <= Math.floor ( me.sc.end_base / me.cache_factor ) ; cid++ ) {
		if ( undefined === me.cache[cid] ) continue ;
		$.each ( me.cache[cid] , function ( k , fid ) {
			var v = me.sc.sequence.features[fid] ;
			if ( v['_type'].match(/^source$/i) ) return ;
			if ( undefined === v['_range'] ) return ;
			if ( 0 == v['_range'].length ) return ;
			var left = v['_range'][0].from ;
			var right = v['_range'][v['_range'].length-1].to ;
			if ( left-1 > me.sc.end_base ) return ;
			if ( right-1 < me.sc.start_base ) return ;
			showfeat[fid] = v ;
	    } ) ;
	}
	
	// Markup bases in this region
	var bases = {} ;
	$.each ( showfeat , function ( id , v ) {

		var cl = gentle.getFeatureType ( v['_type'] ) ;
		var col = cd.feature_types[cl].col ;
		var offset = cd.feature_types[cl].annotation_row_offset ;

		var name = me.sc.sequence.getAnnotationName ( v ) ;

		$.each ( v['_range'] , function ( k , r ) {
			for ( var p = r.from-1 ; p < r.to ; p++ ) {
				if ( undefined === bases[p] ) bases[p] = [] ;
				var o = { color : col , type : cl , offset : offset , first : ( p == r.from-1 ) , name : name , fr : id+'/'+k } ;
				bases[p].push ( o ) ;
			}
		} ) ;
	} ) ;

	var x = me.sc.xoff ;
	var y = 2 - me.sc.yoff + me.line_off ;
	var miny = -me.sc.ch ;
	var lx = x ;
	var min_textwidth = 30 ; // For hovering
	var lines = [] ;
	var linebuffer = {} ;
	for ( var p = 0 ; p < s.length ; p++ ) {
	
		if ( y <= miny ) { // Speedup
			p += me.sc.bases_per_row - 1 ;
			y += me.sc.block_height ;
			continue ;
		}
		var begin_of_line = false ;
		if ( x == me.sc.xoff && y > miny ) {
			begin_of_line = true ;
			lx = x ;
			
			// We store the lines from the previous row and clear the row buffer
			$.each ( linebuffer , function ( a , b ) {
				lines.push ( b ) ;
			} ) ;
			linebuffer = {} ;
		}
		
		if ( y > miny && undefined !== bases[p] ) {
			$.each ( bases[p] , function ( id , o ) {
				var y2 = y + me.sc.ch - o.offset + 2 ;
				
				// Here, we collect information on drawing lines later.
				// Drawing lines is expensive, so we minimize the number of lines.
				if ( undefined === linebuffer[o.fr] ) {
					linebuffer[o.fr] = { x1 : lx , y : y2 , color : o.color } ;
				} else {
					linebuffer[o.fr].x2 = x + me.sc.cw ;
				}
				
				// Drawing labels directly, it doesn't get any cheaper...
				if ( ( o.first || begin_of_line ) /*&& o.name != ''*/ ) {
					ctx.fillStyle = o.color ;
					ctx.fillText ( o.first ? o.name : "("+o.name+")" , x , y2-1 ) ;

//					if ( o.first ) {
						var textwidth = o.name.length * 5 ; // Guess
						var textheight = 5 ; // Guess
						me.targets.push ( {
							left : x , 
							top : y+2 , 
							right : x + (textwidth>min_textwidth?textwidth:min_textwidth) , 
							bottom : y2 , 
							base : p , 
							onHover : me.onHover ,
							row : me ,
							text : "<span style='color:" + ctx.fillStyle + "'>" + o.name + "</span>"
						} ) ;
//				}

				}
			} ) ;
		}
		
		lx = x + me.sc.cw ;
		
		if ( (p+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + me.sc.cw * 11 >= w ) x = w ;
		}
		x += me.sc.cw ;
		if ( x + me.sc.cw >= w ) {
			x = me.sc.xoff ;
			y += me.sc.block_height ;
			if ( y > h ) break ;
		}
	}

	// Draw lines
	$.each ( linebuffer , function ( a , b ) {
		lines.push ( b ) ;
	} ) ;
	var ss = ctx.strokeStyle ;
	$.each ( lines , function ( a , o ) {
		ctx.strokeStyle = o.color ;
		ctx.beginPath();
		ctx.moveTo ( o.x1 , o.y ) ;
		ctx.lineTo ( o.x2 , o.y ) ;
		ctx.stroke() ;
	} ) ;
	ctx.strokeStyle = ss ;
}

SequenceCanvasRowAnnotation.prototype.onHover = function ( target ) {
	var me = target.row ;
	var ox = parseInt($('#sequence_canvas').offset().left,10) ;
	var oy = parseInt($('#sequence_canvas').offset().top,10) ;

	if ( $('#annot_hover').length > 0 ) {
		var base = $('#annot_hover').attr('base') ;
		if ( base == target.base ) {
			$('#annot_hover').popover ( 'show' ) ;
			return ;
		}
	}

	$('#annot_hover').popover ( 'hide' ) ;
	$('#annot_hover').remove() ;
	
	var out = [] ;
	$.each ( me.sc.sequence.features , function ( fid , v ) {
		if ( v['_type'].match(/^source$/i) ) return ;
		if ( undefined === v['_range'] ) return ;
		if ( 0 == v['_range'].length ) return ;
		var left = v['_range'][0].from ;
		var right = v['_range'][v['_range'].length-1].to ;
		if ( left-1 > target.base ) return ;
		if ( right-1 < target.base ) return ;
		var name = me.sc.sequence.getAnnotationName ( v ) ;
		var desc = v['desc'] || v['note'] || '' ;
		var col = cd.feature_types[gentle.getFeatureType(v['_type'])].col ;
		out.push ( { name : name , desc : desc , type : v['_type'] , col:col } ) ;
		
	} ) ;

	var title = '' ;
	var content = '' ;
	
	if ( out.length == 0 ) return ; // Nope
	if ( out.length == 1 ) {
		title = out[0].name + ' <span style="font-size:8pt !important"><tt>[<span style="color:' + out[0].col + '">' + out[0].type + '</span>]</tt></span>' ;
		content = out[0].desc ;
	} else {
		title = 'Multiple annotation' ;
		$.each ( out , function ( k , v ) {
			content += "<h4>" + v.name + ' <small><tt>[<span style="color:' + v.col + '">' + v.type + "</span>]</tt></small></h4>" ;
			if ( '' != v.desc ) content += "<div>" + v.desc + "</div>" ;
		} ) ;
	}
	
	var placement = (target.left+ox>300) ? 'top' : 'right' ;
	
	$('#canvas_wrapper').prepend ( "<div id='annot_hover' class='temporary_popover_source'></div>" ) ;
	$('#annot_hover').css ( { left : (target.left+ox)+'px' , top : (target.top+oy)+'px' , height : target.bottom-target.top+1 , width : target.right-target.left+1 , position:'fixed' } ) ;
	$('#annot_hover').attr ( 'base' , target.base ) ;
	$('#annot_hover').popover ( {
		placement : placement ,
		title : "<div style='color:black'>" + title + "</div>" ,
		html : true ,
		animation : false ,
		content : "<div style='color:black'>" + content + "</div>"
	} ) ;
	$('#annot_hover').popover ( 'show' ) ;
}

SequenceCanvasRowAnnotation.prototype.init = function () {
	var me = this ;
	
	// Initialize cache for inline display of features
	me.cache_factor = 1000 ;
	me.cache = [] ;
	$.each ( me.sc.sequence.features , function ( k , v ) {
		if ( v['_type'].match(/^source$/i) ) return ;
		if ( undefined === v['_range'] ) return ;
		if ( 0 == v['_range'].length ) return ;
		var left = Math.floor ( v['_range'][0].from / me.cache_factor ) ;
		var right = Math.floor ( v['_range'][v['_range'].length-1].to / me.cache_factor ) ;
		for ( var c = left ; c <= right ; c++ ) {
			if ( undefined === me.cache[c] ) me.cache[c] = [] ;
			me.cache[c].push ( k ) ;
		}
	} ) ;
}

function SequenceCanvasRowAnnotation ( sc , is_primary ) {
	this.sc = sc ;
	this.is_primary = is_primary ;
	this.type = 'annotation' ;
}


//________________________________________________________________________________________
// SCR AA
SequenceCanvasRowAA.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowAA.prototype.constructor = SequenceCanvasRowAA ;

SequenceCanvasRowAA.prototype.show = function ( ctx ) {
    var me = this ;
	var s = me.seq ;
	this.targets = [] ;

	var w = ctx.canvas.width ;
	var h = ctx.canvas.height ;
	
	var fs = me.is_primary ? 'black' : '#75B4FF' ;
    ctx.fillStyle = fs ;
    ctx.font="9pt Courier";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    this.start_base = undefined ;
    this.end_base = undefined ;
    
	var three = ( me.m1 == 'three' ) ;
    var x = this.sc.xoff ;
    var y = 2 - this.sc.yoff + me.line_off ;
    var miny = -this.sc.ch ;

	// Get bases per line
	var ox = x ;
    var bpl = 0 ; // Bases per line
    while ( 1 ) {
    	bpl++ ;
    	x += this.sc.cw ;
		if ( (bpl+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) break ;
		}
    }
    this.sc.bases_per_row = bpl + 1 ;
	x = ox ;

	for ( var p = 0 ; p < s.length ; p++ ) {
	
		if ( y <= miny ) { // Speedup
			p += me.sc.bases_per_row - 1 ;
			y += me.sc.block_height ;
			continue ;
		}

		if ( me.is_primary && x == this.sc.xoff && y > miny ) {
		    ctx.textAlign = "right";
			ctx.fillText ( (p+1) , this.sc.xoff-this.sc.cw , y ) ;
		    ctx.textAlign = "left";
		}
		
		if ( y > miny ) {
			if ( this.start_base === undefined ) this.start_base = p ;
			this.end_base = p ;
			if ( me.is_primary && me.sc.edit.editing && me.sc.edit.base == p ) {
				ctx.fillRect ( x-1 , y+2 , me.sc.cw+1 , me.sc.ch+1 );
				ctx.fillStyle = "white";
				ctx.fillText ( s[p] , x , y ) ;
				ctx.fillStyle = fs;
			} else {
				var red = false ;
				if ( !me.is_primary ) {
					if ( s[p] == 'X' ) red = true ;
					else if ( three ) {
						if ( s.substr(p,3) == 'STP' ) red = true ;
						else if ( p > 0 && s.substr(p-1,3) == 'STP' ) red = true ;
						else if ( p > 1 && s.substr(p-2,3) == 'STP' ) red = true ;
					}
					if ( red ) ctx.fillStyle = 'red' ;
				}
				ctx.fillText ( s[p] , x , y ) ;
				if ( red ) ctx.fillStyle = fs ;
			}
			this.targets.push ( { left : x , top : y , right : x + this.sc.cw , bottom : y + this.sc.ch , base : p } ) ;
		}
		
		if ( (p+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) x = w ;
		}
		x += this.sc.cw ;
		if ( x + this.sc.cw >= w ) {
			if ( this.is_primary ) {
			}
			x = this.sc.xoff ;
			y += me.sc.block_height ;
			if ( y > h ) break ;
		}
	}
}

SequenceCanvasRowAA.prototype.calculateByAnnotation = function () {
	var me = this ;
	var sl = me.sc.sequence.seq.length ;
	var single_base = ( me.m1 == 'one' ) ;
	me.seq = [] ;
	while ( me.seq.length < sl ) me.seq.push ( ' ' ) ;
	$.each ( me.sc.sequence.features||[] , function ( k , v ) {
		if ( (v['_type']||'') != 'CDS' ) return ;
		var rc = false ;
		var pos = [] ;
		$.each ( v['_range']||[] , function ( k2 , v2 ) {
			if ( undefined !== v2.rc ) rc = v2.rc ;
			var from = v2.from ;
			var to = v2.to ;
			if ( undefined === from || undefined === to ) return ;
			if ( to < from ) { var x = from ; from = to ; to = x ; }
			for ( var p = from ; p <= to ; p++ ) {
				pos.push ( p ) ;
			}
		} ) ;

		if ( rc ) pos = pos.sort ( function(a,b) { return b-a } ) ;
		else pos = pos.sort ( function(a,b) { return a-b } ) ;
		
		if ( v.codon_start !== undefined ) {
			var codon_start = v.codon_start * 1 - 1 ;
			while ( codon_start-- > 0 ) pos.shift() ;
		}
		
		var s = '' ;
		var disp_pos = [] ;
		$.each ( pos , function ( k2 , v2 ) {
			disp_pos.push ( v2-1 ) ;
			s += rc ? cd.rc[me.sc.sequence.seq[v2-1]] : me.sc.sequence.seq[v2-1] ;
			if ( s.length < 3 ) return ;
			var aa ;
			if ( undefined === cd.aa_c2s[s] ) {
				aa = single_base ? '?  ' : '???' ;
			} else {
				aa = single_base ? cd.aa_c2s[s] + '  ' : cd.aa_s2l[cd.aa_c2s[s]] ;
			}
			if ( disp_pos[0] > disp_pos[2] ) { var x = disp_pos[0] ; disp_pos[0] = disp_pos[2] ; disp_pos[2] = x ; }
			for ( var p = 0 ; p < 3 ; p++ ) me.seq[disp_pos[p]] = aa[p] ;
			disp_pos = [] ;
			s = '' ;
		} ) ;
	} ) ;
	me.seq = me.seq.join ( '' ) ;
}

SequenceCanvasRowAA.prototype.init = function () {
	var me = this ;
	me.seq = '' ;
	
	// TODO : circular ("zero-point" spanning AA)

	if ( me.is_primary ) {
		me.seq = me.sc.sequence.seq ;
		return ;
	} else if ( me.m2 == 'all' ) { // Implies single-letter codes
		for ( var p = 0 ; p+2 < me.sc.sequence.seq.length ; p++ ) {
			var s = me.sc.sequence.seq.substr ( p , 3 ) ;
			if ( s.length != 3 ) break ;
			if ( me.rev ) s = cd.rc[s[2]] + cd.rc[s[1]] + cd.rc[s[0]] ;
			if ( undefined === cd.aa_c2s[s] ) me.seq += '?' ;
			else me.seq += cd.aa_c2s[s] ;
		}
	} else if ( me.m2 == 'auto' ) {
		me.calculateByAnnotation() ;
	} else {
		for ( var i = 1 ; i < me.m2*1 ; i++ ) me.seq += ' ' ;
		for ( var p = me.m2*1-1 ; p+2 < me.sc.sequence.seq.length ; p += 3 ) {
			var s = me.sc.sequence.seq.substr ( p , 3 ) ;
			if ( s.length != 3 ) break ;
			if ( me.rev ) s = cd.rc[s[2]] + cd.rc[s[1]] + cd.rc[s[0]] ;
			if ( undefined === cd.aa_c2s[s] ) {
				me.seq += ( me.m1 == 'one' ) ? '?  ' : '???' ;
			} else {
				if ( me.m1 == 'one' ) me.seq += cd.aa_c2s[s] + '  ' ;
				else me.seq += cd.aa_s2l[cd.aa_c2s[s]] ;
			}
		}
	}
	
	// Fill'er up
	while ( me.seq.length < me.sc.sequence.seq ) me.seq += ' ' ;
}

SequenceCanvasRowAA.prototype.getSettings = function () {
	var settings = { type : this.type , m1 : this.m1 , m2 : this.m2 , reverse : this.rev } ;
	return settings ;
}

function SequenceCanvasRowAA ( sc , is_primary , settings ) {
	this.sc = sc ;
	this.is_primary = is_primary ;
	this.type = 'aa' ;
	if ( settings !== undefined ) {
		if ( settings.m1 !== undefined ) this.m1 = settings.m1 ;
		if ( settings.m2 !== undefined ) this.m2 = settings.m2 ;
		if ( settings.reverse !== undefined ) this.rev = settings.reverse ;
	}
}



//________________________________________________________________________________________
// SCR Restriction Enzyme Sites
SequenceCanvasRowRES.prototype = new SequenceCanvasRow() ;
SequenceCanvasRowRES.prototype.constructor = SequenceCanvasRowRES ;

SequenceCanvasRowRES.prototype.show = function ( ctx ) {
	var s = this.sc.sequence.seq ;

	var w = ctx.canvas.width ;
	var h = ctx.canvas.height ;
	
    ctx.fillStyle = "#59955C";
    ctx.font="7pt Courier";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    
    var me = this ;
    this.start_base = undefined ;
    this.end_base = undefined ;
    this.targets = [] ;
    
    var rc_offset = ( me.sc.lines[me.line_id-1].type == 'dna_rc' ) ? -me.sc.ch : 0 ;
    
    var x = this.sc.xoff ;
    var y = 2 - this.sc.yoff + me.line_off ;
    var miny = -this.sc.ch ;
    var cache = [] ;
    var last_x = x ;
	for ( var p = 0 ; p < s.length ; p++ ) {
	
		if ( y <= miny ) { // Speedup
			p += me.sc.bases_per_row - 1 ;
			y += me.sc.block_height ;
			continue ;
		}
		
		// Populate site cache
		if ( p >= me.sc.start_base-10 && undefined !== me.sites[p] ) {
			$.each ( me.sites[p] , function ( k , v ) {
				cache.push ( { data:v , pos:0 } ) ;
//				if ( v.name == 'AccII' ) console.log ( JSON.stringify ( v ) ) ;
			} ) ;
		}
		
		// Draw and purge site cache
		$.each ( cache , function ( k , v ) {
			if ( undefined === v ) return ;
			
			if ( v.pos == 0 ) { // Write enzyme name(s)
				var textright = x - me.sc.cw ;
				var texttop = y+7*k+2 ;
				var textwidth = v.data.name.length * 5 ; // Guess
				var textheight = 5 ; // Guess
				ctx.fillText ( v.data.name , textright , texttop ) ;
				me.targets.push ( {
					left : textright-textwidth , 
					top : texttop+textheight , 
					right : x - me.sc.cw , 
					bottom : texttop+textheight*2 , 
					base : p , 
					text : "<span style='color:" + ctx.fillStyle + "'>" + v.data.name + "</span>"
				} ) ;
			}
			
			var y2 = y + 3 + rc_offset ;
			if ( v.data.offset >= 0 ) {
				if ( v.pos < v.data.cut ) y2 -= me.sc.ch ;
				else if ( v.pos >= v.data.cut + v.data.offset ) y2 += me.sc.ch ;
			} else {
				if ( v.pos <= v.data.cut + v.data.offset ) y2 += me.sc.ch ;
				else if ( v.pos >= v.data.cut ) y2 -= me.sc.ch ;
			}
			
			var x1 = v.last_x ;
			if ( x1 === undefined ) x1 = last_x ;
			var x2 = x ;
			
			var y1 = v.last_y ;
			if ( y1 === undefined ) y1 = y2 ;
			
			ctx.strokeStyle = ctx.fillStyle ;

			ctx.beginPath();
			ctx.moveTo ( x1 , y1 ) ;
			if ( y1 != y2 ) ctx.lineTo ( x1 , y2 ) ;
			ctx.lineTo ( x2 , y2 ) ;
			ctx.stroke() ;
			
			// Count position up, remove if end
			v.last_x = x2 ;
			v.last_y = y2 ;
			v.pos++ ;
			if ( v.pos >= v.data.len ) cache.splice ( k , 1 ) ; 
		} ) ;
		while ( cache.length > 0 && cache[cache.length-1] === undefined ) cache.pop() ;
		
		last_x = x ;

		if ( (p+1) % 10 == 0 ) {
			x += 5 ;
			if ( x + this.sc.cw * 11 >= w ) x = w ;
		}

		x += this.sc.cw ;
		if ( x + this.sc.cw >= w ) {
			x = this.sc.xoff ;
			y += me.sc.block_height ;
			if ( y > h ) break ;
			
			last_x = x ;
			$.each ( cache , function ( k , v ) {
				v.last_x = x ;
				v.last_y += me.sc.block_height ;
			} ) ;
			

		}
	}
}

SequenceCanvasRowRES.prototype.generateEnzymeSites = function ( e , name ) {
	var rx = e.rx ;
	var tmp = [] ;
	while (rx.test(this.sc.sequence.seq)==true) {
		var p = rx.lastIndex - e.seq.length + 1 ;
		if ( undefined === this.sites[p] ) this.sites[p] = [] ;
		tmp.push ( { name:name , cut:e.cut , offset:e.offset , len:e.seq.length , start:p } ) ;
		if ( tmp.length > this.maxcut ) return ;
	}
	// TODO : run non-palindromic enzymes on reverse-complement strand

	// Put cache live
	var me = this ;
	$.each ( tmp , function ( k , v ) {
		v.cuts = tmp.length ;
		me.sites[v.start].push ( v ) ;
	} ) ;
}

SequenceCanvasRowRES.prototype.init = function () {
	var me = this ;
	
	me.sites = {} ;

	// Automatic list
	var hadthat = {} ;
	$.each ( me.use_site_lengths , function ( k , len ) {
		$.each ( cd.re_s2n[len] , function ( site , enzymes ) {
			$.each ( enzymes , function ( q1 , q2 ) { hadthat[q2] = 1 } ) ;
			var e = cd.re[enzymes[0]] ; // One enzyme will do
			var name = enzymes.join ( ',' ) ;
			me.generateEnzymeSites ( e , name ) ;
		} ) ;
	} ) ;
	
	// Manual list
	$.each ( this.manual_enzymes , function ( k , v ) {
		if ( undefined !== hadthat[v] ) return ; // Had that one
		hadthat[v] = 1 ;
		if ( undefined !== cd.re[v] ) me.generateEnzymeSites ( cd.re[v] , v ) ;
	} ) ;

}

SequenceCanvasRowRES.prototype.getHeight = function () {
	if ( this.sc.lines[this.line_id-1].type == 'dna_rc' ) return 0 ;
	if ( this.line_id+1 < this.sc.lines.length && this.sc.lines[this.line_id+1].type == 'blank' ) return 0 ;
	return this.sc.ch ;
}

SequenceCanvasRowRES.prototype.getSettings = function () {
	var settings = {
		type : this.type , 
		use_site_lengths : this.use_site_lengths , 
		manual_enzymes : this.manual_enzymes ,
		maxcut : this.maxcut
	} ;
	return settings ;
}

SequenceCanvasRowRES.prototype.updateForm = function () {
	$.each ( cd.re_s2n , function ( len , enzymes ) {
		$('#re_len_'+len).attr('checked',false) ;
	} ) ;
	$.each ( this.use_site_lengths , function ( k , len ) {
		$('#re_len_'+len).attr('checked',true) ;
	} ) ;
	$('#re_maxcut').val ( this.maxcut ) ;
	$('#re_manual').val ( this.manual_enzymes.join(',') ) ;
}

function SequenceCanvasRowRES ( sc , is_primary , settings ) {
	var me = this ;
	me.sc = sc ;
	me.is_primary = is_primary ;
	me.type = 'res' ;
	
	if ( undefined === settings ) {
		settings = { use_site_lengths : [ 6 ] , manual_enzymes : ['BamHI','EcoRI','HindIII'] , maxcut : 3 } ;
	}
	
	me.use_site_lengths = settings.use_site_lengths ;
	me.manual_enzymes = settings.manual_enzymes ;
	me.maxcut = settings.maxcut ;

	me.updateForm () ;
}
