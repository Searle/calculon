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

    var _range= function (begin, end) {
        for (let i = begin; i < end; ++i) {
            yield i
        }
    }

    var _compareArray= function(a, b) {
        if (a.length !== b.length) return false
        for (var i in a) {
            if (a[i] !== b[i]) return false
        }
        return true
    }

    // we should usually compare sorted arrays, because range's getValue()'s order is not determined
    var _compareSortedArray= function(a, b) _compareArray(a.slice().sort(), b.slice().sort())

//    var _cmpNum= function(a, b) a < b ? -1 : a === b ? 0 : 1

    var _test= function(title, fn, expected, compare) {
        if ( typeof compare === 'undefined' ) {
            if (Object.prototype.toString.call(expected) === '[object Array]') {
                compare= _compareSortedArray
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

/*
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
*/

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

        // test cache invalidation on cell change and string operations
        C('A1').setCell(1)
        C('A2', 'A5').setCell(function() this.ofs(0,-1).add(1))
        _test('C(A2) (first cell is a number)', function() C('A2').getValue(), 2)
        _test('C(A5) (first cell is a number)', function() C('A5').getValue(), 5)
        C('A1').setCell('1')
        _test('C(A2) (first cell is a string)', function() C('A2').getValue(), '11')
        _test('C(A5) (first cell is a string)', function() C('A5').getValue(), '11111')
    }

    var test_ranges= function() {
        for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(c + r)
        var expected= [ c + r for (c in ['B','C','D','E']) for (r in _range(1,10))]
        // get range values
        _test(
            'C(B1:D3)',
            function() C('B1', 'D3').getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        )
        // add an already included cell
        _test(
            'C(B1:D3).addRange(C(B1))',
            function() C('B1', 'D3').addRange(C('B1')).getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        )
        // add a not included cell
        _test(
            'C(B1:D3).addRange(C(D5))',
            function() C('B1', 'D3').addRange(C('D5')).getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'D5']
        )
        // add the same range again
        _test(
            'C(B1:D3).addRange(C(B1:D3))',
            function() C('B1', 'D3').addRange(C('B1', 'D3')).getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        )
        // add an overlapping range
        _test(
            'C(B1:D3).addRange(C(C2:E4))',
            function() C('B1', 'D3').addRange(C('C2', 'E4')).getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4', 'E2', 'E3', 'E4']
        )
        // add an overlapping range and mask new cells
        _test(
            'C(B1:D3).addRange(C(B2:E4)).range(C(B1:D3))',
            function() C('B1', 'D3').addRange(C('C2', 'E4')).range(C('B1', 'D3')).getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        )
        // add an overlapping range - setting the added range should have no effect
        _test(
            'C(B1:D3).addRange(C(C2:E4).set(0)) (set() should have no effect)',
            function() C('B1', 'D3').addRange(C('C2', 'E4').set(0)).getValues(),
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4', 'E2', 'E3', 'E4']
        )
        // add an overlapping range - setting cells in added range should change resulting values
        _test(
            'C(B1:D3).addRange(C(C2:E4).setCell(0)) (setCell() should have effect)',
            function() C('B1', 'D3').addRange(C('C2', 'E4').setCell(0)).getValues(),
            ['B1', 'B2', 'B3', 'C1', 0, 0, 0, 'D1', 0, 0, 0, 0, 0, 0]
        )
        // reinit changed cells
        for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(c + r)

        _test('C(B1:E9).grep(C5)', function() C('B1', 'E9').grep('C5').getValues(), ['C5'])
        _test('C(B1:E9).grep(C5).ofs(1,1)', function() C('B1', 'E9').grep('C5').ofs(1,1).getValues(), ['D6'])
        _test('C(B1:D3).ofs(1,1)', function() C('B1', 'D3').ofs(1,1).getValues(), ['C2', 'D2', 'E2', 'C3', 'D3', 'E3', 'C4', 'D4', 'E4'])
        _test('C(B1:E9).ofs(20,20)', function() C('B1', 'E9').ofs(20,20).getValues(), [undefined for (i in _range(0,36))])

        _test(
            'C(A2).addRel(C(B1:E9).relTo(C(A1)))',
            function() C('A2').addRel(C('B1', 'E9').relTo(C('A1'))).getValues(),
            C('B2', 'E10').getValues()
        )
    }

    var test_cellops= function() {
        var i= 0
        for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(i++)
        var expected= [ i for each ( i in _range(0, 36) ) ]
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
        _test('C("B2:E9").addRange("C1:E9")', function() C('B2', 'E9').addRange('C1', 'E9').getValues(), expected.filter(function(v) v))
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
        for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(c + r)

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
        + '<a href="' + document.location.pathname + (_showTimer ? '' : '?profiler') + '">Profiler ' + (_showTimer ? 'aus' : 'an') + '</a>'
    )
})()