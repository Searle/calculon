(function() {

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
            if ( a[i] instanceof Error && b[i] instanceof Error ) {
                if (a.message !== b.message && b.message !== '') return false
            }
            else if (a[i] !== b[i]) return false
        }
        return true
    }

    // we should usually compare sorted arrays, because range's getValue()'s order is not determined
    var _compareSortedArray= function(a, b) _compareArray(a.slice().sort(), b.slice().sort())

//    var _cmpNum= function(a, b) a < b ? -1 : a === b ? 0 : 1

    var TestGroup= function(title, tests) {
        this.enable= true

        this.run= function(prefix) {
            var testcount= 0
            var failed= 0
            var success= 0

            // FIXME: shoud be "console.groupCollapsed()" but it's buggy
            console.group('Testing block "%s"', title)
            var num= 0
            for each (let test in tests) {
                if (test instanceof Test) {
                    testcount++
                    if (test.run(++num)) {
                        success++
                    }
                    else {
                        failed++
                    }
                    continue
                }
                if (test instanceof TestGroup) {
                    var result= test.run()
                    testcount+= result.tests
                    success+=   result.success
                    failed+=    result.failed
                    continue
                }
                if (Object.prototype.toString.call(test) === '[object Function]') {
                    test()
                    continue
                }
            }
            console.groupEnd()
            var statusFn= failed ? console.warn : console.info
            statusFn('Finished %i tests in block "%s": Success %i; Failed: %i', testcount, title, success, failed)
            return {
                tests: testcount,
                success: success,
                failed: failed,
            }
        }
    }

    var Test= function(title, fn, expected, compare) {
        if ( typeof compare === 'undefined' ) {
            if (Object.prototype.toString.call(expected) === '[object Array]') {
                compare= _compareSortedArray
            }
            else {
                compare= function(result) {
                    if ( result instanceof Error && expected instanceof Error ) {
                        return result.message === expected.message || expected.message === ''
                    }
                    return result === expected
                }
            }
        }

        if ( typeof fn === 'string' ) {
            title= fn + (title === '' ? '' : ' (' + title + ')')
            eval('fn=function() ' + fn);
        }

        this.run= function(prefix) {
            // do not show error messages
            var fnError= console.Error
            console.Error= function() {}

            _timerStart('test time "' + title +'"')
            var result= fn();
            _timerEnd('test time "' + title +'"')

            // restore error handling
            console.Error= fnError

            if (compare(result, expected)) {
                console.log('%s Success: ' + title, prefix);
                return true
            }
            console.log('%s Failed: ' + title, prefix);
            console.log('Got: ', result, 'Expected: ', expected)
            return false
        }
    }

    var recError= new Error('Recursion in cell resolution')

    var test_SetGet= new TestGroup('set/get', [
        new TestGroup('various set/get with constants', [
            new Test('undefined cell',  "C('A1').getValue()",  undefined),
            new Test('one',  "C('A1').set(1).getValue()",  1),
            new Test('not modified by previous test',  "C('A1').getValue()",  undefined),
            new Test('',  "{ C('A1').setCell(1); return C('A1').getValue(); }",  1),
            new Test('',  "{ C('A1').setCell(2); return C('A1').getValue(); }",  2),
        ]),

        new TestGroup('various set/get with atoms, recursion tests', [
            new Test('',  "C('A2').set(C('A1')).getValue()",  2),
            new Test('not modified by previous test',  "C('A2').getValue()",  undefined),
            new Test('',  "{ C('A2').setCell(C('A1')); return C('A2').getValue(); }",  2),
            new Test('modified by previous test',  "C('A2').getValue()",  2),
            new Test('',  "{ C('A1').setCell(5); return C('A2').getValue(); }",  5),
            new Test('no recursion',  "C('A2').set(C('A2')).getValue()",  5),
            new Test('recursion',  "{ var a= C('A2'); return a.set(a).getValue(); }", 5), // "5" for separate set-atom; recError else
            new Test('no recursion',  "C('A1').set(C('A2')).getValue()", 5),
            new Test('recursion',  "{ C('A2').setCell(C('A2')); return C('A2').getValue(); }", recError),
            new Test('recursion',  "{ var a= C('A2'); a.setCell(a); return a.getValue(); }", recError), // "5" for separate set-atom; recError else
            new Test('recursion',  "{ var a= C('A2'); a.setCell(a.set(7)); return a.getValue(); }", 7), // "7" for separate set-atom; recError else
            new Test('',  "{ var a= C('A2').set(5); var b=a.add(7); return [ a.getValue(), b.getValue() ]; }", [ 5, 12 ], _compareArray), // [5,12] for separate set-atom; [12,12] else
            // restore cell values
            function() { C('A1').setCell(5); C('A2').setCell(C('A1')) },
            new Test('recursion',  "{ C('A1').setCell(C('A2')); return C('A2').getValue(); }", recError),
            function() C('A1').setCell(10),
            new Test('no recursion', "C('A1').set(C('A1').set(1)).getValue()", 1),
            new Test('not modified by previous test', "C('A1').getValue()", 10),
        ]),

        new TestGroup('various set/get over ranges', [
            function() { C('A1').setCell(1); C('A2').setCell(1) },
            new Test('', "C('A1', 'A5').getValues()", [ 1, 1, undefined, undefined, undefined ]),
            new Test('', "C('A1', 'A5').set(1).getValues()", [ 1, 1, 1, 1, 1 ]),
            new Test('not modified by previous test', "C('A1', 'A5').getValues()", [ 1, 1, undefined, undefined, undefined ]),
            new Test('', "{ C('A1', 'A5').setCell(1); return C('A1', 'A5').getValues(); }", [ 1, 1, 1, 1, 1 ]),
            new Test('modified by previous test', "C('A1', 'A5').getValues()", [ 1, 1, 1, 1, 1 ]),
        ]),

        new TestGroup('various set/get over ranges with atom references', [
            new Test(
                '',
                "C('A2', 'A5').set(function() this.ofs(0,-1).add(1)).getValues()",
                [ 2, 3, 4, 5 ]
            ),
            new Test('not modified by previous test', "C('A1', 'A5').getValues()", [ 1, 1, 1, 1, 1 ]),
            new Test(
                '',
                "{ C('A2', 'A5').setCell(function() this.ofs(0,-1).add(1)); return C('A2', 'A5').getValues(); }",
                [ 2, 3, 4, 5 ]
            ),
            new Test('modified by previous test', "C('A1', 'A5').getValues()", [ 1, 2, 3, 4, 5 ]),
            new Test(
                'recursion',
                "C('A1', 'A5').set(function() this).getValues()",
                [ recError, recError, recError, recError, recError ]
            ),
            new Test(
                'recursion',
                "C('A1', 'A5').set(function() this.ofs(0,0)).getValues()",
                [ recError, recError, recError, recError, recError ]
            ),
            new Test(
                'recursion',
                "C('A1', 'A5').set(function() this.ofs(1,1).ofs(-1,-1)).getValues()",
                [ recError, recError, recError, recError, recError ]
            ),
            new Test('not modified by previous tests', "C('A1', 'A5').getValues()", [ 1, 2, 3, 4, 5 ]),
        ]),

        new TestGroup('test some cascaded operations', [
            new Test(
                'no recursion',
                "{ C('A1').setCell(C('A1')); return C('A1').set(1).getValue(); }",
                1
            ),
            new Test(
                'recursion',
                "{ C('A1').setCell(C('A1')); return C('A1').add(1).getValue(); }",
                recError
            ),
            new Test(
                'no recursion',
                "{ C('A1').setCell(C('A1')); return C('A1').add(1).set(3).add(5).getValue(); }",
                8
            ),
        ]),

        new TestGroup('test cache invalidation on cell change and string operations', [
            function() C('A1').setCell(1),
            function() C('A2', 'A5').setCell(function() this.ofs(0,-1).add(1)),
            new Test('first cell is a number', "C('A2').getValue()", 2),
            new Test('first cell is a number', "C('A5').getValue()", 5),
            function() C('A1').setCell('1'),
            new Test('first cell is a string', "C('A2').getValue()", '11'),
            new Test('first cell is a string', "C('A5').getValue()", '11111'),
        ]),
    ])

    var test_ranges= new TestGroup('ranges tests', [
        function() { for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(c + r) },
        // get range values
        new Test(
            '',
            "C('B1', 'D3').getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        ),
        // add an already included cell
        new Test(
            '',
            "C('B1', 'D3').addRange(C('B1')).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        ),
        // add a not included cell
        new Test(
            '',
            "C('B1', 'D3').addRange(C('D5')).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'D5']
        ),
        // add the same range again
        new Test(
            '',
            "C('B1', 'D3').addRange(C('B1', 'D3')).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        ),
        // add an overlapping range
        new Test(
            '',
            "C('B1', 'D3').addRange(C('C2', 'E4')).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4', 'E2', 'E3', 'E4']
        ),
        // add an overlapping range and mask new cells
        new Test(
            '',
            "C('B1', 'D3').addRange(C('C2', 'E4')).range(C('B1', 'D3')).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3']
        ),
        // add an overlapping range - setting the added range should have no effect
        new Test(
            '(set() should have no effect)',
            "C('B1', 'D3').addRange(C('C2', 'E4').set(0)).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4', 'E2', 'E3', 'E4']
        ),
        // add an overlapping range - setting cells in added range should change resulting values
        new Test(
            '(setCell() should have an effect)',
            "{ C('C2', 'E4').setCell(0); return C('B1', 'D3').addRange(C('C2', 'E4')).getValues(); }",
            [ 'B1', 'B2', 'B3', 'C1', 0, 0, 0, 'D1', 0, 0, 0, 0, 0, 0 ]
        ),
        // reinit changed cells
        function() { for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(c + r) },

        // grep a single cell out of a range
        new Test('', "C('B1', 'E9').grep('C5').getValues()", ['C5']),
        // ...add a cell offset
        new Test('', "C('B1', 'E9').grep('C5').ofs(1,1).getValues()", ['D6']),
        new Test('', "C('B1', 'D3').ofs(1,1).getValues()", ['C2', 'D2', 'E2', 'C3', 'D3', 'E3', 'C4', 'D4', 'E4']),
        new Test('', "C('B1', 'E9').ofs(20,20).getValues()", [ undefined for (i in _range(0,36)) ]),

        new Test(
            '',
            "C('A2').addRel(C('B1', 'E9').relTo(C('A1'))).getValues()",
            [ c + r for each (c in ['B','C','D','E']) for (r in _range(2,10))].concat([ undefined for (i in _range(0, 4)) ])
        ),
    ])


    var test_cellops= (function() {
        var expected= [ i for each ( i in _range(0, 36) ) ]
        var sum= 0
        expected.forEach(function(v) sum+= v)
        var expectedP3= expected.map(function(v) v + 3)

        var expected2= []
        var i= 0
        for (var row= 1; row < 11; row++) {
            for each (var col in ['B', 'C', 'D', 'E']) {
                expected2.push(expected[i++])
            }
            expected2.push(undefined)
        }
        var expected2P3= expected2.map(function(v) (v || 0) + 3)

        var prod= 1
        expected.filter(function(v) v).map(function(v) prod*= v)

        return new TestGroup('various cell operations', [
            function() {
                var i= 0
                for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(i++)
            },
            new Test('', "C('B1', 'E9').getValues()", expected),
            new Test('', "C('B1', 'E9').sum().getValue()", sum),
            new Test('', "C('B1', 'E9').add(3).getValues()", expectedP3),
            new Test('', "C('B1', 'E9').add(1).add(2).getValues()", expectedP3),
            new Test('', "C('B1', 'E9').add(3).sum().getValue()", sum + 3 * expected.length),

            new Test('', "C('B1', 'F10').getValues()", expected2),
            new Test('', "C('B1', 'F10').sum().getValue()", sum),
            new Test('', "C('B1', 'F10').add(3).getValues()", expected2P3),
            new Test('', "C('B1', 'F10').add(1).add(2).getValues()", expected2P3),
            new Test('', "C('B1', 'F10').add(3).sum().getValue()", sum + 3 * expected2.length),

            new Test('', "C('B1', 'E1').add(100).ofs(0,1).getValues()", [4, 5, 6, 7]),
            new Test('', "C('B1', 'E1').add(100).ofs(0,1).add(200).getValues()", [204, 205, 206, 207]),
            new Test(
                '',
                "C('B1', 'E1').add(100).ofs(0,1).add(200).ofs(0,-1).getValues()",
                [100, 101, 102, 103]
            ),

            new Test('', "C('B1', 'E9').prod().getValue()", 0),
            new Test('', "C('B2', 'E9').getValues()", expected.filter(function(v) v > 3)),
            new Test('', "C('B2', 'E9').addRange('C1', 'E9').getValues()", expected.filter(function(v) v)),
            new Test('', "C('B2', 'E9').prod().getValue()", prod / 6),
            new Test('', "C('B2', 'E9').addRange('C1', 'E9').prod().getValue()", prod),
            new Test('', "C('B2', 'F10').prod().getValue()", prod / 6),
            new Test('', "C('B2', 'F10').addRange('C1', 'F10').prod().getValue()", prod),

            new Test('', "C('B1').add(1).addRange('B1', 'E9').prod().getValue()", prod),
            new Test('', "C('B1', 'E9').grep(0).getValues()", [0]),

            // TODO: should this work without ...getValue()?
            function() C('B1').setCell(0),
            new Test('', "C('B1').grep(C('B1').set(8)).getValues()", []),

            function() C('B1').setCell(0),
            new Test('', "C('B1', 'E9').grep(0).set(1).grep(1).set(8).getValues()", [8]),
            function() C('B1').setCell(0),
            new Test('', "C('B1', 'E9').grep(0).set(1).addRange('B1', 'E9').prod().getValue()", prod),
            new Test('', "C('B1').getValue()", 0),
        ])
    })()

    var test_formel= (function() {

        return new TestGroup('formeln', [
            function() {
                C('A1').setCell(1)
                C('A2', 'A5').setCell(function() this.ofs(0,-1).add(1))
                C('B1', 'B5').setCell(function() this.ofs(-1,0).add(20))
            },

            new Test(
                '',
                "{ C('C1').setCell(C('A1').mult(3).add(C('A2').mult(C('A3')))); return C('C1').getValue(); }",
                9
            ),
            new Test(
                'SUMMEWENN(A1:A5, gerade, B1:B5)',
                function() C('A1', 'A5').grep(function(v) !(v%2)).ofs(1,0).sum().getValue(),
                46
            ),
        ])
    })()

    var test_sverweis= (function() {
        var SVERWEIS= function ( searchRanges, value, col_i ) searchRanges.crop([ 0, 0, 0, Number.MAX_VALUE ]).grep(value).ofs(col_i, 0)

        return new TestGroup('sverweis test', [
            function() {
                for each (let r in _range(1, 10)) for each (let c in ['B','C','D','E']) C(c + r).setCell(c + r)
            },

            new Test(
                '',
                "C('B1', 'E9').getValues()",
                (function() { let res= []; for each (let r in _range(1, 10)) res= res.concat([ c+r for each (c in ['B','C','D','E'])]); return res; })()
            ),
            new Test('SVERWEIS("B1:E9", "B6", 2)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D6']),
            function() C('B3').setCell('B6'),
            new Test('SVERWEIS("B1:E9", "B6", 2) (2 results)', function() SVERWEIS(C('B1', 'E9'), 'B6', 2).getValues(), ['D3', 'D6']),
            new Test('SVERWEIS("B1:E9", "D3", 2)', function() SVERWEIS(C('B1', 'E9'), 'D3', 2).getValues(), []),
            new Test(
                'SVERWEIS("B1:E9", "B1 || B6", 2) (value is function)',
                function() SVERWEIS(C('B1', 'E9'), function(v) v === 'B1' || v === 'B6', 2).getValues(),
                ['D1', 'D3', 'D6']
            ),
            new Test(
                'SVERWEIS("B1:E9", "B1 || B6", 2) (value is function, cell access via "this")',
                function() SVERWEIS(C('B1', 'E9'), function() this.getValue() === 'B1' || this.getValue() === 'B6', 2).getValues(),
                ['D1', 'D3', 'D6']
            ),
        ])
    })()

    var test_lookup= (function() {

        return new TestGroup('lookup', [
            function() {
                C('A1').setCell('Name')
                  C('B1').setCell('Vorname')
                    C('C1').setCell('Alter')
                      C('D1').setCell('Gewicht')
                C('A2').setCell('zuppi')
                  C('B2').setCell('zappi')
                    C('C2').setCell(78)
                      C('D2').setCell(85)
                C('A3').setCell('huhu')
                  C('B3').setCell('steppi')
                    C('C3').setCell(7)
                      C('D3').setCell(97)
            },

            new Test(
                'Lookup weight of "huhu"',
                function() {
                    var title= C('A1', 'G1')
                    var name= title.grep('Name')
                    var weight= title.grep('Gewicht')
                    var rel_name_weight= weight.relTo(name)
                    return name.expandRanges([0,0,0,10]).ofs(0,1).grep('huhu').addRel(rel_name_weight).getValue()
                },
                97
            ),
        ])
    })()

    if (_showTimer) console.profile('all tests')

    var statistic= new TestGroup('Tests', [
        test_SetGet,
        test_ranges,
        test_cellops,
        test_formel,
        test_sverweis,
        test_lookup,
    ]).run()

    if (_showTimer) console.profileEnd('all tests')


    document.write(
        '<table>'
        + '<tr><td>Tests run:</td><td>' + statistic.tests + '</td></tr>'
        + '<tr><td>Success:</td><td>' + statistic.success + ' (' + (Math.floor(statistic.success / statistic.tests * 1000)/10) + '%)</td></tr>'
        + '<tr><td>Failed:</td><td>' + statistic.failed + ' (' + (Math.floor(statistic.failed / statistic.tests * 1000)/10) + '%)</td></tr>'
        + '</table>'
        + '<a href="' + document.location.pathname + (_showTimer ? '' : '?profiler') + '">Profiler ' + (_showTimer ? 'off' : 'on') + '</a>'
    )
})()