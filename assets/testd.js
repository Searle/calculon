
var test_ranges4= function() {

//    var ranges= C('C5').XsetValue(5)

//    console.warn(ranges.getValue());

    Set(C('C5'), 5);
    console.log(C('C5').getValues());

    Set(C('C6', 'C8'), 7);
    console.log(C('C7').getValues());
    console.log(C('C7').add(5).getValues());
    Set(C('C9'), C('C7').add(5));
    console.log(C('C9').getValues());

    var ranges= C('C5','D8')
    ranges.dump("ranges")

    var newranges= ranges.addRange('C3', 'D4')
    newranges.dump("newranges")

    var Inf= Number.MAX_VALUE

    Set(C('C5'), "C5")

    Set(C('C6'), "C6")
    Set(C('E6'), "Zuppi")

    Set(C('C7'), "Steppi")
    Set(C('E7'), "HUHU!")

    Set(C('C8'), "C8")

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

    console.warn("SV Ergebnis:", sv.getValues() )
    
    Set(C('C6'), 'Steppi');
    console.warn("SV Ergebnis:", sv.getValues() )
    
/*
    var v2= C('C5', 'C6').XsetValue(5).addRange('C6', 'C7').Xadd(1)
    // 6, 6, 1
    
    var v_a= C('C5', 'C6').XsetValue(5);
    var v_b= C('C7', 'C8').XsetValue(6);
    var v_ab= v_a.addRange(v_b);
    console.log(v_ab.getValues())
    // 5,5,6,6
    
    Set(['C1:D4', 'J6:K8'], function() {....})
    

    var a= C('C7', 'C8').setValue(6)
//    C('C5', 'C6').XsetValue(5).addRange('C7', 'C8').getValues() // 5, 5, 6, null
    C('C5', 'C6').XsetValue(5).addRange(a).getValues() // 5, 5, 6, 6

*/

}

var test_ranges= function() {

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

    // H3 = H1 + H2 + 5

    // Fehler: "add" ist deklarativ

            C('H3').setValue(C('H1').add(C('H2')).add(V(5)))

    console.warn("H1 Ergebnis:", C('H1').getValue() )
    console.warn("H2 Ergebnis:", C('H2').getValue() )
    console.warn("H3 Ergebnis:", C('H3').getValue() )

    var V8= V(8)
    var cv= V8.setValue(10).add(13);
    var cv2= V8.setValue(20)
    console.warn("cv Ergebnis:", cv.getValue() )

    // console.log("Ergebnis:", SVERWEIS(ranges, "Steppi", 2) .dump("sverweis Steppi") .value() )
    // console.log("Ergebnis:", SVERWEIS(ranges, "Steppi2", 2).dump("sverweis Steppi2").value() )

/*
    A1= 1
    A2= 2
    B1= Cell(A1, A2)
    B2= 3

    B1.getValue()
*/

}

var test_let= function() {
    let x= 1
    var ar= [ [ 1, 2], [3, 4], [5, 6] ]
    for each ( let [x, y] in ar ) console.log("let test:", x, y)
}

// test_ranges()
test_ranges4()
// test_let()

