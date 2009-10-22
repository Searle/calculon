var ranges= new Ranges().addRange( 'A1', 'B5' );

console.log(ranges.ranges);

var newranges= ranges.addRange( 'C3', 'D4' );

console.log(newranges.ranges);

flat= newranges.flatten();

var Inf= Number.MAX_VALUE;
var EmptyRanges= new Ranges();

C(0, 0).value= "A1";
C(0, 1).value= "A2";
C(0, 2).value= "A3";
C(0, 3).value= "A4";

function SVERWEIS(searchRanges, value, col_i) {

    var col= searchRanges.crop(0, 0, 0, Inf).grep(value);

searchRanges._dump("searchRanges");
col._dump("col");

    var col= searchRanges.crop(0, 0, 0, Inf).grep(value);
    if ( col.length === 0 ) return EmptyRanges;
    return col; // .addRange(?).crop(col_i, 1);
}

sv= SVERWEIS(ranges, "A3", 2);
sv._dump("sv");
