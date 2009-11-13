jQuery(function($) {

    $('.testgroup-title').live('click', function() {
        var $ol= $($(this).parent().find('ol')[0])
        $ol.toggleClass('hidden')
    })

    var _params= {}
    document.location.search.substr(1).split('&').forEach(function(option) {
        var p= option.split('=', 2)
        _params[p[0]]= p[1] === undefined ? true : p[1]
    })

    var _showTimer= _params.profiler

    var _range= function (begin, end) {
        for (let i = begin; i < end; ++i) {
            yield i
        }
    }

    var _isFunction= function(obj) Object.prototype.toString.call(obj) === '[object Function]'
    var _isArray=    function(obj) Object.prototype.toString.call(obj) === '[object Array]'

    var _compareArray= function(a, b) {
        if ( !_isArray(a) || !_isArray(b) ) return false
        if ( a.length !== b.length ) return false
        for (var i in a) {
            if ( a[i] instanceof Error && b[i] instanceof Error ) {
                if (a.message !== b.message && b.message !== '') return false
            }
            else if (a[i] !== b[i]) return false
        }
        return true
    }

    // we should usually compare sorted arrays, because range's getValue()'s order is not determined
    var _compareSortedArray= function(a, b) {
        if ( !_isArray(a) || !_isArray(b) ) return false
        return _compareArray(a.slice().sort(), b.slice().sort())
    }

//    var _cmpNum= function(a, b) a < b ? -1 : a === b ? 0 : 1

// ============================================================================
//      Html Builder Class
// ============================================================================

    var Html= function(pre, post) {
        var items= [];

        this.addItem= function(item) {
            items.push(item);
            return item;
        };

        this.add= function(pre, post) this.addItem(new Html(pre, post));

        this.addItems= function(add_items) {
            items.concat(add_items);
        };

        var rownum= 0;
        var rowclasses= [ 'row1', 'row2' ];

        this.addTable= function(classes) {
            rownum= 0;
            var class= '';
            if (classes) {
                class= ' class="' + classes.join(' ') + '"';
            }
            return this.add('<table' + class + '>', '</table>');
        };

        this.addRow= function(row, class_data) {
            if (!class_data) class_data= [];
            var row_class= [ rowclasses[ rownum++ % rowclasses.length ] ];
            if (class_data.tr) row_class.push(class_data.tr);
            var tr= this.add('<tr class="' + row_class.join(' ') + '">', '</tr>');
            var td_classes= class_data.td || [];
            row.forEach(function(r, i) tr.add('<td class="' + (td_classes[i] || '') + '">', '</td>').add(r));
            return row;
        };

        this._render= function() {
            var result= [ item._render() for each (item in items) ]
            if (pre)  result.unshift(pre);
            if (post) result.push(post);
            return result.join('');
        };

        this.render= function($el) {
            var html= this._render();
            if ($el) $el.html(html);
            return html;
        };

        return this;
    };


    var TestGroup= function(title, tests) {
        this.enabled= true

        this.run= function() {
            if ( !this.enabled ) return
            for each (let test in tests) {
                if (test instanceof Test) {
                    test.run()
                    continue
                }
                if (test instanceof TestGroup) {
                    test.run()
                    continue
                }
                if ( _isFunction(test) ) {
                    test()
                    continue
                }
            }
            return this
        }

        this.html= function() {
            if ( !this.enabled ) {
                return new Html('<div class="testgroup disabled">', '</div>').add('"' + title + '" is disabled')
            }

            var htmlTests= new Html('<ol class="hidden">', '</ol>')
            for each (let test in tests) {
                if ( test instanceof TestGroup ) {
                    htmlTests.add('<li>', '</li>').addItem(test.html())
                }
                if ( test instanceof Test ) {
                    htmlTests.addItem(test.html())
                }
            }

            var html= new Html('<div class="testgroup">', '</div>')
            var classes= [ 'testgroup-title' ]
            var stats= this.stats()
            if ( stats.success > 0 && stats.failed === 0 ) {
                classes.push('success')
            }
            else if ( stats.failed > 0 ) {
                classes.push('failed')
            }
            html.add('<div class="' + classes.join(' ') + '">', '</div>').add(title)
            html.addItem(htmlTests)
            classes.shift()
            classes.unshift('testgroup-result')
            var text= [ stats.run + ' of ' + stats.count + ' tests run in <span class="time">' + stats.time + 'ms</span>.' ]
            if ( stats.success > 0 ) {
                if ( stats.failed === 0 ) {
                    text.push('All succeeded.')
                }
                else {
                    text.push(stats.success + ' tests passed (' + (Math.floor(stats.success / stats.run * 1000) / 10) + '%)')
                    text.push(stats.failed + ' tests failed (' + (Math.floor(stats.failed / stats.run * 1000) / 10) + '%)')
                }
            }
            else {
                if ( stats.run > 0 ) text.push('All failed')
            }
            html.add('<div class="' + classes.join(' ') + '">', '</div>').add(text.join(' '))
            return html
        }

        this.stats= function() {
            var stats= {
                count: 0,
                run: 0,
                time: 0,
                success: 0,
                failed: 0,
            }
            for each (let test in tests) {
                if ( test instanceof TestGroup ) {
                    var _stats= test.stats()
                    for (let stat in stats) stats[stat]+= _stats[stat]
                    continue
                }
                if ( !(test instanceof Test) ) continue
                stats.count++
                if ( test.wasRun() ) {
                    stats.time+= test.time()
                    stats.run++
                    if ( test.success() ) {
                        stats.success++
                    }
                    else {
                        stats.failed++
                    }
                }
            }
            return stats
        }
    }

    var Test= function(title, fn, expected, compare) {
        this.enabled= true

        if ( typeof compare === 'undefined' ) {
            if ( _isArray(expected) ) {
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

        var result= {
            run: false,
            value: undefined,
            success: undefined,
            error: undefined,
        }

        this.run= function(prefix) {
            if ( !this.enabled ) return

            result.run= true
            try {
                var start= new Date().getTime()
                result.value= fn();
                result.time= new Date().getTime() - start

                result.success= !!compare(result.value, expected)
            }
            catch(e) {
                result.success= false
                result.error= e
            }
        }

        this.success= function() !!result.success
        this.wasRun= function() !!result.run
        this.time= function() result.time || 0

        var _toString= function(value) {
            if ( value === undefined ) return 'undefined'
            if ( typeof value === 'string' ) return '"' + value + '"'
            if ( typeof value === 'object' ) return value.toSource()
            return value.toString()
        }

        this.html= function() {

            var classes= [ 'test' ]
            var htmlResult= new Html('<span class="result">', '</span>')
            if ( !result.run ) {
                classes.push('skipped')
                htmlResult.add('skipped')
            }
            else if ( result.success ) {
                classes.push('success')
                htmlResult.add('passed')
            }
            else {
                classes.push('failed')
                htmlResult.add('failed')
            }
            var html= new Html('<li class="' + classes.join(' ') + '">', '</li>')
            var htmlTitle= html.add('<div class="test">', '</div>')
            htmlTitle.addItem(htmlResult)
            htmlTitle.add('<span class="test-title">', '</span>').add(title)
            if ( result.run ) {
                if ( result.time !== undefined ) htmlTitle.add('<span class="time">', '</span>').add(result.time + 'ms')
                if ( !result.success ) {
                    var htmlResult= html.addTable()
                    htmlResult.addRow([ 'Got:', _toString(result.value) ], {td: ['result-text', 'got']})
                    htmlResult.addRow([ 'Expected:', _toString(expected) ], {td: ['result-text', 'expected']})
                    if (result.error) htmlResult.addRow([ 'Error:', _toString(result.error) ], {td: ['result-text', 'error']})
                }
            }
            return html
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
            'set() should have no effect',
            "C('B1', 'D3').addRange(C('C2', 'E4').set(0)).getValues()",
            ['B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4', 'E2', 'E3', 'E4']
        ),
        // add an overlapping range - setting cells in added range should change resulting values
        new Test(
            'setCell() should have an effect',
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

    var allTests= new TestGroup('Tests', [
        test_SetGet,
        test_ranges,
        test_cellops,
        test_formel,
        test_sverweis,
        test_lookup,
    ])

    if (_showTimer) console.profile('all tests')
    allTests.run()
    if (_showTimer) console.profileEnd('all tests')

    allTests.html().render($('div.body'))
})