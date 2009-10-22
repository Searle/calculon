
/*
// var ranges= new Ranges().addRange( 'C5', 'D8' );

var ranges= R('C5','D8');
ranges._dump("ranges");

var newranges= ranges.addRange('C3', 'D4');
newranges._dump("newranges");

var Inf= Number.MAX_VALUE;
var EmptyRange= new Ranges();

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
*/


var List= function (vals) {

    var _List= function (parent, inx) {

        this.add=       function(inx1)  new _Add(this, inx, inx1)
        this.left=      function(n)     new _Left(this, inx, n)
        this.grep=      function(value) new _Grep(this, inx, value)

        this.chainDeps= function() parent ? parent.chainDeps() : inx;
        this.valueDeps= function() parent ? parent.valueDeps() : inx;

        this.value= function() {
            return inx.map(function (inxv) { return vals[inxv]; })
        }

        this.__inx= function() inx      // DEBUG
    }

    var union= function(ar1, ar2) ar1.concat(ar2.filter( function(v) ar1.indexOf(v) < 0 )) 

    var _Left= function (parent, inx, n) {
        inx= inx.slice(0, n);
        _List.call(this, parent, inx);
        this.valueDeps= function() inx
    }

    var _Add= function (parent, inx, inx1) {
        inx= union(inx, inx1);
        _List.call(this, parent, inx);
        delete inx1;
        this.chainDeps= function() parent ? union(parent.chainDeps(), inx1) : inx;
        this.valueDeps= function() inx
    }

    var _Grep= function (parent, inx, value) {
        inx= inx.filter(function (inxv) { return value == vals[inxv]; });
        _List.call(this, parent, inx);
        this.valueDeps= function() inx
    }

    _Add.prototype.__proto__= _List.prototype;

    return new _List(null, []);
}

var cell= List([ 'A', 'B', 'B', 'D', 'E' ])
    .add([ 0, 1, 2 ])
    .grep('A')
    .add([ 1, 2 ])
    .left(3)
    .grep('B')
    .add([ 4 ])
;

console.log(cell);
console.log(cell.__inx());
console.log("RECALC IN CHANGES IN:", cell.chainDeps());
console.log("CIRCULAR REFS IF:", cell.valueDeps());
console.log("RESULT:", cell.value());

