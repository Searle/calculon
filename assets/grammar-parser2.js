
var PARSER= (function() {

    let undefined

    // this object contains all grammar elements for late expansion
    let _= {}

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
    let _dynamicConstructor= function _dynamicConstructor(fnPrototype, arg, name) {
        var fnClass= function _dynamicClass() {
            fnClass.prototype.__super__.call(this, arg)
        }
        fnClass.name= name || ('_dynamic_' + fnPrototype.name)
        _extend(fnPrototype, fnClass)
        return fnClass
    }

    let Grammar_Error= function Grammar_Error() {
        Grammar_Error.prototype.__super__.apply(this, arguments)
    }
    _extend(Error, Grammar_Error)

    /**
    *
    *   ElementBase is the base class of all grammar elements
    *
    **/

    let ElementBase= function ElementBase() {
//console.debug('new:', this.constructor.name)
        this.fullText= undefined
        this.match= undefined
        this.data= undefined
        this.name= this.constructor.name
    }

// var __path=""
    ElementBase.prototype.parse= function(_in) {
// let oldPath= __path
// __path+= ">" + this.constructor.name
// console.log("enter " + __path, this)
        let trimmed= _in.trimLeft()
        let result= this._parse(trimmed, _in)
        if (result === undefined) {
// console.log("failed " + __path, _in)
// __path= oldPath
            return // undefined
        }

        this.fullText= _in
        if (this.match === undefined)  this.match=    result
        if (this.remain === undefined) this.remain=   trimmed.substr(result.length)
// console.warn("match " + __path, this, _in)
// __path= oldPath
        return this
    }
//    ElementBase.prototype._parse= function() { throw new Grammar_Error("This method should have been overwritten.") }
    ElementBase.prototype._parse= function() { throw ("This method should have been overwritten.") }
    ElementBase.prototype.process= function() { console.log(this); console.error('Error'); throw ("This method should have been overwritten.") }
    ElementBase.prototype.newInstance= function(arg) {
        if (_isArray(arg)) return new _List(arg)
        if (_isFunction(arg)) return new arg
        if (typeof arg === 'string') {
            let match= arg.match(/^"(.*)"$/)
            if (match) {
                return new _.Literal(match[1])
            }
            else if (_[arg]) return new (_[arg])
        }
//        throw new Grammar_Error("Don't know what to instanciate.")
        console.log(arg)
        console.trace()
        throw ("Don't know what to instanciate.")
    }


    /**
    *
    *   some element modifications (concatenation to lists, alternative elements, optional elements)
    *
    **/

    // defines a list of alternative grammar elements
    let _ListOr= function ListOr(Elements) {
        _ListOr.prototype.__super__.call(this)

        this._parse= function(trimmed, _in) {
            for each (let Element in Elements) {
                let element= this.newInstance(Element)
                if (element.parse(_in) === undefined) continue
                this.remain= element.remain
                this.data= element
                return element.match
            }
        }
    }
    _ListOr.prototype.process= function() this.data.process.apply(this.data, arguments)
    _extend(ElementBase, _ListOr)

    let Or= function(elements, name) _dynamicConstructor(_ListOr, elements, name || '_anonymous_Or')

    // defines a list of mandatory grammar elements
    let _List= function List(Elements) {
        _List.prototype.__super__.call(this)

        this._parse= function(trimmed, _in) {
            let elements= []
            let fullMatch= ""
            let remain= _in
            for each (let Element in Elements) {
                let element= this.newInstance(Element)
                if (element.parse(remain) === undefined) return // undefined
                elements.push(element)
                fullMatch+= element.match
                remain= element.remain
            }
            this.data= elements
            this.remain= remain
//console.log('list_parse [', fullMatch, '][', remain, ']', Elements)
            return fullMatch
        }
    }
    _extend(ElementBase, _List)

    let List= function(elements, name) _dynamicConstructor(_List, elements, name || '_anonymous_List')

    // defines an optional grammar element
    let _Optional= function Optional(Element) {
        _Optional.prototype.__super__.call(this)

        this._parse= function(trimmed, _in) {
            let element= this.newInstance(Element)
            if (element.parse(_in) === undefined) return ''
            this.remain= element.remain
            this.data= element
            return element.match
        }
    }
    _extend(ElementBase, _Optional)

    let Optional= function(element) _dynamicConstructor(_Optional, element, name || '_anonymous_Optional')

    /**
    *
    *   define some primitives
    *
    **/

    // defines a literal like "="
    _.Literal= function Literal(literal) {
        _.Literal.prototype.__super__.call(this)
        this._parse= function(_in) {
            if (_in.indexOf(literal) === 0) return literal
        }
        this.process= function() this.match ? literal : undefined
    }
    _extend(ElementBase, _.Literal)

    // defines an identifier (letiable name, function name etc.)
    _.Identifier= function Identifier() _.Identifier.prototype.__super__.call(this)
    _.Identifier.prototype._parse= function(_in) {
        let match= _in.match(/^[a-z_]\w*/i)
        if (match === null) return // undefined
        return match[0]
    }
    _extend(ElementBase, _.Identifier)

    _.Int= function Int() _.Int.prototype.__super__.call(this)
    _.Int.prototype._parse= function(_in) {
        let match= _in.match(/^\-?\d+/)
        if (match === null) return // undefined
        this.data= parseInt(match[0], 10)
        return match[0]
    }
    this.process= function() this.data
    _extend(ElementBase, _.Int)

    _.Float= function Float() _.Float.prototype.__super__.call(this)
    _.Float.prototype._parse= function(_in) {
        let match= _in.match(/^\-?(\d+?\.)?\d+(e[\+\-]?\d+)?/i)
        if (match === null) return // undefined
        this.data= parseFloat(match[0])
        return match[0]
    }
    _.Float.prototype.process= function() this.data
    _extend(ElementBase, _.Float)

    // the pragmatic way to define a string
    let _CharacterListExcept= function CharacterListExcept(except) {
        _CharacterListExcept.prototype.__super__.call(this)
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
    _CharacterListExcept.prototype.process= function() this.data
    _extend(ElementBase, _CharacterListExcept)
    CharacterListExcept= function(chars) _dynamicConstructor(_CharacterListExcept, chars, 'CharacterListExcept')

    _.SingleQuotedString= List([
        '"\'"',
        CharacterListExcept("'"),
        '"\'"',
    ])
    _.SingleQuotedString.prototype.process= function() this.data ? this.data[1].process() : undefined

    _.DoubleQuotedString= List([
        '"""',
        CharacterListExcept('"'),
        '"""',
    ])
    _.SingleQuotedString.prototype.process= function() this.data ? this.data[1].process() : undefined

    _.QuotedString= Or([
        'SingleQuotedString',
        'DoubleQuotedString',
    ])
    _.QuotedString.prototype.process= function() this.data.process()

    // defines magic value's properties (the ".property"-part of "_.property")
    _.MagicValueProperty= List([
        '"."',
        'Identifier',
        Optional('MagicValueProperty'),
    ])

    // defines the magic value "_" and it's properties
    _.MagicValue= List([
        '"_"',
        Optional('MagicValueProperty'),
    ])
    _.MagicValue.prototype.process= function(magic) {
        let property= '.' + magic.property
        if (this.data[1].data !== undefined) {
            property= this.data[1].match
        }
        return '"' + magic.object + property + '"'
    }

    _.ExpressionPart= Or([
        'Float',
        'Int',
        'MagicValue',
    ])

    _.BiOperator= Or([ '"+"', '"-"', '"/"', '"*"', ])

    _.UniOperator= Or([ '"+"', '"-"', '"!"', '"~"', ])

    _.SimpleExpression= List([
        Optional('UniOperator'),
        'ExpressionPart',
        Optional([
            'BiOperator',
            'Expression',
        ])
    ])
    _.SimpleExpression.prototype.process= function(magic) {
        var expression= ""
        if (this.data[0].data) expression+= this.data[0].data.match
        expression+= this.data[1].process(magic)
        if (this.data[2].data) {
            expression+= this.data[2].data.data[0].match + this.data[2].data.data[1].process(magic)
        }
        return expression
    }

    _.ParanthesesExpression= List([
        '"("',
        'Expression',
        '")"',
    ])
    _.ParanthesesExpression.prototype.process= function(magic) {
        return '(' + this.data[1].process(magic) + ')'
    }

    _.Expression= Or([
        'SimpleExpression',
        'ParanthesesExpression',
    ])
    _.Expression.prototype.process= function(magic) {
        return this.data.process(magic)
    }

    _.ExpressionValue= List([
        'Expression',
    ])
    _.ExpressionValue.prototype.process= function(magic) eval(this.data[0].process(magic))

    _.CellTopLeftX= List(['ExpressionValue'])
    _.CellTopLeftX.prototype.process= function() this.data[0].process({object: 'TopLeft', property: 'x'})

    _.CellTopLeftY= List(['ExpressionValue'])
    _.CellTopLeftY.prototype.process= function() this.data[0].process({object: 'TopLeft', property: 'y'})

    _.CellBottomRightX= List(['ExpressionValue'])
    _.CellBottomRightX.prototype.process= function() this.data[0].process({object: 'BottomRight', property: 'x'})

    _.CellBottomRightY= List(['ExpressionValue'])
    _.CellBottomRightY.prototype.process= function() this.data[0].process({object: 'BottomRight', property: 'y'})

    _.Cell= List([
        '"["',
        'CellTopLeftX',
        '","',
        'CellTopLeftY',
        Optional([
            '":"',
            'CellBottomRightX',
            '","',
            'CellBottomRightY',
        ]),
        '"]"',
    ])
    _.Cell.prototype.process= function() {
        let tlX= this.data[1].process()
        let tlY= this.data[3].process()
        let brX= tlX
        let brY= tlY
        if (this.data[4].data !== undefined) {
            brX= this.data[4].data.data[1].process()
            brY= this.data[4].data.data[3].process()
        }
        return 'C([' + tlX +', ' + tlY + ' : ' + brX + ', ' + brY + '])'
    }

    return _.Cell

})()


var _test= new PARSER()
var _result= _test.parse("[ 1, _.x+- 33  : _, _.x ]")
console.log(_result)
console.log(_result.process())

