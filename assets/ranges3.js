
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

        if ( typeof Rd === 'undefined' ) Rd= function (value) value


        // -----------------------------------------------------------------------------
        //      Cell/Ranges String functions
        // -----------------------------------------------------------------------------

        // FIXME: Naive Implementierung, kann kein AA1 etc
        var stringToCell= function( str ) {
            var x= "@ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1))
            if ( x < 0 ) throw "NoValidCellName"
            var y= parseInt(str.substr(1), 10)
            if ( isNaN(y) || y <= 0 ) throw "NoValidCellName: [" + str + "]"
            return [ x, y ]
        }

        var rangesToString= function( ranges ) {

            var cellToString= function( x, y ) "@ABCDEFGHIJKLMNOPQRSTUVWXYZ".substr(x, 1) + y

            var result= [];
            for each ( range in ranges ) {
                var cstr1= cellToString(range[0], range[1])
                var cstr2= cellToString(range[2], range[3])
                result.push(cstr1 == cstr2 ? cstr1 : cstr1 + ':' + cstr2)
            }
            return '[' + result.join(';') + ']'
        }


        // -----------------------------------------------------------------------------
        //      _flatten
        // -----------------------------------------------------------------------------

        // TODO: Naiver Code. Optimierte Variante schreiben!
        var _flatten= function ( ranges ) {

            if ( ranges.length === 0 ) return ranges

console.log("_flatten:", rangesToString(ranges))

            // Catch common case: Range with one cell
            if ( ranges.length === 1 && ranges[0][0] === ranges[0][2] && ranges[0][1] === ranges[0][3] ) return ranges

console.log("_flatten using slow")

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
//      Variant
// =============================================================================

        var variants= {}
        var variantId= 0

        var Variant= function( atomId, value ) {

            this._variantId= ++variantId;
            this._atomRefs= {}

// Remove optimization for now. To sensitive. Use setValue()
//            if ( atomId !== undefined ) {
//                this._value= value
//                this._initialized= true
//                this._atomRefs[atomId]= true
//                atoms[atomId].dirty();
//                return
//            }

            this._initialized= false
            this._value= undefined
        }

        Variant.prototype.getValue= function( atomId ) {
            this._atomRefs[atomId]= true

console.log("Variant.getValue:", this._variantId, atomId, '=', this._value)

            if ( this._value instanceof _Atom ) return this._value.getValue()

            return this._value;
        }

        Variant.prototype.setValue= function( atomId, value ) {

console.log("Variant.setValue:", this._variantId, atomId, '=', value)

            if ( value instanceof _Atom ) {

                // value._reParent(atoms[atomId])

                this._value= value
                this.dirty()
                this._initialized= true
                return
            }

            if ( typeof value === 'string' ) {

                this._value= value
                this.dirty()
                this._initialized= true
                return
            }

            if ( typeof value === 'number' ) {

                this._value= value
                this.dirty()
                this._initialized= true
                return
            }

            throw "VariantValueType " + value
        }

        Variant.prototype._dumpRefs= function ( comment ) {
            for ( var atomId in this._atomRefs ) {
                console.log('variantDumpRef', comment + ':', atoms[atomId])
                atoms[atomId].dump('variantDumpRef ' + comment)
            }
        }

        Variant.prototype.dirty= function() {
            if ( this._initialized === false ) return

            for ( var atomId in this._atomRefs ) {
                atoms[atomId].dirty();
            }
        }

//        var emptyVariant= new Variant()

// =============================================================================
//      Cell
// =============================================================================


//        var cellId= 0

        var Cell= function(x, y) {

//            this._cellId= ++cellId;

            this._x= x
            this._y= y

            this._variant= undefined
        }

        Cell.prototype.getValue= function( atomId ) {
            if ( this._variant === undefined ) return // undefined

            return this._variant.getValue(atomId);
        }

        Cell.prototype.setValue= function( atomId, value ) {

            if ( this._variant === undefined ) {
                this._variant= new Variant()
            }
            this._variant.setValue(atomId, value)

            // if ( this._variant !== undefined ) this._variant.dirty()
            // this._variant= new Variant(atomId, value)
        }

        Cell.prototype._dumpRefs= function ( comment ) {
            if ( this._variant === undefined ) return

            this._variant._dumpRefs(comment);
        }

        Cell.prototype.getKey= function() {
            return this._x + ':' + this._y
        }

        Cell.prototype.dirty= function() {
            if ( this._variant === undefined ) return

            this._variant.dirty()
        }

        Cell.prototype.getAtomRefs= function() {
            if ( this._variant === undefined ) return []
            return this._variant._atomRefs
        }


        // -----------------------------------------------------------------------------
        //      Interface of Cell. Cell is strictly private
        //      Maybe these should be methods of _Atom
        // -----------------------------------------------------------------------------

        // private
        var cells= {}

//        var emptyCell= new Cell()

        var _getCell= function( atomRootId, x, y ) {
            if ( !(atomRootId in cells) ) {
                cells[atomRootId]= {}
            }
            var key= x + ':' + y
            var cell= cells[atomRootId][key]
            if ( cell === undefined ) {
                cell= cells[atomRootId][key]= new Cell(x, y)
            }
            return cell
        }

        var __getCell= function( atomRootId, x, y ) {
            if ( !(atomRootId in cells) ) return // undefined
            return cells[atomRootId][x + ':' + y]
        }

// =============================================================================
//      Atom
// =============================================================================

        var _atomId= 0

        var atoms= {}

        // Keep _Atom as cheap as possible!
        var _Atom= function( parent ) {

            this._atomId= ++_atomId
            this._rootId= parent ? parent._rootId : _atomId
            this._parent= parent

            // Garbage collection horror
            atoms[_atomId]= this

console.log('_Atom.new:', this._atomId, this.name, parent ? '(parent:' + parent._atomId + ' ' + parent.name + ')' : '')

            // UNUSED & BUGGY (refs are not traced everywhere) !!!
            this._cellRefs= {}
        }

        // -----------------------------------------------------------------------------
        //      Static Methods
        // -----------------------------------------------------------------------------

        _Atom.dirties= {}

        _Atom.extend= function( name, protoFn, factoryFn ) {
            _Atom.prototype[name]= factoryFn
            protoFn.prototype.name= name
            protoFn.prototype.__proto__= _Atom.prototype
        }

        // -----------------------------------------------------------------------------
        //      Instance Methods
        // -----------------------------------------------------------------------------

//        _Atom.prototype._reParent= function( newParent ) {
//
//            // FIXME: Garbage collect old parents?
//
//            this.parent= newParent
//        }

        _Atom.prototype.recalcDeps= function() this._parent !== undefined ? this._parent.recalcDeps() : []
        _Atom.prototype._valueDeps= function() this._parent !== undefined ? this._parent._valueDeps() : []

        _Atom.prototype.__cellRefs= function() {
            var refs= this._parent !== undefined ? this._parent.__cellRefs() : {}
            for ( var ref in this._cellRefs ) refs[ref]= true;
            return refs
        }

        _Atom.prototype.cellRefs= function() {
            var refs= this.__cellRefs();
            var result= [];
            for ( var ref in refs ) result.push(cells[ref]);
            return result;
        }

        // _Atom.prototype.toString= function(a,b) "KJHKJHKJH"

        _Atom.prototype.getRanges= function() this.parent ? this.parent.getRanges() : []

        _Atom.prototype.valueDeps= function() _flatten(this._valueDeps())
        _Atom.prototype.valueDepsAsString= function() rangesToString(this.valueDeps())

        _Atom.prototype.name= ''
        _Atom.prototype.__flattened= undefined

        _Atom.prototype.__flattenSemaphore= false

        _Atom.prototype.getFlattenedRanges= function () {

            // TODO: Check for recursion first?
            if ( this._parent === undefined ) return []

            if ( this.__flattenSemaphore === true ) {
                this.__flattenSemaphore= false
                throw "AtomRecursion"
            }

            this.__flattenSemaphore= true

            var _doFlatten= function( me ) {
                if ( me._parent === undefined ) return false

                var parentWasDirty = _doFlatten(me._parent)

                if ( me._atomId in _Atom.dirties ) {
                    delete _Atom.dirties[me._atomId]
                    me.__flattened= _flatten(me.getRanges())
                    return true
                }
                if ( parentWasDirty || me.__flattened === undefined ) {
                    me.__flattened= _flatten(me.getRanges())
                    return true;
                }
                return false
            }

            _doFlatten(this)

            this.__flattenSemaphore= false
            return this.__flattened
        }

        _Atom.prototype.dirty= function () {
            if ( this._atomId in _Atom.dirties ) return

            _Atom.dirties[this._atomId]= true
            for each ( var range in this.getFlattenedRanges() ) {

console.log("_Atom.dirty: add", this._atomId, rangesToString([range]))

                var cell= __getCell(this._rootId, range[0], range[1])
                if ( cell === undefined ) continue

                for ( var atomId in cell.getAtomRefs() ) {

console.log("_Atom.dirty: add", this._atomId, rangesToString([range]), atomId);

                    _Atom.dirties[atomId]= true

                    // atoms[atomId].dirty()
                }
            }

            return this;
        }

//        _Atom.prototype.getCell= function () {
//            var ranges= this.getFlattenedRanges()
//            if ( ranges.length === 0 ) return emptyCell
//            return __getCell(this._rootId, ranges[0][0], ranges[0][1])
//        }

        _Atom.prototype.getValue= function() {

            var ranges= this.getFlattenedRanges()
            if ( ranges.length === 0 ) return // undefined

console.log("_Atom.getValue, dirties:", Rd(_Atom.dirties), ", ranges:", rangesToString(ranges));

            var cell= __getCell(this._rootId, ranges[0][0], ranges[0][1])

            // if ( !cell ) return '#EMPTY'
            if ( cell === undefined ) return // undefined

            this._cellRefs[cell.getKey()]= true;
            return cell.getValue(this._atomId);
        }

        _Atom.prototype.setValue= function( newValue ) {
            this.dirty()
            for each ( var range in this.getFlattenedRanges() ) {
                var cell= _getCell(this._rootId, range[0], range[1])
                cell.setValue(this._atomId, newValue)
            }
            return this;
        }

        _Atom.prototype._dumpCellRefs= function( comment ) {
            for each ( var range in this.getFlattenedRanges() ) {
                var cell= __getCell(this._rootId, range[0], range[1])
                if ( cell === undefined ) continue

                cell._dumpRefs(comment)
            }
            return this;
        }

        _Atom.prototype._getRangeValue= function( range ) {

            var cell= __getCell(this._rootId, range[0], range[1])
            if ( cell === undefined ) return // undefined

            this._cellRefs[cell.getKey()]= true
            return cell.getValue(this._atomId)
        }

        _Atom.prototype.dump= function( comment ) {
            console.log((comment ? comment + ': ' : '') + rangesToString(this.getRanges()))
            return this
        }


// =============================================================================
// *****************************************************************************
//
//      The following are tracked chainable methods of _Atom.
//      - Implemented as derivations of _Atom, so each method (part of the chain)
//        memoizes it's state. Kind of like currying
//      - Not pure functional (might change cell values)
//      - Return value of 'getRanges' is pure functionial
//
// *****************************************************************************
// =============================================================================

// =============================================================================
//      AddRange extends _Atom
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
//      AddRanges extends _Atom
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
//      Crop extends _Atom
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
//      Ofs extends _Atom
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


// =============================================================================
//      Flatten extends _Atom
//      NEEDED?
// =============================================================================

        var _Flatten= function ( parent ) {
            _Atom.call(this, parent)

            this.getRanges= function() {
                return parent.getFlattenedRanges()
            }
        }

        _Atom.extend('flatten', _Flatten, function() new _Flatten(this))


// =============================================================================
//      Grep extends _Atom
// =============================================================================

        var _Grep= function ( parent, value ) {
            _Atom.call(this, parent)

            this.getRanges= function() {
                var newRanges= []
                for each ( var range in parent.getFlattenedRanges() ) {
                    var cellValue= this._getRangeValue(range)
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
//      Add extends _Atom
// =============================================================================

        var _Add= function ( parent, value ) {
            _Atom.call(this, parent)

            if ( value instanceof _Atom ) value= value.getValue()

            this.getRanges= function() {
                for each ( var range in parent.getFlattenedRanges() ) {

                    var cell= __getCell(this._rootId, range[0], range[1])
                    if ( cell === undefined ) continue

                    // Mit parent statt mit this. Stimmt das? Mit this gibt's ne Rekursion
                    var cellValue= cell.getValue(parent._atomId);
                    if ( typeof cellValue === 'number' ) {

// Autsch, Seiteneffekt!

                        cell.setValue(parent._atomId, cellValue + value)
                    }
                }
                return parent.getRanges()
            }
        }

        _Atom.extend('add', _Add, function(value) new _Add(this, value))


// =============================================================================
//      Interface (window context)
// =============================================================================

        // Ranges= function() new _Atom

        var root= new _Atom

        C= function () root.addRange(Array.prototype.slice.call(arguments))

        DumpCells= function () {
            console.log(cells)
        }

        // V= function () new _Atom
        V= function ( value ) (new _Atom).addRange( 1, 1 ).setValue(value)

        A= function ( i ) atoms[i]
        DA= function ( i ) atoms[i].dump("ATOM")

})()
