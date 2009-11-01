
var test_ranges= function() {
    // var ranges= new Ranges().addRange( 'C5', 'D8' )

    var ranges= C('C5','D8')
    ranges.dump("ranges")

    var newranges= ranges.addRange('C3', 'D4')
    newranges.dump("newranges")

    var Inf= Number.MAX_VALUE
    var EmptyRange= new Ranges()

            C('C5').setValue("C5")

    var C6= C('C6').setValue("C6")
            C('E6').setValue("Zuppi")

            C('C7').setValue("Steppi")
            C('E7').setValue("HUHU!")

            C('C8').setValue("C8")

//    DumpCells()

    var SVERWEIS= function ( searchRanges, value, col_i ) {
        // var sv= searchRanges.dump("init").crop(0, 0, 0, Inf).dump("cropped").grep(value).ofs(col_i, 0)
        // sv= sv.grep(value)          // geht???
        // sv= sv.dump("grepped")      // geht nicht??? oder jetzt doch? hmm
        // return sv

        // ofs ist evt falsch, wenn sich col_i innerhalb von searchRanges befinden muss

        // return searchRanges.crop(0, 0, 0, Inf).grep(value)
        GREP= searchRanges.crop(0, 0, 0, Inf).grep(value);
        return GREP.ofs(col_i, 0)

        return searchRanges.crop(0, 0, 0, Inf).grep(value).ofs(col_i, 0)
    }

    var sv= SVERWEIS(newranges, "Steppi", 2); // .dump("sverweis Steppi")

    console.warn("SV Ergebnis:", sv.getValue() )

//    console.log("SV valueDeps:", V(sv.valueDeps()))
//    console.log("SV cellRefs:", V(sv.cellRefs()))
//    C(2, 6)._dumpRefs("2,6");
//    C(4, 6)._dumpRefs("4,6");

    console.warn("GREP valueDeps:", V(GREP.valueDeps()))
    console.warn("C6 valueDeps:", V(C6.valueDeps()))

    // sv.value aendern. jetzt muss grep neu gemacht werden
    C6
        ._dumpCellRefs("Refs C6")
        .dirty()
        .setValue("Steppi")

    console.warn("SV Ergebnis:", sv.getValue() )
    console.warn("SV Ergebnis:", sv.getValue() )

            C('H1').setValue(6)
            C('H2').setValue(17)

    // H1 + H2

            C('H3').setValue(0)


    console.warn("H1 Ergebnis:", C('H1').getValue() )
    console.warn("H2 Ergebnis:", C('H2').getValue() )
    console.warn("H3 Ergebnis:", C('H3').getValue() )

    // console.log("Ergebnis:", SVERWEIS(ranges, "Steppi", 2) .dump("sverweis Steppi") .value() )
    // console.log("Ergebnis:", SVERWEIS(ranges, "Steppi2", 2).dump("sverweis Steppi2").value() )

}

var test_model= function() {
    var List= function (vals) {

        var _List= function (parent, inx) {

            this.add=       function(inx1)  new _Add(this, inx, inx1)
            this.left=      function(n)     new _Left(this, inx, n)
            this.grep=      function(value) new _Grep(this, inx, value)

            this.chainDeps= function() parent ? parent.chainDeps() : inx
            this.valueDeps= function() parent ? parent.valueDeps() : inx
    
            this.value= function() {
                return inx.map(function (inxv) { return vals[inxv] })
            }

            this.__inx= function() inx      // DEBUG
        }

        var union= function(ar1, ar2) ar1.concat(ar2.filter( function(v) ar1.indexOf(v) < 0 )) 

        var _Left= function (parent, inx, n) {
            inx= inx.slice(0, n)
            _List.call(this, parent, inx)
            this.valueDeps= function() inx
        }

        var _Add= function (parent, inx, inx1) {
            inx= union(inx, inx1)
            _List.call(this, parent, inx)
            delete inx1
            this.chainDeps= function() parent ? union(parent.chainDeps(), inx1) : inx
            this.valueDeps= function() inx
        }

        var _Grep= function (parent, inx, value) {
            inx= inx.filter(function (inxv) { return value == vals[inxv] })
            _List.call(this, parent, inx)
            this.valueDeps= function() inx
        }

        _Add.prototype.__proto__= _List.prototype

        return new _List(null, [])
    }

    var cell= List([ 'A', 'B', 'B', 'D', 'E' ])
        .add([ 0, 1, 2 ])
        .grep('A')
        .add([ 1, 2 ])
        .left(3)
        .grep('B')
        .add([ 4 ])
    

    console.log(cell)
    console.log(cell.__inx())
    console.log("RECALC IN CHANGES IN:", cell.chainDeps())
    console.log("CIRCULAR REFS IF:", cell.valueDeps())
    console.log("RESULT:", cell.value())
}

var test_let= function() {
    let x= 1
    var ar= [ [ 1, 2], [3, 4], [5, 6] ]
    for each ( let [x, y] in ar ) console.log("let test:", x, y)
}

test_ranges()
// test_model()
// test_let()

