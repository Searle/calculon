
var test_ranges= function() {

    var ranges= C('C5','D8')
    ranges.dump("ranges")

    var newranges= ranges.addRange('C3', 'D4')
    newranges.dump("newranges")

    var Inf= Number.MAX_VALUE

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

//    console.log("SV valueDeps:", Rd(sv.valueDeps()))
//    console.log("SV cellRefs:", Rd(sv.cellRefs()))
//    C(2, 6)._dumpRefs("2,6");
//    C(4, 6)._dumpRefs("4,6");

    console.warn("GREP valueDeps:", GREP.valueDepsAsString())
    console.warn("C6 valueDeps:", C6.valueDepsAsString())

    // sv.value aendern. jetzt muss grep neu gemacht werden
    C6
        ._dumpCellRefs("C6")
        // .dirty()
        .setValue("Steppi")

    console.warn("SV Ergebnis:", sv.getValue() )
    console.warn("SV Ergebnis:", sv.getValue() )

            C('H1').setValue(6)
            C('H2').setValue(17)

    // H1 + H2

            C('H3').setValue(0)

    V1();

    console.warn("H1 Ergebnis:", C('H1').getValue() )
    console.warn("H2 Ergebnis:", C('H2').getValue() )
    console.warn("H3 Ergebnis:", C('H3').getValue() )

    // console.log("Ergebnis:", SVERWEIS(ranges, "Steppi", 2) .dump("sverweis Steppi") .value() )
    // console.log("Ergebnis:", SVERWEIS(ranges, "Steppi2", 2).dump("sverweis Steppi2").value() )

}

var test_let= function() {
    let x= 1
    var ar= [ [ 1, 2], [3, 4], [5, 6] ]
    for each ( let [x, y] in ar ) console.log("let test:", x, y)
}

test_ranges()
// test_model()
// test_let()

