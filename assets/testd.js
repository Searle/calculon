
// var ranges= new Ranges().addRange( 'C5', 'D8' );

var ranges= R('C5','D8');
ranges._dump("ranges");

var newranges= ranges.addRange('C3', 'D4');
newranges._dump("newranges");

var Inf= Number.MAX_VALUE;
var EmptyRanges= new Ranges();

C(2, 4).value= "A1";
C(2, 5).value= "A2";
C(2, 6).value= "Steppi";
C(4, 6).value= "HUHU!";
C(2, 7).value= "A4";

function SVERWEIS(searchRanges, value, col_i) {
    return searchRanges.crop(0, 0, 0, Inf).grep(value).ofs(col_i, 0);
}

sv= SVERWEIS(ranges, "Steppi", 2);
sv._dump("sv");

console.log("Ergebnis:", C(sv._ranges[0][0], sv._ranges[0][1]));
