(function() {
    var _statistic= {
        tests: 0,
        failed: 0,
        success: 0,
    }

    var _params= {}
    document.location.search.substr(1).split('&').forEach(function(option) {
        var p= option.split('=', 2)
        _params[p[0]]= p[1] === undefined ? true : p[1]
    })

    var _showTimer= _params.profiler

    var _timerStart= function() {}
    var _timerEnd= function() {}

    if (_showTimer) {
        _timerStart= console.time
        _timerEnd= console.timeEnd
    }

    var _compareArray= function(a, b) {
        if (a.length !== b.length) return false
        for (var i in a) {
            if (a[i] !== b[i]) return false
        }
        return true
    }

    var _cmpNum= function(a, b) a < b ? -1 : a === b ? 0 : 1

    var _test= function(title, fn, expected, compare) {
        if ( typeof compare === 'undefined' ) {
            if (Object.prototype.toString.call(expected) === '[object Array]') {
                compare= _compareArray
            }
            else {
                compare= function(result) result === expected
            }
        }
        _statistic.tests++

        // do not show error messages
        var fnError= console.Error
        console.Error= function() {}

        _timerStart('test time "' + title +'"')
        var result= fn();
        _timerEnd('test time "' + title +'"')

        // restore error handling
        console.Error= fnError

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

    var test_SetGet= function() {
        // various set/get with constants
        _test('C(A1) (undefined cell)', function() C('A1').getValue(), undefined)
        _test('C(A1).set(1)', function() C('A1').set(1).getValue(), 1)
        _test('C(A1) (not modified by previous test)', function() C('A1').getValue(), undefined)
        C('A1').setCell(1)
        _test('C(A1).setCell(1); C(A1)', function() C('A1').getValue(), 1)
        _test('C(A1).setCell(2)', function() C('A1').setCell(2).getValue(), 2)

        // various set/get with atoms, resursion tests
        _test('C(A2).set(C(A1))', function() C('A2').set(C('A1')).getValue(), 2)
        _test('C(A2) (not modified by previous test)', function() C('A2').getValue(), undefined)
        _test('C(A2).setCell(C(A1))', function() C('A2').setCell(C('A1')).getValue(), 2)
        _test('C(A2) (modified by previous test)', function() C('A2').getValue(), 2)
        C('A1').setCell(5)
        _test('C(A1).setCell(5); C(A2)', function() C('A2').getValue(), 5)
        _test('C(A2).set(C(A2)) (no recursion)', function() C('A2').set(C('A2')).getValue(), 5)
        _test('C(A1).set(C(A2)) (no recursion)', function() C('A1').set(C('A2')).getValue(), 5)
        _test('C(A2).setCell(C(A2)) (recursion)', function() C('A2').setCell(C('A2')).getValue(), null)
        _test('C(A1).setCell(C(A2)) (recursion)', function() C('A1').setCell(C('A2')).getValue(), null)
        C('A1').setCell(10)
        _test('C(A1).set(C(A1).set(1)) (no recursion)', function() C('A1').set(C('A1').set(1)).getValue(), 1)
        _test('C(A1) (not modified by previous test)', function() C('A1').getValue(), 10)
        _test('C(A1).set(C(A1).setCell(1).add(1)) (no recursion)', function() C('A1').set(C('A1').setCell(1).add(1)).getValue(), 2)
        _test('C(A1) (modified by previous test)', function() C('A1').getValue(), 1)
        _test('C(A1).setCell(C(A1).setCell(1).add(1)) (no recursion)', function() C('A1').setCell(C('A1').setCell(1).add(1)).getValue(), 2)
        _test('C(A1) (modified by previous test)', function() C('A1').getValue(), 2)

        // various set/get over ranges
        C('A1').setCell(1)
        C('A2').setCell(1)
        _test('C(A1:A5)', function() C('A1', 'A5').getValues(), [1,1,undefined,undefined,undefined])
        _test('C(A1:A5).set(1)', function() C('A1', 'A5').set(1).getValues(), [1,1,1,1,1])
        _test('C(A1:A5) (not modified by previous test)', function() C('A1', 'A5').getValues(), [1,1,undefined,undefined,undefined])
        _test('C(A1:A5).setCell(1)', function() C('A1', 'A5').setCell(1).getValues(), [1,1,1,1,1])
        _test('C(A1:A5) (modified by previous test)', function() C('A1', 'A5').getValues(), [1,1,1,1,1])

        // various set/get over ranges with atom references
        _test(
            'C(A2:A5).set(function() this.ofs(0,-1).add(1))',
            function() C('A2', 'A5').set(function() this.ofs(0,-1).add(1)).getValues(),
            [2,3,4,5]
        )
        _test('C(A1:A5) (not modified by previous test)', function() C('A1', 'A5').getValues(), [1,1,1,1,1])
        _test(
            'C(A2:A5).setCell(function() this.ofs(0,-1).add(1))',
            function() C('A2', 'A5').setCell(function() this.ofs(0,-1).add(1)).getValues(),
            [2,3,4,5]
        )
        _test('C(A1:A5) (modified by previous test)', function() C('A1', 'A5').getValues(), [1,2,3,4,5])
        _test(
            'C(A1:A5).set(function() this) (recursion)',
            function() C('A1', 'A5').set(function() this).getValues(),
            [null,null,null,null,null]
        )
        _test(
            'C(A1:A5).set(function() this.ofs(0,0)) (recursion)',
            function() C('A1', 'A5').set(function() this.ofs(0,0)).getValues(),
            [null,null,null,null,null]
        )
        _test(
            'C(A1:A5).set(function() this.ofs(1,1).ofs(-1,-1)) (recursion)',
            function() C('A1', 'A5').set(function() this.ofs(1,1).ofs(-1,-1)).getValues(),
            [null,null,null,null,null]
        )
        _test('C(A1:A5) (not modified by previous tests)', function() C('A1', 'A5').getValues(), [1,2,3,4,5])

        // test some cascaded operations
        _test(
            'C(A1).setCell(C(A1)).set(1) (no recursion)',
            function() C('A1').setCell(C('A1')).set(1).getValue(),
            1
        )
        _test(
            'C(A1).setCell(C(A1)).add(1) (recursion)',
            function() C('A1').setCell(C('A1')).add(1).getValue(),
            null
        )
        _test(
            'C(A1).setCell(C(A1)).add(1).set(3).add(5) (no recursion)',
            function() C('A1').setCell(C('A1')).add(1).set(3).add(5).getValue(),
            8
        )

        // test cache invalidation and string operations
        C('A1').setCell(1)
        C('A2', 'A5').setCell(function() this.ofs(0,-1).add(1))
        _test('C(A2) (first cell is a number)', function() C('A2').getValue(), 2)
        _test('C(A5) (first cell is a number)', function() C('A5').getValue(), 5)
        C('A1').setCell('1')
        _test('C(A2) (first cell is a string)', function() C('A2').getValue(), '11')
        _test('C(A5) (first cell is a string)', function() C('A5').getValue(), '11111')
    }

    var test_ranges= function() {
        var expected= _test_init(function(c, r) c + r)
        _test('C(B1:E9).grep(C5)', function() C('B1', 'E9').grep('C5').getValue(), 'C5')
        _test('C(B1:E9).ofs(1,1)', function() C('B1', 'E9').ofs(1,1).getValue(), 'C2')
        _test('C(B1:E9).ofs(20,20)', function() C('B1', 'E9').ofs(20,20).getValue(), undefined)

        _test(
            'C(A2).addRel(C(B1:E9).relTo(C(A1)))',
            function() C('A2').addRel(C('B1', 'E9').relTo(C('A1'))).getValues(),
            C('B2', 'E10').getValues()
        )
    }

    var test_cellops= function() {
        var expected= _test_init()
        var sum= 0
        expected.forEach(function(v) sum+= v)
        var expectedP3= expected.map(function(v) v + 3)
        _test('C("B1:E9")', function() C('B1', 'E9').getValues(), expected)
        _test('C("B1:E9").sum()', function() C('B1', 'E9').sum().getValue(), sum)
        _test('C("B1:E9").add(3)', function() C('B1', 'E9').add(3).getValues(), expectedP3)
        _test('C("B1:E9").add(1).add(2)', function() C('B1', 'E9').add(1).add(2).getValues(), expectedP3)
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

        _test('C("B1:F10")', function() C('B1', 'F10').getValues(), expected2)
        _test('C("B1:F10").sum()', function() C('B1', 'F10').sum().getValue(), sum)
        _test('C("B1:F10").add(3)', function() C('B1', 'F10').add(3).getValues(), expected2P3)
        _test('C("B1:F10").add(1).add(2)', function() C('B1', 'F10').add(1).add(2).getValues(), expected2P3)
        _test('C("B1:F10").add(3).sum()', function() C('B1', 'F10').add(3).sum().getValue(), sum + 3 * expected2.length)

        _test('C("B1:E1").add(100).ofs(0,1)', function() C('B1', 'E1').add(100).ofs(0,1).getValues(), [4, 5, 6, 7])
        _test('C("B1:E1").add(100).ofs(0,1).add(200)', function() C('B1', 'E1').add(100).ofs(0,1).add(200).getValues(), [204, 205, 206, 207])
        _test(
            'C("B1:E1").add(100).ofs(0,1).add(200).ofs(0,-1)',
            function() C('B1', 'E1').add(100).ofs(0,1).add(200).ofs(0,-1).getValues(),
            [100, 101, 102, 103]
        )

        _test('C("B1:E9").prod()', function() C('B1', 'E9').prod().getValue(), 0)
        _test('C("B2:E9")', function() C('B2', 'E9').getValues(), expected.filter(function(v) v > 3))
        _test('C("B2:E9").addRange("C1:E9")', function() C('B2', 'E9').addRange('C1', 'E9').getValues().sort(_cmpNum), expected.filter(function(v) v))
        var prod= 1
        expected.filter(function(v) v).map(function(v) prod*= v)
        _test('C("B2:E9").prod()', function() C('B2', 'E9').prod().getValue(), prod / 6)
        _test('C("B2:E9").addRange("C1:E9").prod()', function() C('B2', 'E9').addRange('C1', 'E9').prod().getValue(), prod)
        _test('C("B2:F10").prod()', function() C('B2', 'F10').prod().getValue(), prod / 6)
        _test('C("B2:F10").addRange("C1:F10").prod()', function() C('B2', 'F10').addRange('C1', 'F10').prod().getValue(), prod)

        _test('C("B1").add(1).addRange("B1:E9").prod()', function() C('B1').add(1).addRange('B1', 'E9').prod().getValue(), prod)
        _test('C("B1:E9").grep(0)', function() C('B1', 'E9').grep(0).getValues(), [0])

        // TODO: should this work without ...getValue()?
        C('B1').setCell(0)
        _test('C("B1").grep(C("B1").set(8))', function() C('B1').grep(C('B1').set(8)).getValues(), [])
        C('B1').setCell(0)
        _test('C("B1").grep(C("B1").setCell(8))', function() C('B1').grep(C('B1').setCell(8)).getValues(), [8])

        C('B1').setCell(0)
        _test('C("B1:E9").grep(0).set(1).grep(1).set(8)', function() C('B1', 'E9').grep(0).set(1).grep(1).set(8).getValues(), [8])
        C('B1').setCell(0)
        _test('C("B1:E9").grep(0).set(1).addRange("B1:E9").prod()', function() C('B1', 'E9').grep(0).set(1).addRange('B1', 'E9').prod().getValue(), prod)
        _test('C("B1")', function() C('B1').getValue(), 0)
    }

    var test_sverweis= function() {
        _test_init(function(c, r) c + r)

        var SVERWEIS= function ( searchRanges, value, col_i ) searchRanges.crop(0, 0, 0, Number.MAX_VALUE).grep(value).ofs(col_i, 0)
        _test('SVERWEIS("B1:E9", "B6", 2)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D6'])
        C('B3').setCell('B6')
        _test('SVERWEIS("B1:E9", "B6", 2) (2 results)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D3', 'D6'])
        _test('SVERWEIS("B1:E9", "D3", 2)', function() SVERWEIS(C('B1', 'E9'), 'D3', 2).getValues(), [])
        _test(
            'SVERWEIS("B1:E9", "B1 || B6", 2) (value is function)',
            function() SVERWEIS(C('B1', 'E9'), function(v) v === 'B1' || v === 'B6', 2).getValues(),
            ['D1', 'D3', 'D6']
        )
    }

    if (_showTimer) console.profile('all tests')

    test_SetGet()
    test_ranges()
    test_cellops()
    test_sverweis()

    if (_showTimer) console.profileEnd('all tests')


    document.write(
        '<table>'
        + '<tr><td>Tests run:</td><td>' + _statistic.tests + '</td></tr>'
        + '<tr><td>Success:</td><td>' + _statistic.success + ' (' + (Math.floor(_statistic.success / _statistic.tests * 1000)/10) + '%)</td></tr>'
        + '<tr><td>Failed:</td><td>' + _statistic.failed + ' (' + (Math.floor(_statistic.failed / _statistic.tests * 1000)/10) + '%)</td></tr>'
        + '</table>'
    )

})()