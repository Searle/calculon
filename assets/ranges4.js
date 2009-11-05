
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

console.debug("_flatten:", rangesToString(ranges))

            // Catch common case: Range with one cell
            if ( ranges.length === 1 && ranges[0][0] === ranges[0][2] && ranges[0][1] === ranges[0][3] ) return ranges

console.debug("_flatten using slow")

            // Irgendwie die Ranges merken:
            // - Key bauen fuer alle Ranges

            // Beispiel: SUMME(B:B), dann Aenderung (oder hinzufuegen von B7)

            // Gibt jetzt nen Hash zurueck:

            var newRanges= {}
            for each ( var range in ranges ) {
                for ( var y= range[1]; y <= range[3]; y++ ) {
                    for ( var x= range[0]; x <= range[2]; x++ ) {
                        if ( x < 0 || y < 0 ) continue
                        if ( x + ':' + y in newRanges ) continue
                        newRanges[x + ':' + y]= [x, y, x, y]
                    }
                }
            }
            return newRanges

/*
            var lookup= {}
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
*/
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
//      Cell
// =============================================================================


//        var cellId= 0

        var Cell= function(atom, x, y) {

            this._x= x
            this._y= y
            this._atomId= atom._atomId
            this._rootAtomId= atom._rootId

            this._atomRefs= {}

            this._fn_value= undefined
            this._cellRange= undefined
        }

        Cell.prototype.initialized= function() this._fn_value !== undefined

        Cell.prototype.setValue= function(fn_value) {
            this._fn_value= fn_value

            // mark all referers as dirty
            this.dirty();
        }

        // FIXME: do we need caller's atomId or caller's rootAtomId here?
        Cell.prototype.getValue= function(atomId) {
            if ( this._fn_value === undefined ) return // undefined

            // remember calling atom as referer to this cell
            this._atomRefs[atomId]= true;
            if (this._cellRange === undefined) this._cellRange= root.addRange( [this._x, this._y] )
            var value= this._fn_value.apply(this._cellRange, arguments)
            if (value instanceof _Atom) return value.getValue()
            return value
        }

        Cell.prototype.dirty= function() {
            for (var atomId in this._atomRefs) {

console.debug("Cell.dirty: atomid=" + atomId)

                atoms[atomId].dirty();
            }
        }

        Cell.prototype.getAtomRefs= function() this._atomRefs


        // -----------------------------------------------------------------------------
        //      Interface of Cell. Cell is strictly private
        //      Maybe these should be methods of _Atom
        // -----------------------------------------------------------------------------

        // private
        var cells= {}

//        var emptyCell= new Cell()

        var _getCell= function( atom, coord ) {
            // FIXME: key= coord.join(':') ??
            var key= coord[0] + ':' + coord[1]
            var cell= cells[key]
            if ( cell === undefined ) {
                cell= cells[key]= new Cell(atom, coord[0], coord[1])
            }
            return cell
        }

        var __getCell= function( coord ) {
            // FIXME: key= coord.join(':') ??
            return cells[coord[0] + ':' + coord[1]]
        }

        var _getCellValue= function( atomId, coord ) {
            var cell= __getCell(coord)
            if (cell === undefined) return // undefined
            return cell.getValue(atomId)
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

console.debug('_Atom.new:', this._atomId, this.name, parent ? '(parent:' + parent._atomId + ' ' + parent.name + ')' : '')

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

        _Atom.prototype.getRangeValue= function( range ) this.parent ? this.parent.getRangeValue(range) : null

        _Atom.prototype.valueDeps= function() _flatten(this._valueDeps())
        _Atom.prototype.valueDepsAsString= function() rangesToString(this.valueDeps())

        _Atom.prototype.name= ''
        _Atom.prototype.__flattened= undefined

        _Atom.prototype.__flattenSemaphore= false

        _Atom.prototype.getFlattenedRanges= function () {

            // TODO: Check for recursion first?
            if ( this._parent === undefined ) return {}

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

console.debug("_Atom.dirty: add", this._atomId, rangesToString([range]))

                var cell= __getCell(range)
                if ( cell === undefined ) continue

                for ( var atomId in cell.getAtomRefs() ) {

console.debug("_Atom.dirty: add", this._atomId, rangesToString([range]), atomId);

                    _Atom.dirties[atomId]= true

                    // atoms[atomId].dirty()
                }
            }

            return this;
        }

        _Atom.prototype.getValues= function() {
            var ranges= this.getFlattenedRanges()
            if ( ranges.length === 0 ) return []

            var values= []
            for each ( var range in ranges ) {
                values.push(_getCellValue(this._atomId, range))
            }
            return values
        }



//        _Atom.prototype.getCell= function () {
//            var ranges= this.getFlattenedRanges()
//            if ( ranges.length === 0 ) return emptyCell
//            return __getCell(this._rootId, ranges[0][0], ranges[0][1])
//        }

        _Atom.prototype.getValue= function() {

            // TODO: is that ok?
            return this.getValues()[0];
        }

        _Atom.prototype.setValue= function( newValue ) {
            var value= newValue;
            if ( value instanceof _Atom ) {
                value= function() newValue.getValues()[0];
            }
            else if ( typeof value === 'number' || typeof value === 'string' ) {
                value = function() newValue;
            }
            var ranges= this.getFlattenedRanges();
            for each ( var range in ranges ) {
                _getCell(this, range).setValue(value);
            };
            return this;
        }

        _Atom.prototype._dumpCellRefs= function( comment ) {
            for each ( var range in this.getFlattenedRanges() ) {
                var cell= __getCell(range)
                if ( cell === undefined ) continue

                cell._dumpRefs(comment)
            }
            return this;
        }

        _Atom.prototype._getRangeValue= function( range ) {
            return _getCellValue(this._atomId, range)
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
//      - Pure functional
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

            console.debug("_addRange error:", arg, Object.prototype.toString.call(arg))

            throw "RangeArgException:" + arg
        }

        var _AddRange= function( parent, arg ) {
            _Atom.call(this, parent)

// console.debug(parent, ranges,arg)

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
//      Crop extends _Atom
// =============================================================================

        var _Crop= function( parent, x0, y0, x1, y1 ) {
            _Atom.call(this, parent)

            // TODO: pruefen auf x0/y0 < 0 ? Oder macht flatten das?

            if ( x1 === undefined ) x1= x0
            if ( y1 === undefined ) y1= y0

            this.getRanges= function() {
                var ranges= []
                for each ( let [ ox0, oy0, ox1, oy1 ] in parent.getRanges() ) {
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

        // TODO: call fn_check with cell's range as this?
        var _Grep= function ( parent, fn_check ) {
            _Atom.call(this, parent)

            if ( !_isFunction(fn_check) ) {
                var value= fn_check;
                fn_check= function(v) value == v
            }

            this.getRanges= function() {
                var newRanges= []
                for each ( var range in parent.getFlattenedRanges() ) {
                    var cellValue= _getCellValue(this._atomId, range)
                    if ( cellValue !== undefined && fn_check(cellValue) ) {
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

            this.getValues= function() {
                var values= [];
                for each ( var range in parent.getFlattenedRanges() ) {
                    values.push(_getCellValue(this._atomId, range) + value);
                }
                return values;
            }
        }

        _Atom.extend('add', _Add, function(value) new _Add(this, value))


// =============================================================================
//      Interface (window context)
// =============================================================================

        var root= new _Atom

        C= function () root.addRange(Array.prototype.slice.call(arguments))

        DumpCells= function () {
            console.log(cells)
        }

        V= function ( value ) (new _Atom).addRange( 1, 1 ).setValue(value)

        A= function ( i ) atoms[i]
        DA= function ( i ) atoms[i].dump("ATOM")

})()
