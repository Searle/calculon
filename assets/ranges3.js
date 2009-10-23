
(function () {

        var undefined;

        var cells= {};

        var Cell= function(x, y) {

            // x, y ?

            this.value= undefined;
            this._atomRefs= {};
        };

        var emptyCell= new Cell();

        var _getCell= function(atomId, x, y) {
            var key= x + ':' + y;
            var cell= cells[key];
            if ( cell === undefined ) {
                cell= cells[key]= new Cell(x, y);
            }
            cell._atomRefs[atomId]= true;
            return cell;
        };

        // FIXME: Optimieren: Soll nur checken ob ein Cell existiert und nicht
        // eins erzeugen.
        var __getCell= function(atomId, x, y) {
            return _getCell(atomId, x, y);
        };

        var _isFunction= function( obj ) {
            return Object.prototype.toString.call(obj) === "[object Function]"
        }

        var _isArray= function( obj ) {
            return Object.prototype.toString.call(obj) === "[object Array]"
        };

        var stringToCell= function( str ) {
            var x= "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1));
            if ( x < 0 ) throw "NoValidCellName";
            var y= parseInt(str.substr(1), 10);
            if ( isNaN(y) || y <= 0 ) throw "NoValidCellName";
            return [ x, y - 1 ];
        };

        var _atomId= 0;

        var _Atom= function( parent ) {

            this._atomId= _atomId++;

            this.recalcDeps= function() parent ? parent.recalcDeps() : []
            this.valueDeps= function()  parent ? parent.valueDeps()  : []
        }

        _Atom.prototype.getRanges= function () []

        _Atom.prototype.name= ''

        _Atom.prototype._getCell= function (x, y) {
            return __getCell(this._atomId, x, y);
        }

        _Atom.prototype.getCell= function () {
            var ranges= _flatten(this.getRanges());
            if ( ranges.length === 0 ) return emptyCell;
            return __getCell(this._atomId, ranges[0][0], ranges[0][1]);
        }

        _Atom.prototype.value= function() {
            var ranges= _flatten(this.getRanges());
            if ( ranges.length === 0 ) return '#NV';
            var cell= this._getCell(ranges[0][0], ranges[0][1]);
            return cell ? cell.value : '#EMPTY';
        }

        _Atom.extend= function( name, protoFn, factoryFn ) {
            _Atom.prototype[name]= factoryFn;
            protoFn.prototype.name= name;
            protoFn.prototype.__proto__= _Atom.prototype;
        };

// =============================================================================
//      Dump
// =============================================================================

        var _Dump= function( parent, comment ) {
            _Atom.call(this, parent);

            var _dump= function ( ranges, comment ) {
                var out= [];
                for each ( var range in ranges ) {
                    out.push('[' + range[0] + ',' + range[1] + ',' + range[2] + ',' + range[3] + ']');
                }
                console.log((comment ? comment + ': [' : '[') + out.join(', ') + ']');
            }
// console.log(parent, ranges,arg);

            _dump(parent.getRanges(), comment );

            this.getRanges= function() parent.getRanges()
        }

        _Atom.extend('dump', _Dump, function( comment ) new _Dump(this, comment));


// =============================================================================
//      AddRange
// =============================================================================

        var __addRange= function( ranges, arg ) {

            if ( _isArray(arg) ) {
                if ( arg.length === 1 ) return __addRange(ranges, arg[0]);
                if ( arg.length === 2 ) {
                    if ( typeof arg[0] === 'string' && typeof arg[1] === 'string' ) {
                        var cellTL= stringToCell(arg[0]);
                        var cellBR= stringToCell(arg[1]);
                        ranges.push([ cellTL[0], cellTL[1], cellBR[0], cellBR[1] ]);
                        return ranges;
                    }
                    if ( typeof arg[0] === 'number' && typeof arg[1] === 'number' ) {
                        ranges.push([ arg[0], arg[1], arg[0], arg[1] ]);
                        return ranges;
                    }
                }
                if ( arg.length === 4 ) {
                    ranges.push(arg);
                    return ranges;
                }
            }
            else if ( arg instanceof Ranges ) {
                for each ( var range in arg._ranges ) __addRange(ranges, range);
                return ranges;
            }

            console.log("_addRange error:", arg, Object.prototype.toString.call(arg));

            throw "RangeArgException:" + arg;
        };

        var _AddRange= function( parent, arg ) {
            _Atom.call(this, parent);

// console.log(parent, ranges,arg);

            this.getRanges= function() {
                return __addRange(parent.getRanges(), arg);
            };
        }

        _Atom.extend('addRange', _AddRange, function() new _AddRange(this, Array.prototype.slice.call(arguments)));


// =============================================================================
//      AddRanges
// =============================================================================

        var _AddRanges= function( parent, newRanges ) {
            _Atom.call(this, parent);

            this.getRanges= function() {
                var _ranges= parent.getRanges();
                for each (var arg in newRanges) __addRange(ranges, arg);
                return ranges;
            };
        }

        _Atom.extend('addRanges', _AddRanges, function(newRanges) new _AddRanges(this, newRanges));


// =============================================================================
//      UNUSED
// =============================================================================

/*
        var intersection= function () {
            if ( ranges.length <= 1 ) return this;
            var newRange= null;
            for each ( var range in ranges ) {
                if ( newRange === null ) {
                    newRange= range.concat();
                    continue;
                }
                if ( range[0] > newRange[0] ) newRange[0]= range[0];
                if ( range[1] > newRange[1] ) newRange[1]= range[1];
                if ( range[2] < newRange[2] ) newRange[2]= range[2];
                if ( range[3] < newRange[3] ) newRange[3]= range[3];
            }
            if ( newRange[0] > newRange[2] || newRange[1] > newRange[3] ) return new Ranges([]);
            return new Ranges([ newRange ]);
        };

        var union= function () {
            if ( ranges.length <= 1 ) return this;
            var newRange= null;
            for each ( var range in ranges ) {
                if ( newRange === null ) {
                    newRange= range.concat();
                    continue;
                }
                if ( range[0] < newRange[0] ) newRange[0]= range[0];
                if ( range[1] < newRange[1] ) newRange[1]= range[1];
                if ( range[2] > newRange[2] ) newRange[2]= range[2];
                if ( range[3] > newRange[3] ) newRange[3]= range[3];
            }
            return new Ranges([ newRange ]);
        };
*/


// =============================================================================
//      Crop
// =============================================================================

        var _Crop= function( parent, x0, y0, x1, y1 ) {
            _Atom.call(this, parent);

            // TODO: pruefen auf x0/y0 < 0 ? Oder macht flatten das?

            if ( x1 === undefined ) x1= x0;
            if ( y1 === undefined ) y1= y0;

            this.getRanges= function() {
                var ranges= [];
                for each ( let [ ox0, ox1, oy0, oy1 ] in parent.getRanges() ) {
                    var newRange= [ ox0, oy0, ox1, oy1 ]= [
                        ox0 + x0,
                        oy0 + y0,
                        (ox0 + x1 <= ox1 ? ox0 + x1 : ox1),
                        (oy0 + y1 <= oy1 ? oy0 + y1 : oy1)
                    ];
                    if ( ox0 > ox1 || oy0 > oy1 ) continue;
                    ranges.push(newRange);
                }
                return ranges;
            };
        };

        _Atom.extend('crop', _Crop, function(x0, y0, x1, y1) new _Crop(this, x0, y0, x1, y1));


// =============================================================================
//      Ofs
// =============================================================================

        var _Ofs= function( parent, x, y ) {
            _Atom.call(this, parent);

            this.getRanges= function() {
                var ranges= [];
                for each (var range in parent.getRanges()) {
                    ranges.push([ range[0] + x, range[1] + y, range[2] + x, range[3] + y ]);
                }
                return ranges;
            };
        };

        _Atom.extend('ofs', _Ofs, function(x, y) new _Ofs(this, x,y ));

        // TODO: Naiver Code. Optimierte Variante schreiben!
        var _flatten= function ( ranges ) {

            if ( ranges.length === 0 ) return ranges;

            // OPTIMIERUNG TESTEN: 
            // if ( ranges.length === 1 && ranges[0][0] === ranges[0][2] && ranges[0][1] === ranges[0][3] ) return this;

            var lookup= {};

            // Irgendwie die Ranges merken:
            // - Key bauen fuer alle Ranges

            // Beispiel: SUMME(B:B), dann Aenderung (oder hinzufuegen von B7)

            var newRanges= [];
            for each ( var range in ranges ) {
                for ( var y= range[1]; y <= range[3]; y++ ) {
                    for ( var x= range[0]; x <= range[2]; x++ ) {
                        if ( x < 0 || y < 0 ) continue;
                        if ( lookup[x + ':' + y] ) continue;
                        newRanges.push([x, y, x, y]);
                        lookup[x + ':' + y]= 1;
                    }
                }
            }
            return newRanges;
        }

/*
            var yrs= {};
            for each ( var range in ranges ) {
                if ( yrs[range[0]] === undefined ) yrs[range[0]]= [ range[0], [], [] ];
                yrs[range[0]][1].push(range[2]);
                if ( yrs[range[1]] === undefined ) yrs[range[1]]= [ range[1], [], [] ];
                yrs[range[1]][2].push(range[3]);
            }

            var yrss= [];
            for each ( var yr in yrs ) yrss.push(yr);
            yrss.sort(function (a, b) { return a[0] - b[0]; });

            for each ( var yr in yrss ) {
                var y= yr[0];
                var leftx= yr[1];
                var rightx= yr[2];

                if ( leftx.length > 1 ) sort(leftx);
                if ( rightx.length > 1 ) sort(rightx);

                var l= 0, r= 0;
                for (;;) {
                    var x= leftx[l];
                    while ( l < leftx.length  && leftx[l] < rightx[r] ) l++;
                    while ( r < rightx.length && rightx[r] < leftx[l] ) r++;
                    ...
                }
            }
        };
*/


// =============================================================================
//      Flatten
// =============================================================================

        var _Flatten= function ( parent ) {
            _Atom.call(this, parent);

            this.getRanges= function() {
                return _flatten(parent.getRanges());
            }
        }

        _Atom.extend('flatten', _Flatten, function() new _Flatten(this));


// =============================================================================
//      Grep
// =============================================================================

        var _Grep= function ( parent, value ) {
            _Atom.call(this, parent);

            this.getRanges= function() {
                var newRanges= [];
                for each ( var range in _flatten(parent.getRanges()) ) {
                    var cell= this._getCell(range[0], range[1]);
                    if ( cell !== undefined && cell.value == value ) {
                        newRanges.push(range);
                    }
                }
                return newRanges;
            }
        };

        _Atom.extend('grep', _Grep, function(value) new _Grep(this, value));


// =============================================================================
//      Interface (window context)
// =============================================================================

        Ranges= function() new _Atom;

        R= function() (new _Atom).addRange(Array.prototype.slice.call(arguments)).dump('addRange');

        C= function (x, y) (new _Atom).addRange(x, y).getCell()

        DumpCells= function () {
            console.log(cells);
        }

})();
