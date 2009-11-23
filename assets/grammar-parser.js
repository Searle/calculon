
var PARSER= (function() {

    let undefined

    let _isFunction= function( obj ) {
        return Object.prototype.toString.call(obj) === "[object Function]"
    }

    let _isArray= function( obj ) {
        return Object.prototype.toString.call(obj) === "[object Array]"
    }

    // extends Class with given Proto
    let _extend= function(fnClass, fnProto) {

        fnProto.prototype.__proto__= fnClass.prototype
        fnProto.prototype.__super__= fnClass
    }

    // generates a dynamic constructor, inherited from class given as first argument
    let _dynamicConstructor= function _dynamicConstructor() {
        let args= Array.prototype.slice.call(arguments)
        let fnPrototype= args.shift()
        var fnClass= function _dynamicClass() {
            fnClass.prototype.__super__.apply(this, args)
        }
        fnClass.name= fnPrototype.name
        _extend(fnPrototype, fnClass)
        return fnClass
    }

    let GE_Error= function GE_Error() {
        GE_Error.prototype.__super__.apply(this, arguments)
    }
    _extend(Error, GE_Error)

    /**
    *
    *   GE is the base class of all grammar elements
    *
    **/

    let GE= function GE() {
//console.debug('new:', this.constructor.name)
        this.fullText= undefined
        this.match= undefined
        this.data= undefined
        this.name= this.constructor.name
    }
    let __path= ""
    GE.prototype.parse= function(_in) {
let oldPath= __path
__path+= '>' + this.name
//console.debug('enter parse ', __path)

        let trimmed= _in.trimLeft()
        let result= this._parse(trimmed, _in)
        if (result === undefined) {
//console.debug('parse ' + __path + ': text: "' + _in + '", failed')
__path= oldPath
            return // undefined
        }

        this.fullText= _in
        if (this.match === undefined)  this.match=    result
        if (this.remain === undefined) this.remain=   trimmed.substr(result.length)
//console.debug('parse ' + __path + ': text: "' + this.fullText + '", match: "' + this.match + '", remain: "' + this.remain + '"')
__path= oldPath
        return this
    }
    GE.prototype._parse= function() { throw new GE_Error("This method should have been overwritten.") }
    GE.prototype.process= function() true
    GE.prototype.newInstance= function(proto) {
        if (typeof proto === 'string') return new GE_Literal(proto)
//        if (proto instanceof GE) return proto
        if (_isArray(proto)) return new GE_List(proto)
        if (_isFunction(proto)) return new proto
        throw new GE_Error("Don't know what to instanciate.")
    }


    /**
    *
    *   some element modifications (concatenation to lists, alternative elements, optional elements)
    *
    **/

    // defines a list of alternative grammar elements
    let GE_ListOr= function GE_ListOr(fnElements) {
        GE_ListOr.prototype.__super__.call(this)

        this._parse= function(trimmed, _in) {
            for each (let fnElement in fnElements) {
                let element= this.newInstance(fnElement)
                if (element.parse(_in) === undefined) continue
                this.data= element
                return element.match
            }
        }
    }
    GE_ListOr.prototype.process= function() this.data.process()
    _extend(GE, GE_ListOr)

    // defines a list of mandatory grammar elements
    let GE_List= function GE_List(fnElements) {
        GE_List.prototype.__super__.call(this)

        this._parse= function(trimmed, _in) {
            let elements= []
            let fullMatch= ""
            let remain= _in
            for each (let fnElement in fnElements) {
                let element= this.newInstance(fnElement)
                if (element.parse(remain) === undefined) return // undefined
                elements.push(element)
//console.log(this.constructor.name, '_parse', element.match)
                fullMatch+= element.match
                remain= element.remain
            }
            this.data= elements
            this.remain= remain
            return fullMatch
        }
    }
    GE_List.prototype.process= function() { throw new GE_Error("List's processor should be overwritten") }
    _extend(GE, GE_List)

    // defines an optional grammar element
    let GE_Optional= function GE_Optional(fnElement) {
        GE_Optional.prototype.__super__.call(this)

        this._parse= function(trimmed, _in) {
            let element= this.newInstance(fnElement)
            if (element.parse(_in) === undefined) return ''
            this.remain= element.remain
            this.data= element.data
            return element.match
        }
    }
    _extend(GE, GE_Optional)

    /**
    *
    *   define some primitives
    *
    **/

    // defines a literal like "="
    let GE_Literal= function GE_Literal(literal) {
        GE_Literal.prototype.__super__.call(this)
        this._parse= function(_in) {
            if (_in.indexOf(literal) === 0) return literal
        }
    }
    _extend(GE, GE_Literal)

    // defines an identifier (letiable name, function name etc.)
    let GE_Identifier= function GE_Identifier() GE_Identifier.prototype.__super__.call(this)
    GE_Identifier.prototype._parse= function(_in) {
        let match= _in.match(/^[a-z_]\w*/i)
        if (match === null) return // undefined
        return match[0]
    }
    _extend(GE, GE_Identifier)

    // defines a letiable (an identifier preceeded by "$")
    let GE_Variable= function GE_Variable() {
        GE_Variable.prototype.__super__.call(this, [
            '$',
            GE_Identifier,
        ])
    }
    _extend(GE_List, GE_Variable)

    let GE_Int= function GE_Int() GE_Int.prototype.__super__.call(this)
    GE_Int.prototype._parse= function(_in) {
        let match= _in.match(/^\-?\d+/)
        if (match === null) return // undefined
        this.data= parseInt(match[0], 10)
        return match[0]
    }
    GE_Int.prototype.process= function() this.data
    _extend(GE, GE_Int)

    let GE_Float= function GE_Float() GE_Float.prototype.__super__.call(this)
    GE_Float.prototype._parse= function(_in) {
        let match= _in.match(/^\-?(\d+?\.)?\d+(e[\+\-]?\d+)?/i)
        if (match === null) return // undefined
        this.data= parseFloat(match[0])
        return match[0]
    }
    GE_Float.prototype.process= function() this.data
    _extend(GE, GE_Float)

/*
    // the formal way to define a sting
    let GE_CharacterExcept= function GE_CharacterExcept(except) {
        GE_CharacterExcept.prototype.__super__.call(this)
        this._parse= function(trimmed, _in) {
            let match= _in.match(/^\\?(.)/)
            if (match === null || match[0] === except) return // undefined
            this.remain= _in.substr(match[0].length)
            this.data= match[1]
            return match[0]
        }
    }
    _extend(GE, GE_CharacterExcept)

    let GE_CharacterListExcept= function GE_CharacterListExcept(except) {
        GE_CharacterListExcept.prototype.__super__.call(this, [
            _dynamicConstructor(GE_CharacterExcept, except),
            _dynamicConstructor(GE_Optional, _dynamicConstructor(GE_CharacterListExcept, except)),
        ])
    }
    _extend(GE_List, GE_CharacterListExcept)
*/

    // the pragmatic way to define a string
    let GE_CharacterListExcept= function GE_CharacterListExcept(except) {
        GE_CharacterListExcept.prototype.__super__.call(this)
        this._parse= function(trimmed, _in) {
            this.match= ''
            this.remain= _in
            this.data= ''
            while (true) {
                let match= this.remain.match(/^\\?(.)/)
                if (match === null) return this.match
                for each (let char in except) {
                    if (match[0] === char) return this.match
                }
                this.remain= this.remain.substr(match[0].length)
                // TODO: do something with special values like \n or \t
                this.match+= match[0]
                this.data+= match[1]
            }
        }
    }
    _extend(GE, GE_CharacterListExcept)

    let GE_SingleQuotedString= function GE_SingleQuotedString() {
        GE_SingleQuotedString.prototype.__super__.call(this, [
            "'",
            _dynamicConstructor(GE_CharacterListExcept, "'"),
            "'",
        ])
    }
    GE_SingleQuotedString.prototype.process= function() this.data[1].data
    _extend(GE_List, GE_SingleQuotedString)

    let GE_FunctionCall= function GE_FunctionCall() {
        GE_FunctionCall.prototype.__super__.call(this, [
            GE_Identifier,
            GE_ParanthesesStatement,
        ])
    }
    _extend(GE_List, GE_FunctionCall)

    let GE_ParanthesesStatement= function GE_ParanthesesStatement() {
        GE_ParanthesesStatement.prototype.__super__.call(this, [
            '(',
            GE_Statement,
            ')',
        ])
    }
    _extend(GE_List, GE_ParanthesesStatement)

    let GE_SingleStatement= function GE_SingleStatement() {
        GE_SingleStatement.prototype.__super__.call(this, [
            GE_Variable,
            GE_Assignment,
            GE_Float,
            GE_SingleQuotedString,
            GE_FunctionCall,
            GE_ParanthesesStatement,
        ])
    }
    _extend(GE_ListOr, GE_SingleStatement)

    let GE_Statement= function GE_Statement() {
        GE_Statement.prototype.__super__.call(this, [
            GE_SingleStatement,
            _dynamicConstructor(GE_Optional,
                [
                    ',',
                    GE_Statement,
                ]
            ),
        ])
    }
    GE_Statement.prototype.process= function() {
        let lastResult= undefined
        for each (let element in this.data) {
            /// ...to be continued
        }
    }
    _extend(GE_List, GE_Statement)

    let GE_Assignment= function GE_Assignment() {
        GE_Assignment.prototype.__super__.call(this, [
            _dynamicConstructor(GE_Optional, GE_Variable),
            '=',
            GE_Statement,
        ])
    }
    GE_Assignment.prototype.process= function() {
        let value= this.data[2].process()
        console.log('would assign variable "%s" with value "$s"', this.data[0].process(), value)
        return value
    }
    _extend(GE_List, GE_Assignment)

    return GE_Statement

})()


var _test= new PARSER()
var _result= _test.parse("$zuppi = function('huhu')")
console.log(_result)
console.log(_result.process())

