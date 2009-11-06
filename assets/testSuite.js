
var _test= function(title, fn, expected, compare) {
    if ( typeof compare === 'undefined' ) {
        compare= function(result) result === expected
    }
    var result= fn();
    var success= compare(result, expected);
    if (success) {
        console.warn('Success: ' + title);
    }
    else {
        console.error('Failed: ' + title)
        console.info('Got: ', result, 'Expected: ', expected)
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

    // disable error console temporarily
    var _console_error= console.error
    console.error= function() {}
    _test('C(A1).setValue(C(A1).add(5)).getValue() (recursion test)', function() C('A1').setValue(function() C('A1').add(5)).getValue(), null)
    console.error= _console_error

    C('A1').setValue(1);
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

var _test_init= function(fn) {
    var i= 0
    var expected= []
    if (fn === undefined) fn= function() i++
    for (var row= 1; row < 10; row++) {
        for each (var col in ['B', 'C', 'D', 'E']) {
            var value= fn(col, row)
            C(col + row).setValue(value)
            expected.push(value)
        }
    }
    return expected
}

var test_ranges= function() {
    var expected= _test_init(function(c, r) c + r)
    _test('getValues("B1:E9")', function() C('B1', 'E9').getValues(), expected, _compareArray)
    _test('grep("C5")', function() C('B1', 'E9').grep('C5').getValue(), 'C5')
    _test('ofs(1,1)', function() C('B1', 'E9').ofs(1,1).getValue(), 'C2')
    _test('ofs(20,20)', function() C('B1', 'E9').ofs(20,20).getValue(), undefined)

    _test('relTo(addRef)', function() C('A2').addRel(C('B1', 'E9').relTo(C('A1'))).getValues(), C('B2', 'E10').getValues(), _compareArray)
}

var test_cellops= function() {
    var expected= _test_init()
    var sum= 0
    expected.forEach(function(v) sum+= v)
    var expectedP3= expected.map(function(v) v + 3)
    _test('C("B1:E9")', function() C('B1', 'E9').getValues(), expected, _compareArray)
    _test('C("B1:E9").sum()', function() C('B1', 'E9').sum().getValue(), sum)
    _test('C("B1:E9").add(3)', function() C('B1', 'E9').add(3).getValues(), expectedP3, _compareArray)
    _test('C("B1:E9").add(1).add(2)', function() C('B1', 'E9').add(1).add(2).getValues(), expectedP3, _compareArray)
    _test('C("B1:E9").add(3).sum()', function() C('B1', 'E9').add(3).sum().getValue(), sum + 3 * expected.length)

    var expected2= []
    var i= 0
    for (var row= 1; row < 11; row++) {
        for each (var col in ['B', 'C', 'D', 'E']) {
            expected2.push(expected[i++])
        }
        expected2.push(undefined)
    }
    var expected2P3= expected2.map(function(v) (v || 0) + 3)

    _test('C("B1:F10")', function() C('B1', 'F10').getValues(), expected2, _compareArray)
    _test('C("B1:F10").sum()', function() C('B1', 'F10').sum().getValue(), sum)
    _test('C("B1:F10").add(3)', function() C('B1', 'F10').add(3).getValues(), expected2P3, _compareArray)
    _test('C("B1:F10").add(1).add(2)', function() C('B1', 'F10').add(1).add(2).getValues(), expected2P3, _compareArray)
    _test('C("B1:F10").add(3).sum()', function() C('B1', 'F10').add(3).sum().getValue(), sum + 3 * expected2.length)
}

var test_sverweis= function() {
    _test_init(function(c, r) c + r)

    var SVERWEIS= function ( searchRanges, value, col_i ) searchRanges.crop(0, 0, 0, Number.MAX_VALUE).grep(value).ofs(col_i, 0)
    _test('SVERWEIS("B1:E9", "B6", 2)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D6'], _compareArray)
    C('B3').setValue('B6')
    _test('SVERWEIS("B1:E9", "B6", 2) (2 results)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D3', 'D6'], _compareArray)
    _test('SVERWEIS("B1:E9", "D3", 2)', function() SVERWEIS(C('B1', 'E9'), 'D3', 2).getValues(), [], _compareArray)
    _test(
        'SVERWEIS("B1:E9", "B1 || B6", 2) (value is function)',
        function() SVERWEIS(C('B1', 'E9'), function(v) v === 'B1' || v === 'B6', 2).getValues(),
        ['D1', 'D3', 'D6'],
        _compareArray
    )
}


test_SetGet()
test_ranges()
test_cellops()
test_sverweis()


