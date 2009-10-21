

    var Ranges= function(ranges) {

        if ( !ranges ) ranges= [];
        if ( this === window ) return new Ranges(ranges);

        var isFunction= function( obj ) {
            return toString.call(obj) === "[object Function]"
        }

        var isArray= function(obj) {
            return toString.call(obj) === "[object Array]"
        };

        var stringToCell(str) {
            var col= "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1));
            if ( col < 0 ) throw "NoValidCellName";
            var row= parseInt(str.substr(1), 10);
            if ( isNaN(row) ) throw "NoValidCellName";
            return [ col, row ];
        };

        var _addRange( ranges, args ) {
            if ( args.length === 1 ) {
                var arg1= args[1];
                if ( isArray(arg1) ) {
                    if ( arg1.length === 2 ) {
                        var cellTL= stringToCell(arg1[0]);
                        var cellBR= stringToCell(arg1[1]);
                        ranges.push([ cellTL[0], cellTL[1], cellBR[0], cellBR[1] ]);
                        return;
                    }
                }
            }
            throw "ArgException";
        };

        var addRange() {
            return new Ranges(_addRange(ranges.concat(), arguments));
        }

        var addRanges( newRanges ) {
            var newNewRanges= ranges.concat();
            for each (var range in newRanges) _addRange(newNewRanges, range);
        };

        var intersection= function () {
            if ( ranges.length <= 1 ) return new Ranges(ranges);
            var newRange= ranges.shift();
            for each ( var range in ranges ) {
                if ( range[0] > newRange[0] ) newRange[0]= range[0];
                if ( range[1] > newRange[1] ) newRange[1]= range[1];
                if ( range[2] < newRange[2] ) newRange[2]= range[2];
                if ( range[3] < newRange[3] ) newRange[3]= range[3];
            }
            if ( newRange[0] > newRange[2] || newRange[1] > newRange[3] ) return [];
            return new Ranges([ newRange ]);
        };

        var union= function () {
            if ( ranges.length <= 1 ) return new Ranges(ranges);
            var newRange= ranges.shift();
            for each ( var range in ranges ) {
                if ( range[0] < newRange[0] ) newRange[0]= range[0];
                if ( range[1] < newRange[1] ) newRange[1]= range[1];
                if ( range[2] > newRange[2] ) newRange[2]= range[2];
                if ( range[3] > newRange[3] ) newRange[3]= range[3];
            }
            return new Ranges([ newRange ]);
        }

        var flatten= function () {
            var ranges= ranges.concat();
            var lookup= {};
            var newRanges= [];
            for each (var range in ranges) {
                for ( var y= range[1]; y <= range[3]; y++ ) {
                    for ( var x= range[1]; x <= range[2]; x++ ) {
                        if ( lookup[x + ':' + y] ) continue;
                        newRanges.push([x, y, x, y]);
                        lookup[x + ':' + y]= 1;
                    }
                }
            }
            return new Ranges(newRanges);
/*
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

        this.addRange= addRange;
        this.addRanges= addRanges;
        this.intersection= intersection;
        this.union= union;
        this.flatten= flatten;
    }

