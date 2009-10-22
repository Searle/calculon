var ranges= new Ranges().addRange( 'C5', 'D6' );

console.log(ranges.ranges);

var newranges= ranges.addRange( 'C3', 'D4' );

console.log(newranges.ranges);

flat= newranges.flatten();

var Inf= Number.MAX_VALUE;
var EmptyRanges= new Ranges();

function SVERWEIS(searchRanges, value, col_i) {


    var col= searchRanges.crop(0, 0, 0, Inf);

searchRanges._dump("searchRanges");
col._dump("col");

    var col= searchRanges.crop(0, 0, 1, Inf).grep(value);
    if ( col.length === 0 ) return EmptyRanges;
    return col.crop(col_i, 1);
}

sv= SVERWEIS(ranges, 3, 2);
console.log(sv);
