
(function () {

    // if set to true, methods like set, add will modify the current atom
    // if set to false, those methods will create a new atom with current as parent
    var __modifyAtoms= true

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

    if ( typeof Rd === 'undefined' ) Rd= function ( value ) value


    // -----------------------------------------------------------------------------
    //      Cell/Ranges String functions
    // -----------------------------------------------------------------------------

    // FIXME: Naive Implementierung, kann kein AA1 etc
    var stringToCell= function( str ) {
        var x= "@ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(str.substr(0, 1))
        if ( x < 0 ) throw "NoValidCellName: [" + str + "]"
        var y= parseInt(str.substr(1), 10)
        if ( isNaN(y) || y <= 0 ) throw "NoValidCellName: [" + str + "]"
        return [ x, y ]
    }

    var rangesToString= function( ranges ) {

        var cellToString= function( x, y ) "@ABCDEFGHIJKLMNOPQRSTUVWXYZ".substr(x, 1) + y

        var result= []
        for each ( var range in ranges ) {
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
//
//      - Uses local variable "root"
// =============================================================================

    var Cell= function(atom, coord) {

        this._x= coord[0]
        this._y= coord[1]
        this._rootAtomId= atom._rootId

        this._atomRefs= {}

        this._value= undefined
    }

    Cell.prototype.initialized= function() this._valueFn !== undefined

    Cell.prototype.setValue= function( value ) {
        this._value= value

        // mark all referers as dirty
        this.dirty()
    }

    Cell.prototype.getValue= function( atom ) {
        // FIXME: is this legal?
        if ( atom === undefined ) {
            return atoms[this._rootAtomId]._resolveCellValue( [this._x, this._y], this._value )
        }
        // remember calling atom as referer to this cell
        this._atomRefs[atom._atomId]= true

        return atom._resolveCellValue( [this._x, this._y], this._value )
    }

    Cell.prototype.dirty= function() {
        for ( var atomId in this._atomRefs ) {

console.debug("Cell.dirty: atomid=" + atomId)

            atoms[atomId].dirty()
        }
    }

    Cell.prototype.getAtomRefs= function() this._atomRefs


    // -----------------------------------------------------------------------------
    //      Interface of Cell. Cell is strictly private
    //      Maybe these should be methods of _Atom
    // -----------------------------------------------------------------------------

    // private
    var cells= {}

    var _getCell= function( atom, coord ) {
        // FIXME: key= coord.join(':') ??
        var key= coord[0] + ':' + coord[1]
        var cell= cells[key]
        if ( cell === undefined ) {
            cell= cells[key]= new Cell(atom, coord)
        }
        return cell
    }

    var __getCell= function( coord ) {
        // FIXME: key= coord.join(':') ??
        return cells[coord[0] + ':' + coord[1]]
    }

    var _getCellValue= function( atom, coord ) {
        var cell= __getCell(coord)
        if ( cell === undefined ) return // undefined
        return cell.getValue(atom)
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

        this._cellAtoms= {}
        this._isCellAtom= false

        // Garbage collection horror
        atoms[_atomId]= this

console.debug('_Atom.new:', this._atomId, this.name, parent ? '(parent:' + parent._atomId + ' ' + parent.name + ')' : '')
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

    _Atom.prototype.getRanges= function() this._parent ? this._parent.getRanges() : []

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
                return true
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

console.debug("_Atom.dirty: add", this._atomId, rangesToString([range]), atomId)

                _Atom.dirties[atomId]= true
            }
        }

        return this
    }

    _Atom.prototype.getValues= function() {
        var ranges= this.getFlattenedRanges()
        if ( ranges.length === 0 ) return []

        var values= []
        for each ( var range in ranges ) {
            values.push(this.getCellValue(range))
        }
        return values
    }

    _Atom.prototype.getValue= function() {

        // TODO: is that ok?
        return this.getValues()[0]
    }

    _Atom.prototype._getCellAtom= function( coord ) {
        if ( this._isCellAtom ) return this
        var key= coord[0] + ':' + coord[1]
        if ( this._cellAtoms[key] ) return this._cellAtoms[key]
        var atom= this._cellAtoms[key]= this.range(coord)
        atom._isCellAtom= true
        return atom
    }

    // resolves value starting in current atom (needs coord to build this for functions)
    _Atom.prototype._resolveCellValue= function( coord, value ) {
        if ( value === undefined ) return // undefined

        if ( _isFunction(value) ) {
            var cellAtom= this._getCellAtom(coord)
            return cellAtom._recursiveSave(function() {
                var v= value.apply(cellAtom)
                if ( v instanceof _Atom ) return v.getValue()
                return v
            })
        }
        if ( value instanceof _Atom ) return this._recursiveSave(function() value.getValue())
        return value
    }

    _Atom.prototype._recursiveSave= function( fn ) {
        if ( this.__recursionSemaphore ) {
            console.Error("Recursion detected")
            return null
        }
        this.__recursionSemaphore= true

        var result= fn()

        this.__recursionSemaphore= false
        return result
    }

    // returns cell's value, should be overwritten by modifying atom heirs
    _Atom.prototype.getCellValue= function( cellRange, cell ) {
        if ( this._ownCell(cellRange) ) {
            return this._getCellValue(cellRange, cell)
        }
        return this._parentsCellValue(cellRange, cell)
    }

    // returns parent's cell value or original cell's value
    _Atom.prototype._parentsCellValue= function( cellRange, cell ) {
        if ( this._parent === undefined ) {
            return _getCellValue(this, cellRange)
        }
        return this._parent.getCellValue(cellRange, cell)
    }

    // virtual method returning parent's cell value
    // to be overwritten in modifying atoms
    _Atom.prototype._getCellValue= _Atom.prototype._parentsCellValue

    // returns true if cell is in atom's region collection
    _Atom.prototype._ownCell= function( cellRange ) {
        // cellAtoms do not provide values
        if ( this._isCellAtom ) return false
        var x= cellRange[0]
        var y= cellRange[1]
        for each ( var range in this.getRanges() ) {
            if (
                range[0] <= x && range[2] >= x &&
                range[1] <= y && range[3] >= y
            ) return true
        }
        return false
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
//      AddRange extends _Atom, adds given ranges to parent's ranges
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

        this.getRanges= function() {
            return __addRange(parent.getRanges(), arg)
        }
    }

    _Atom.extend('addRange', _AddRange, function() new _AddRange(this, Array.prototype.slice.call(arguments)))


// =============================================================================
//      AddRanges extends _Atom, adds given ranges to parent's ranges
// =============================================================================

    var _AddRanges= function( parent, newRanges ) {
        _Atom.call(this, parent)

        this.getRanges= function() {
            var _ranges= parent.getRanges()
            for each ( var arg in newRanges ) __addRange(_ranges, arg)
            return _ranges
        }
    }

    _Atom.extend('addRanges', _AddRanges, function(newRanges) new _AddRanges(this, newRanges))


// =============================================================================
//      Range extends _Atom, sets atom's range
// =============================================================================

    var _Range= function( parent, arg ) {
        _Atom.call(this, parent)

        this.getRanges= function() {
            return __addRange([], arg)
        }
    }

    _Atom.extend('range', _Range, function() new _Range(this, Array.prototype.slice.call(arguments)))


// =============================================================================
//      Ranges extends _Atom, sets atom's ranges
// =============================================================================

    var _Ranges= function( parent, ranges ) {
        _Atom.call(this, parent)

        this.getRanges= function() {
            var _ranges= []
            for each ( var args in ranges ) __addRange(_ranges, arg)
            return _ranges
        }
    }

    _Atom.extend('ranges', _Ranges, function(ranges) new _Ranges(this, ranges))


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
            return [[ range[0] + x, range[1] + y, range[2] + x, range[3] + y ] for each (range in parent.getRanges())]
        }
    }

    _Atom.extend('ofs', _Ofs, function(x, y) new _Ofs(this, x,y ))


// =============================================================================
//      RelTo extends _Atom
// =============================================================================

    var _RelTo= function( parent, source ) {
        _Atom.call(this, parent)

        // makes one-element-array ranges as long as reference
        var fixLength= function(ranges, reference) {
            return [ ranges[0] for (i in reference) ]
        }

        this.getRanges= function() {
            var sourceRanges= source.getRanges()
            var destRanges= parent.getRanges()

            if ( sourceRanges.length === 1 ) sourceRanges= fixLength(sourceRanges, destRanges)
            if ( destRanges.length === 1 )   destRanges= fixLength(destRanges, sourceRanges)
            if ( sourceRanges.length !== destRanges.length ) return []

            return [
                [
                    dest - sourceRanges[i][j] for ([j, dest] in destRange)
                ] for ([i, destRange] in destRanges) 
            ]
        }
    }

    _Atom.extend('relTo', _RelTo, function(source) new _RelTo(this, source))


// =============================================================================
//      AddRel extends _Atom
// =============================================================================

    var _AddRel= function( parent, rel ) {
        _Atom.call(this, parent)

        this.getRanges= function() {
            var sourceRanges= parent.getRanges()
            var relRanges= rel.getRanges()

            var ranges= []
            for ( var i = 0; i < relRanges.length; i++ ) {
                var j= i % sourceRanges.length
                ranges.push([
                    sourceRanges[j][0] + relRanges[i][0],
                    sourceRanges[j][1] + relRanges[i][1],
                    sourceRanges[j][0] + relRanges[i][2],
                    sourceRanges[j][1] + relRanges[i][3],
                ])

            }
            return ranges
        }
    }

    _Atom.extend('addRel', _AddRel, function(rel) new _AddRel(this, rel))


// =============================================================================
//      Flatten extends _Atom
//      NEEDED?
// =============================================================================

//        var _Flatten= function ( parent ) {
//            _Atom.call(this, parent)
//
//            this.getRanges= function() {
//                return parent.getFlattenedRanges()
//            }
//        }
//
//        _Atom.extend('flatten', _Flatten, function() new _Flatten(this))


// =============================================================================
//      Grep extends _Atom
// =============================================================================

    // TODO: call fn_check with cell's range as this?
    var _Grep= function ( parent, checkFn ) {
        _Atom.call(this, parent)

        if ( checkFn instanceof _Atom ) {
            checkFn= checkFn.getValue()
        }
        if ( !_isFunction(checkFn) ) {
            var value= checkFn
            checkFn= function(v) value === v
        }

        this.getRanges= function() {
            var newRanges= []
            for each ( var range in parent.getFlattenedRanges() ) {
                var cell= __getCell(range)
                var cellValue= parent.getCellValue(range)
                if ( checkFn.call(cell, cellValue) ) {
                    newRanges.push(range)
                }
            }
            return newRanges
        }
    }

    _Atom.extend('grep', _Grep, function(value) new _Grep(this, value))


// =============================================================================
//      SetCell modifies _Atom, sets each cell to given value and stores value in every cell
// =============================================================================

    var _SetCell= function ( value ) {

    var ranges= this.getFlattenedRanges()
        for each ( var range in ranges ) {
            _getCell(this, range).setValue(value)
        }

        return this.set(value)
    }

    if (__modifyAtoms) {
        _Atom.prototype.setCell= _SetCell
    }
    else {
        _Atom.extend('setCell', _SetCell, function(value) _SetCell.call(new _Atom(this), value))
    }


// =============================================================================
//      Set modifiess _Atom, sets each cell to given value
// =============================================================================

    var _Set= function ( value ) {
        // mask lower cellmodifications
        this._getCellValue= function( cellRange, cell ) {
            return this._resolveCellValue(cellRange, value)
        }
        return this
    }

    if (__modifyAtoms) {
        _Atom.prototype.set= _Set
    }
    else {
        _Atom.extend('set', _Set, function(value) _Set.call(new _Atom(this), value))
    }


// =============================================================================
//      Add extends _Atom, adds given value to each cell
// =============================================================================

    var _Add= function ( value ) {
        if ( value instanceof _Atom ) value= value.getValue()

        var superGetCellValue= this._getCellValue
        this._getCellValue= function( cellRange, cell ) {
            var cellValue= superGetCellValue.call(this, cellRange, cell)
            if ( cellValue === undefined ) return value
            if ( cellValue === null )      return null
            return cellValue + value
        }
        return this
    }

    if (__modifyAtoms) {
        _Atom.prototype.add= _Add
    }
    else {
        _Atom.extend('add', _Add, function(value) _Add.call(new _Atom(this), value))
    }


// =============================================================================
//      Mult extends _Atom, multiplies every cell with given value
// =============================================================================

    var _Mult= function ( value ) {
        if ( value instanceof _Atom ) value= value.getValue()

        var superGetCellValue= this._getCellValue
        this._getCellValue= function( cellRange, cell ) {
            var cellValue= superGetCellValue.call(this, cellRange, cell)
            if ( cellValue === undefined ) return undefined
            if ( cellValue === null )      return null
            return cellValue * value
        }
        return this
    }

    if (__modifyAtoms) {
        _Atom.prototype.mult= _Mult
    }
    else {
        _Atom.extend('mult', _Mult, function(value) _Mult.call(new _Atom(this), value))
    }


// =============================================================================
//      Op extends _Atom, applies given function on every cell
// =============================================================================

    var _Op= function ( fn ) {
        var superGetCellValue= this._getCellValue
        this._getCellValue= function( cellRange, cell ) {
            var cellValue= superGetCellValue.call(this, cellRange, cell)
            if ( cellValue === null ) return null
            if ( cell === undefined ) cell= _getCell(range)
            return fn.call(cell._cellRange, cellValue)
        }
        return this
    }

    if (__modifyAtoms) {
        _Atom.prototype.op= _Op
    }
    else {
        _Atom.extend('op', _Op, function(value) _Op.call(new _Atom(this), value))
    }


// =============================================================================
//      Sum extends _Atom, returns sum of all cells
// =============================================================================

    var _Sum= function ( parent ) {
        _Atom.call(this, parent)

        this.getValues= function() {
            var ranges= parent.getFlattenedRanges()
            if ( ranges.length === 0 ) return [undefined]
            var value= 0
            for each ( var range in ranges ) {
                var cellValue= this._getCellValue(range)
                if ( cellValue === undefined ) continue
                if ( cellValue === null )      continue
                value+= cellValue
            }
            return [value]
        }
    }

    _Atom.extend('sum', _Sum, function() new _Sum(this))


// =============================================================================
//      Prod extends _Atom, returns product of all cells
// =============================================================================

    var _Prod= function ( parent ) {
        _Atom.call(this, parent)

        this.getValues= function() {
            var ranges= parent.getFlattenedRanges()
            if ( ranges.length === 0 ) return [undefined]
            var value= 1
            for each ( var range in ranges ) {
                var cellValue= this._getCellValue(range)
                if ( cellValue === undefined ) continue
                if ( cellValue === null )      continue
                value*= cellValue
            }
            return [value]
        }
    }

    _Atom.extend('prod', _Prod, function() new _Prod(this))


// =============================================================================
//      Interface (window context)
// =============================================================================

    var root= new _Atom

    C= function () root.addRange(Array.prototype.slice.call(arguments))

    GetAllCells= function() cells

    DumpCells= function () {
        console.log(cells)
    }

    V= function ( value ) (new _Atom).addRange( 1, 1 ).setValue(value)

    A= function ( i ) atoms[i]
    DA= function ( i ) atoms[i].dump("ATOM")

})()
