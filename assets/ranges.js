

    var Ranges= function(ranges) {

        if ( !ranges ) ranges= [];
        if ( this === window ) return new Ranges(ranges);

        var isFunction= function( obj ) {
            return Object.prototype.toString.call(obj) === "[object Function]"
        }

        var isArray= function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]"
        };

        var stringToCell= function(str) {
            var col= "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1));
            if ( col < 0 ) throw "NoValidCellName";
            var row= parseInt(str.substr(1), 10);
            if ( isNaN(row) || row <= 0 ) throw "NoValidCellName";
            return [ col, row - 1 ];
        };

        var _addRange= function( ranges, args ) {
            if ( isArray(args) ) {
                if ( args.length === 2 ) {
                    var cellTL= stringToCell(args[0]);
                    var cellBR= stringToCell(args[1]);
                    ranges.push([ cellTL[0], cellTL[1], cellBR[0], cellBR[1] ]);
                    return ranges;
                }
            }
            throw "ArgException";
        };

        var addRange= function() {
            return new Ranges(_addRange(ranges.concat(), Array.prototype.slice.call(arguments)));
        }

        var addRanges= function( newRanges ) {
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

        this.addRange= addRange;
        this.addRanges= addRanges;
        this.intersection= intersection;
        this.union= union;

this.ranges= ranges;
    }

