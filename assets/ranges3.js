
(function () {

// TODO: Auf 3D (sheets) ausbauen

// =============================================================================
//      Utils
// =============================================================================

        var undefined

        var _isFunction= function( obj ) {
            return Object.prototype.toString.call(obj) === "[object Function]"
        }

        var _isArray= function( obj ) {
            return Object.prototype.toString.call(obj) === "[object Array]"
        }


// =============================================================================
//      Cell
// =============================================================================

        var cells= {}

//        var cellId= 0

        var Cell= function(x, y) {

//            this._cellId= ++cellId;

            this._x= x
            this._y= y

            this._value= undefined
            this._atomRefs= {}
        }

        Cell.prototype.getValue= function( atomId ) {
            this._atomRefs[atomId]= true

console.log("Cell.getValue", atomId, this._x, this._y, this._value);

            return this._value;
        }

        Cell.prototype.setValue= function( value ) {
            this._value= value;
        }

        Cell.prototype._dumpRefs= function ( comment ) {
            for ( var atomId in this._atomRefs ) {
                console.log('dumpRef', comment + ':', atoms[atomId])
                atoms[atomId].dump('dumpRef ' + comment)
            }
        }

        Cell.prototype.getKey= function() {
            return this._x + ':' + this._y
        }

        Cell.prototype.dirty= function() {
            for ( var atomId in this._atomRefs ) {
                atoms[atomId].dirty();
            }
        }

        var emptyCell= new Cell()

        // FIXME: atomId unused
        var _getCell= function(atomId, x, y) {
            var key= x + ':' + y
            var cell= cells[key]
            if ( cell === undefined ) {
                cell= cells[key]= new Cell(x, y)
            }
            return cell
        }

        // FIXME: Optimieren: Soll nur checken ob ein Cell existiert und nicht
        // eins erzeugen.
        // FIXME: atomId unused
        var __getCell= function(atomId, x, y) {
            return _getCell(atomId, x, y)
        }

        // FIXME: Naive Implementierung, kann kein AA1 etc
        var stringToCell= function( str ) {
            var x= "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1))
            if ( x < 0 ) throw "NoValidCellName"
            var y= parseInt(str.substr(1), 10)
            if ( isNaN(y) || y <= 0 ) throw "NoValidCellName: [" + str + "]"
            return [ x, y - 1 ]
        }


// =============================================================================
//      Atom
// =============================================================================

        var _atomId= 0

        var atoms= {}

        var _Atom= function( parent ) {

            this._atomId= ++_atomId

            // Garbage collection horror
            atoms[this._atomId]= this

            console.log('New atom:', this._atomId, this.name, parent ? '(parent:' + parent._atomId + ' ' + parent.name + ')' : '')

            // Diese Methoden koennen nicht in den prototype, da es Closures sind
            this.recalcDeps= function() parent ? parent.recalcDeps() : []
            this._valueDeps= function() parent ? parent._valueDeps() : []

            this._cellRefs= {}

            this.__cellRefs= function() {
                var refs= parent ? parent.__cellRefs() : {}
                for ( var ref in this._cellRefs ) refs[ref]= true;
                return refs
            }

            this.cellRefs= function() {
                var refs= this.__cellRefs();
                var result= [];
                for ( var ref in refs ) result.push(cells[ref]);
                return result;
            }
        }

        _Atom.prototype.getRanges= function () []

        _Atom.prototype.valueDeps= function () _flatten(this._valueDeps())

        _Atom.prototype.name= ''
        _Atom.prototype._flattened= undefined

        _Atom.prototype.getFlattenedRanges= function () {
            if ( this._flattened === undefined ) {
                this._flattened= _flatten(this.getRanges())
            }
            return this._flattened
        }

        _Atom.prototype.dirty= function () {
            for each ( var range in this.getFlattenedRanges() ) {

console.log("DIRTY", range);

                var cell= this._getCell(range[0], range[1])
                for ( var atomId in cell._atomRefs ) {

console.log("DIRTY", range, atomId);

                    atoms[atomId]._flattened= undefined;
                }

            }

            // this._flattened= undefined
            return this;
        }

        _Atom.prototype._getCell= function (x, y) {
            return __getCell(this._atomId, x, y)
        }

//        _Atom.prototype.getCell= function () {
//            var ranges= this.getFlattenedRanges()
//            if ( ranges.length === 0 ) return emptyCell
//            return __getCell(this._atomId, ranges[0][0], ranges[0][1])
//        }

        _Atom.prototype.getValue= function() {
            var ranges= this.getFlattenedRanges()
            if ( ranges.length === 0 ) return '#NV'

            var cell= this._getCell(ranges[0][0], ranges[0][1])

            // if ( !cell ) return '#EMPTY'
            if ( !cell ) return; // undefined

            this._cellRefs[cell.getKey()]= true;
            return cell.getValue(this._atomId);
        }

        _Atom.prototype.setValue= function( newValue ) {
            for each ( var range in this.getFlattenedRanges() ) {
                var cell= this._getCell(range[0], range[1])
                cell.setValue(newValue)
            }
            return this;
        }

        _Atom.prototype._dumpCellRefs= function( comment ) {
            for each ( var range in this.getFlattenedRanges() ) {
                var cell= this._getCell(range[0], range[1])
                cell._dumpRefs(comment)
            }
            return this;
        }

        _Atom.prototype._getRangeValue= function(range) {

            var cell= this._getCell(range[0], range[1])
            if ( !cell ) return; // undefined

            this._cellRefs[cell.getKey()]= true;
            return cell.getValue(this._atomId);
        }

        _Atom.extend= function( name, protoFn, factoryFn ) {
            _Atom.prototype[name]= factoryFn
            protoFn.prototype.name= name
            protoFn.prototype.__proto__= _Atom.prototype
        }

// =============================================================================
//      Dump
// =============================================================================

        var _Dump= function( parent, comment ) {
            _Atom.call(this, parent)

            var _dump= function ( ranges, comment ) {
                var out= []
                for each ( var range in ranges ) {
                    out.push('[' + range[0] + ',' + range[1] + ',' + range[2] + ',' + range[3] + ']')
                }
                console.log((comment ? comment + ': [' : '[') + out.join(', ') + ']')
            }
// console.log(parent, ranges,arg)

            _dump(parent.getRanges(), comment )

            this.getRanges= function() parent.getRanges()
        }

        _Atom.extend('dump', _Dump, function( comment ) new _Dump(this, comment))


// =============================================================================
//      AddRange
// =============================================================================

        var __addRange= function( ranges, arg ) {

            // Understands:
            // - [ Something ]
            // - [ 'A1', 'B2' ]
            // - [ 2, 3 ]
            if ( _isArray(arg) ) {
                if ( arg.length === 1 ) return __addRange(ranges, arg[0])
                if ( arg.length === 2 ) {
                    if ( typeof arg[0] === 'string' && typeof arg[1] === 'string' ) {
                        var cellTL= stringToCell(arg[0])
                        var cellBR= stringToCell(arg[1])
                        ranges.push([ cellTL[0], cellTL[1], cellBR[0], cellBR[1] ])
                        return ranges
                    }
                    if ( typeof arg[0] === 'number' && typeof arg[1] === 'number' ) {
                        ranges.push([ arg[0], arg[1], arg[0], arg[1] ])
                        return ranges
                    }
                }
                if ( arg.length === 4 ) {
                    ranges.push(arg)
                    return ranges
                }
            }

            // Understands:
            // - 'A1'
            else if ( typeof arg === 'string' ) {
                var cellRange= stringToCell(arg)
                ranges.push([ cellRange[0], cellRange[1], cellRange[0], cellRange[1] ])
                return ranges
            }

            // Understands:
            // - new Atom().chainedFn() ...
            // NEEDS TESTING!
            else if ( arg instanceof _Atom ) {
                for each ( var range in arg.getRanges() ) __addRange(ranges, range)
                return ranges
            }

            console.log("_addRange error:", arg, Object.prototype.toString.call(arg))

            throw "RangeArgException:" + arg
        }

        var _AddRange= function( parent, arg ) {
            _Atom.call(this, parent)

// console.log(parent, ranges,arg)

            this.getRanges= function() {
                return __addRange(parent.getRanges(), arg)
            }
        }

        _Atom.extend('addRange', _AddRange, function() new _AddRange(this, Array.prototype.slice.call(arguments)))


// =============================================================================
//      AddRanges
// =============================================================================

        var _AddRanges= function( parent, newRanges ) {
            _Atom.call(this, parent)

            this.getRanges= function() {
                var _ranges= parent.getRanges()
                for each ( var arg in newRanges ) __addRange(ranges, arg)
                return ranges
            }
        }

        _Atom.extend('addRanges', _AddRanges, function(newRanges) new _AddRanges(this, newRanges))


// =============================================================================
//      UNUSED
// =============================================================================

/*
        var intersection= function () {
            if ( ranges.length <= 1 ) return this
            var newRange= null
            for each ( var range in ranges ) {
                if ( newRange === null ) {
                    newRange= range.concat()
                    continue
                }
                if ( range[0] > newRange[0] ) newRange[0]= range[0]
                if ( range[1] > newRange[1] ) newRange[1]= range[1]
                if ( range[2] < newRange[2] ) newRange[2]= range[2]
                if ( range[3] < newRange[3] ) newRange[3]= range[3]
            }
            if ( newRange[0] > newRange[2] || newRange[1] > newRange[3] ) return new Ranges([])
            return new Ranges([ newRange ])
        }

        var union= function () {
            if ( ranges.length <= 1 ) return this
            var newRange= null
            for each ( var range in ranges ) {
                if ( newRange === null ) {
                    newRange= range.concat()
                    continue
                }
                if ( range[0] < newRange[0] ) newRange[0]= range[0]
                if ( range[1] < newRange[1] ) newRange[1]= range[1]
                if ( range[2] > newRange[2] ) newRange[2]= range[2]
                if ( range[3] > newRange[3] ) newRange[3]= range[3]
            }
            return new Ranges([ newRange ])
        }
*/


// =============================================================================
//      Crop
// =============================================================================

        var _Crop= function( parent, x0, y0, x1, y1 ) {
            _Atom.call(this, parent)

            // TODO: pruefen auf x0/y0 < 0 ? Oder macht flatten das?

            if ( x1 === undefined ) x1= x0
            if ( y1 === undefined ) y1= y0

            this.getRanges= function() {
                var ranges= []
                for each ( let [ ox0, ox1, oy0, oy1 ] in parent.getRanges() ) {
                    var newRange= [ ox0, oy0, ox1, oy1 ]= [
                        ox0 + x0,
                        oy0 + y0,
                        (ox0 + x1 <= ox1 ? ox0 + x1 : ox1),
                        (oy0 + y1 <= oy1 ? oy0 + y1 : oy1)
                    ]
                    if ( ox0 > ox1 || oy0 > oy1 ) continue
                    ranges.push(newRange)
                }
                return ranges
            }
        }

        _Atom.extend('crop', _Crop, function(x0, y0, x1, y1) new _Crop(this, x0, y0, x1, y1))


// =============================================================================
//      Ofs
// =============================================================================

        var _Ofs= function( parent, x, y ) {
            _Atom.call(this, parent)

            this.getRanges= function() {
                var ranges= []
                for each (var range in parent.getRanges()) {
                    ranges.push([ range[0] + x, range[1] + y, range[2] + x, range[3] + y ])
                }
                return ranges
            }
        }

        _Atom.extend('ofs', _Ofs, function(x, y) new _Ofs(this, x,y ))

        // TODO: Naiver Code. Optimierte Variante schreiben!
        var _flatten= function ( ranges ) {

            if ( ranges.length === 0 ) return ranges

            // OPTIMIERUNG TESTEN: 
            // if ( ranges.length === 1 && ranges[0][0] === ranges[0][2] && ranges[0][1] === ranges[0][3] ) return this

            var lookup= {}

            // Irgendwie die Ranges merken:
            // - Key bauen fuer alle Ranges

            // Beispiel: SUMME(B:B), dann Aenderung (oder hinzufuegen von B7)

            var newRanges= []
            for each ( var range in ranges ) {
                for ( var y= range[1]; y <= range[3]; y++ ) {
                    for ( var x= range[0]; x <= range[2]; x++ ) {
                        if ( x < 0 || y < 0 ) continue
                        if ( lookup[x + ':' + y] ) continue
                        newRanges.push([x, y, x, y])
                        lookup[x + ':' + y]= 1
                    }
                }
            }
            return newRanges
        }

/*
            var yrs= {}
            for each ( var range in ranges ) {
                if ( yrs[range[0]] === undefined ) yrs[range[0]]= [ range[0], [], [] ]
                yrs[range[0]][1].push(range[2])
                if ( yrs[range[1]] === undefined ) yrs[range[1]]= [ range[1], [], [] ]
                yrs[range[1]][2].push(range[3])
            }

            var yrss= []
            for each ( var yr in yrs ) yrss.push(yr)
            yrss.sort(function (a, b) { return a[0] - b[0] })

            for each ( var yr in yrss ) {
                var y= yr[0]
                var leftx= yr[1]
                var rightx= yr[2]

                if ( leftx.length > 1 ) sort(leftx)
                if ( rightx.length > 1 ) sort(rightx)

                var l= 0, r= 0
                for (;;) {
                    var x= leftx[l]
                    while ( l < leftx.length  && leftx[l] < rightx[r] ) l++
                    while ( r < rightx.length && rightx[r] < leftx[l] ) r++
                    ...
                }
            }
        }
*/


// =============================================================================
//      Flatten
// =============================================================================

        var _Flatten= function ( parent ) {
            _Atom.call(this, parent)

            this.getRanges= function() {
                return _flatten(parent.getRanges())
            }
        }

        _Atom.extend('flatten', _Flatten, function() new _Flatten(this))


// =============================================================================
//      Grep
// =============================================================================

        var _Grep= function ( parent, value ) {
            _Atom.call(this, parent)

            this.getRanges= function() {
                var newRanges= []
                for each ( var range in parent.getFlattenedRanges() ) {
                    var cellValue= parent._getRangeValue(range)
                    if ( cellValue !== undefined && cellValue == value ) {
                        newRanges.push(range)
                    }
                }
                return newRanges
            }

            this._valueDeps= function() parent.getRanges()
        }

        _Atom.extend('grep', _Grep, function(value) new _Grep(this, value))


// =============================================================================
//      Interface (window context)
// =============================================================================

        Ranges= function() new _Atom

        // R= function () (new _Atom).addRange(Array.prototype.slice.call(arguments)).dump('addRange')
        // C= function (x, y) (new _Atom).addRange(x, y)

        C= function () (new _Atom).addRange(Array.prototype.slice.call(arguments))

        DumpCells= function () {
            console.log(cells)
        }

})()
