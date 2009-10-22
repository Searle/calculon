
    var undefined;

    var cells= {};

    var Cell= function(x, y) {
        this.value= 'Zuppi';
    };

    var C= function(x, y) {
        var key= x + ':' + y;
        if ( cells[key] === undefined ) {
            cells[key]= new Cell(x, y);
        }
        return cells[key];
    };

    var Ranges= function(ranges) {

        if ( ranges === undefined ) ranges= [];
        if ( this === window ) return new Ranges(ranges);

        var _dump= function (comment) {
            var out= [];
            for each (var range in ranges) {
                out.push('[' + range[0] + ',' + range[1] + ',' + range[2] + ',' + range[3] + ']');
            }
            console.log((comment ? comment + ': [' : '[') + out.join(', ') + ']');
        }

        var _isFunction= function( obj ) {
            return Object.prototype.toString.call(obj) === "[object Function]"
        }

        var _isArray= function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]"
        };

        var stringToCell= function(str) {
            var x= "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1));
            if ( x < 0 ) throw "NoValidCellName";
            var y= parseInt(str.substr(1), 10);
            if ( isNaN(y) || y <= 0 ) throw "NoValidCellName";
            return [ x, y - 1 ];
        };

        var _addRange= function( ranges, args ) {
            if ( _isArray(args) ) {
                if ( args.length === 1 ) return _addRange(ranges, args[0]);
                if ( args.length === 2 ) {
                    var cellTL= stringToCell(args[0]);
                    var cellBR= stringToCell(args[1]);
                    ranges.push([ cellTL[0], cellTL[1], cellBR[0], cellBR[1] ]);
                    return ranges;
                }
                if ( args.length === 4 ) {
                    ranges.push(args);
                    return ranges;
                }
            }
            else if ( typeof args === 'object' && args instanceof Ranges ) {
                for each (var range in args._ranges) _addRange(ranges, range);
                return ranges;
            }

console.log("_addRange error:", args, Object.prototype.toString.call(args));

            throw "RangeArgException:" + args;
        };

        var addRange= function() {
            return new Ranges(_addRange(ranges.concat(), Array.prototype.slice.call(arguments)));
        }

        var addRanges= function( newRanges ) {
            var newNewRanges= ranges.concat();
            for each (var range in newRanges) _addRange(newNewRanges, range);
            return new Ranges(newNewRanges);
        };

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

        var crop= function( x0, y0, x1, y1 ) {

            // TODO: pruefen auf x0/y0 < 0 ? Oder macht flatten das?

            if ( x1 === undefined ) x1= x0;
            if ( y1 === undefined ) y1= y1;
            var newRanges= [];
            for each ( var range in ranges ) {
                var newRange= [
                    x0 + range[0],
                    y0 + range[1],
                    (x1 + range[0] <= range[2] ? x1 + range[0] : range[2]),
                    (y1 + range[1] <= range[3] ? y1 + range[1] : range[3])
                ];
                if ( newRange[0] > newRange[2] || newRange[1] > newRange[3] ) continue;
                newRanges.push(newRange);
            }
            return new Ranges(newRanges);
        };

        var ofs= function(x, y) {
            var newRanges= [];
            for each (var range in ranges) {
                newRanges.push([ range[0] + x, range[1] + y, range[2] + x, range[3] + y ]);
            }
            return new Ranges(newRanges);
        };

        // TODO: Naiver Code. Optimierte Variante schreiben!
        var _flatten= function () {
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

                }
            }



while ( y < range[1] ) {
                    for ( var x= x0; x <= x1; x++ ) newRanges.push([x, y]);
                    y++;
                }
                if ( range[0] < x0 ) x0= range[0];
                if ( range[2] > x1 ) x1= range[2];
            }



            ranges.sort(function(a, b) {
                return b[1] - a[1] || b[0] - a[0];
            });
            var newRanges= [];
            var x0= -1;
            var x1= -1;
            var y= Number.MAX_VALUE;
            var ends= {};
            for each (var range in ranges) {
                while ( y < range[1] ) {
                    for ( var x= x0; x <= x1; x++ ) newRanges.push([x, y]);
                    y++;
                }
                if ( range[0] < x0 ) x0= range[0];
                if ( range[2] > x1 ) x1= range[2];
            }
*/
        };

        var flatten= function () {
            if ( ranges.length === 0 ) return this;

            // OPTIMIERUNG TESTEN: 
            // if ( ranges.length === 1 && ranges[0][0] === ranges[0][2] && ranges[0][1] === ranges[0][3] ) return this;
            return new Ranges(_flatten());
        }

        var grep= function ( value ) {
            var newRanges= [];
            for each ( var range in _flatten() ) {
                if ( C(range[0], range[1]).value == value ) {
                    newRanges.push(range);
                }
            }
            return new Ranges(newRanges);
        };

        this.addRange= addRange;
        this.addRanges= addRanges;
        this.intersection= intersection;
        this.union= union;
        this.crop= crop;
        this.flatten= flatten;
        this.grep= grep;
        this.ofs= ofs;
        this._dump= _dump;
        this._ranges= ranges;
    }

    R= function() {
        return new Ranges().addRange(Array.prototype.slice.call(arguments));
    }

