var _statistic= {
    tests: 0,
    failed: 0,
    success: 0,
}

var showTimer= true

var _test= function(title, fn, expected, compare) {
    if ( typeof compare === 'undefined' ) {
        compare= function(result) result === expected
    }
    _statistic.tests++
    if (showTimer) console.time('test time "' + title +'"')
    var result= fn();
    if (showTimer) console.timeEnd('test time "' + title +'"')
    var success= compare(result, expected);
    if (success) {
        _statistic.success++
        console.warn('Success: ' + title);
    }
    else {
        _statistic.failed++
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

var _cmpNum= function(a, b) a < b ? -1 : a === b ? 0 : 1

var test_SetGet= function() {
    _test('C(A1).getValue() (undefined cell)', function() C('A1').getValue(), undefined)
    C('A1').setCell(1);
    _test('C(A1).getValue()', function() C('A1').getValue(), 1)
    _test('C(A1).add(5).getValue()', function() C('A1').add(5).getValue(), 6)

    _test('C(A1).set(2).getValue()', function() C('A1').set(2).getValue(), 2)
    _test('C(A1).set(3).add(1).getValue()', function() C('A1').set(3).add(1).getValue(), 4)
    _test('C(A1).add(1).set(4).getValue()', function() C('A1').add(1).set(4).getValue(), 4)
    _test('C(A1).add(1).set(5).add(1).getValue()', function() C('A1').add(1).set(5).add(1).getValue(), 6)

    _test('C(A1).set(C(A1)).getValue() (recursion test)', function() C('A1').set(C('A1')).getValue(), null)
    _test('C(A1).set(C(A1).add(5)).getValue() (recursion test)', function() C('A1').set(C('A1').add(5)).getValue(), null)
    _test('C(A1).set(C(A2).set(C(A1))).getValue() (recursion test)', function() C('A1').set(C('A2').set(C('A1'))).getValue(), null)
    C('A1').setCell(C('A2'))
    C('A2').setCell(C('A1'))
    _test('C(A1).set(C(A2).set(C(A1))) (recursion test2)', function() C('A1').getValue(), null)

    C('A1').setCell(1);
    C('A2', 'A10').setCell(function() this.ofs(0, -1).getValue() + 1);
    _test('C(A2).getValue() set returns value', function() C('A2').getValue(), 2)
    _test('C(A10).getValue() set returns value', function() C('A10').getValue(), 10)
    C('A2', 'A10').setCell(function() this.ofs(0, -1).add(1));
    _test('C(A2).getValue() set returns atom', function() C('A2').getValue(), 2)
    _test('C(A10).getValue() set returns atom', function() C('A10').getValue(), 10)
    C('A1').setCell('1');
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
            C(col + row).setCell(value)
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

    _test('C("B1:E1").add(100).ofs(0,1)', function() C('B1', 'E1').add(100).ofs(0,1).getValues(), [4, 5, 6, 7], _compareArray)
    _test('C("B1:E1").add(100).ofs(0,1).add(200)', function() C('B1', 'E1').add(100).ofs(0,1).add(200).getValues(), [204, 205, 206, 207], _compareArray)
    _test(
        'C("B1:E1").add(100).ofs(0,1).add(200).ofs(0,-1)',
        function() C('B1', 'E1').add(100).ofs(0,1).add(200).ofs(0,-1).getValues(),
        [100, 101, 102, 103],
        _compareArray
    )

    _test('C("B1:E9").prod()', function() C('B1', 'E9').prod().getValue(), 0)
    _test('C("B2:E9")', function() C('B2', 'E9').getValues(), expected.filter(function(v) v > 3), _compareArray)
    _test('C("B2:E9").addRange("C1:E9")', function() C('B2', 'E9').addRange('C1', 'E9').getValues().sort(_cmpNum), expected.filter(function(v) v), _compareArray)
    var prod= 1
    expected.filter(function(v) v).map(function(v) prod*= v)
    _test('C("B2:E9").prod()', function() C('B2', 'E9').prod().getValue(), prod / 6)
    _test('C("B2:E9").addRange("C1:E9").prod()', function() C('B2', 'E9').addRange('C1', 'E9').prod().getValue(), prod)
    _test('C("B2:F10").prod()', function() C('B2', 'F10').prod().getValue(), prod / 6)
    _test('C("B2:F10").addRange("C1:F10").prod()', function() C('B2', 'F10').addRange('C1', 'F10').prod().getValue(), prod)

    _test('C("B1").add(1).addRange("B1:E9").prod()', function() C('B1').add(1).addRange('B1', 'E9').prod().getValue(), prod)
    _test('C("B1:E9").grep(0)', function() C('B1', 'E9').grep(0).getValues(), [0], _compareArray)

    // TODO: should this work without ...getValue()?
    C('B1').setCell(0)
    _test('C("B1").grep(C("B1").set(8))', function() C('B1').grep(C('B1').set(8).getValue()).getValues(), [], _compareArray)
    C('B1').setCell(0)
    _test('C("B1").grep(C("B1").setCell(8))', function() C('B1').grep(C('B1').setCell(8).getValue()).getValues(), [8], _compareArray)

    C('B1').setCell(0)
    _test('C("B1:E9").grep(0).set(1).grep(1).set(8)', function() C('B1', 'E9').grep(0).set(1).grep(1).set(8).getValues(), [8], _compareArray)
    C('B1').setCell(0)
    _test('C("B1:E9").grep(0).set(1).addRange("B1:E9").prod()', function() C('B1', 'E9').grep(0).set(1).addRange('B1', 'E9').prod().getValue(), prod)
    _test('C("B1")', function() C('B1').getValue(), 0)
}

var test_sverweis= function() {
    _test_init(function(c, r) c + r)

    var SVERWEIS= function ( searchRanges, value, col_i ) searchRanges.crop(0, 0, 0, Number.MAX_VALUE).grep(value).ofs(col_i, 0)
    _test('SVERWEIS("B1:E9", "B6", 2)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D6'], _compareArray)
    C('B3').setCell('B6')
    _test('SVERWEIS("B1:E9", "B6", 2) (2 results)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D3', 'D6'], _compareArray)
    _test('SVERWEIS("B1:E9", "D3", 2)', function() SVERWEIS(C('B1', 'E9'), 'D3', 2).getValues(), [], _compareArray)
    _test(
        'SVERWEIS("B1:E9", "B1 || B6", 2) (value is function)',
        function() SVERWEIS(C('B1', 'E9'), function(v) v === 'B1' || v === 'B6', 2).getValues(),
        ['D1', 'D3', 'D6'],
        _compareArray
    )
}

if (showTimer) console.time('all tests')

test_SetGet()
test_ranges()
test_cellops()
test_sverweis()

if (showTimer) console.timeEnd('all tests')


document.write(
    '<table>' +
    '<tr><td>Tests run:</td><td>' + _statistic.tests + '</td></tr>' +
    '<tr><td>Success:</td><td>' + _statistic.success + ' (' + (Math.floor(_statistic.success / _statistic.tests * 1000)/10) + '%)</td></tr>' +
    '<tr><td>Failed:</td><td>' + _statistic.failed + ' (' + (Math.floor(_statistic.failed / _statistic.tests * 1000)/10) + '%)</td></tr>' +
    '</table>'
)
