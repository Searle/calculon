
var _test= function(title, fn, expected, compare) {
    if ( typeof compare === 'undefined' ) {
        compare= function(result) result == expected
    }
    var result= fn();
    var success= compare(result, expected);
    if (success) {
        console.warn('Success: ' + title);
    }
    else {
        console.error('Failed: ' + title)
        console.log('Got: ', result, 'Expected: ', expected)
    }
}

var _compareArray= function(a, b) {
    if (a.length !== b.length) return false
    for (var i in a) {
        if (a[i] !== b[i]) return false
    }
    return true
}

var test_SetGet= function() {
    C('A1').setValue(1);
    _test('C(A1).getValue()', function() C('A1').getValue(), 1)
    _test('C(A1).add(5).getValue()', function() C('A1').add(5).getValue(), 6)
    C('A2', 'A10').setValue(function() this.ofs(0, -1).getValue() + 1);
    _test('C(A2).getValue() setValue returns value', function() C('A2').getValue(), 2)
    _test('C(A10).getValue() setValue returns value', function() C('A10').getValue(), 10)
    C('A2', 'A10').setValue(function() this.ofs(0, -1).add(1));
    _test('C(A2).getValue() setValue returns atom', function() C('A2').getValue(), 2)
    _test('C(A10).getValue() setValue returns atom', function() C('A10').getValue(), 10)
    C('A1').setValue('1');
    _test('C(A2).getValue() first cell is a string', function() C('A2').getValue(), '11')
    _test('C(A10).getValue() first cell is a string', function() C('A10').getValue(), '1111111111')
}

var test_ranges= function() {
    var expected= [];
    for (var row= 1; row < 10; row++) {
        for each (var col in ['B', 'C', 'D', 'E']) {
            C(col + row).setValue(col + row)
            expected.push(col + row)
        }
    }
    _test('getValues("B1:E9")', function() C('B1', 'E9').getValues(), expected, _compareArray)
    _test('grep("C5")', function() C('B1', 'E9').grep('C5').getValue(), 'C5')
    _test('ofs(1,1)', function() C('B1', 'E9').ofs(1,1).getValue(), 'C2')
    _test('ofs(20,20)', function() C('B1', 'E9').ofs(20,20).getValue(), undefined)
}

var test_sverweis= function() {
    var SVERWEIS= function ( searchRanges, value, col_i ) searchRanges.crop(0, 0, 0, Number.MAX_VALUE).grep(value).ofs(col_i, 0)
    _test('SVERWEIS("B1:E9", "B6", 2)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D6'], _compareArray)
    C('B3').setValue('B6')
    _test('SVERWEIS("B1:E9", "B6", 2) (2)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D3', 'D6'], _compareArray)
    _test('SVERWEIS("B1:E9", "D3", 2)', function() SVERWEIS(C('B1', 'E9'), 'D3', 2).getValues(), [], _compareArray)
}


test_SetGet()
test_ranges()
test_sverweis()


