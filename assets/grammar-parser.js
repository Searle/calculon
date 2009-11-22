
(function() {

    // extends Class with given Proto
    var _extend= function(fnClass, fnProto) {

        fnProto.prototype.__proto__= fnClass.prototype
        fnProto.prototype.__super__= fnClass
    }

    var GEInstance= function GEInstance(text, match, ge, data) {
        this.match=   match
        this.text=    text
        this.remain=  text.substr(match.length)
        this.process= function() ge.process(data, match, text)

        this.data= data
        this.ge= ge
        this.geName= ge.constructor.name
    }

    var GE= function GE() {}
    GE.prototype.match= function(_in) {
        var result= this._match(_in)
        if (result === undefined) return // undefined
        return new GEInstance(
            _in,
            result.match,
            this,
            result.data
        )
    }
    GE.prototype._match= function() { throw new Error("This method should be overwritten.") }
    GE.prototype.process= function() true

    var GE_Literal= function GE_Literal(literal) {
        GE_Literal.prototype.__super__.call(this)
        this._match= function(_in) {
            if (_in.indexOf(literal) === 0) return {match: literal}
        }
    }
    _extend(GE, GE_Literal)

    // defines a list of alternative grammar
    var GE_ListOr= function GE_ListOr(elements) {
        GE_ListOr.prototype.__super__.call(this)

        this._match= function(_in) {
            for each (let fnElement in elements) {
                let element= typeof fnElement === 'string'
                    ? new GE_Literal(fnElement)
                    : new fnElement
                let result= element.match(_in)
                if (result === undefined) continue
                return {
                    match: result.match,
                    data:  result,
                }
            }
        }
    }
    GE_ListOr.prototype.process= function(data) data.process.call(data, arguments)
    _extend(GE, GE_ListOr)

    // defines a grammar list
    var GE_List= function GE_List(elements) {
        GE_List.prototype.__super__.call(this)

        this._match= function(_in) {
            var matches= []
            var match= ""
            for each (let fnElement in elements) {
                let element= typeof fnElement === 'string'
                    ? new GE_Literal(fnElement)
                    : new fnElement
                let result= element.match(_in)
                if (result === undefined) return // undefined
                matches.push(result)
                match+= result.match
                _in= result.remain
            }
            return {
                match: match,
                data: matches,
            }
        }
    }
    GE_List.prototype.process= function() { throw new Error("List's processor should be overwritten") }
    _extend(GE, GE_List)

    var GE_Int= function GE_Int() GE_Int.prototype.__super__.call(this)
    GE_Int.prototype._match= function(_in) {
        var match= _in.match(/^\-?\d+/)
        if (match === null) return // undefined
        return {
            match: match[0],
            data: parseInt(match, 10),
        }
    }
    GE_Int.prototype.process= function(data) data
    _extend(GE, GE_Int)

    var GE_Identifier= function GE_Identifier() GE_Identifier.prototype.__super__.call(this)
    GE_Identifier.prototype._match= function(_in) {
        var match= _in.match(/^[a-z_]\w*/i)
        if (match === null) return // undefined
        return { match: match[0] }
    }
    _extend(GE, GE_Identifier)

    var GE_Variable= function GE_Variable() {
        GE_Variable.prototype.__super__.call(this, [
            '$',
            GE_Identifier,
        ])
    }
    _extend(GE_List, GE_Variable)

    var GE_FunctionCall= function GE_FunctionCall() {
        GE_FunctionCall.prototype.__super__.call(this, [
            GE_Identifier,
            '(',
            GE_Statement,
            ')',
        ])
    }
    _extend(GE_List, GE_FunctionCall)

    var GE_Statement= function GE_Statement() {
        GE_Statement.prototype.__super__.call(this, [
            GE_Variable,
            GE_Int,
            GE_FunctionCall,
        ])
    }
    _extend(GE_ListOr, GE_Statement)

    var GE_Assignment= function GE_Assignment() {
        GE_Assignment.prototype.__super__.call(this, [
            GE_Variable,
            '=',
            GE_Statement,
        ])
    }
    _extend(GE_List, GE_Assignment)

    var testString="$huhu=zuppi(78)"
    var test= new GE_Assignment
    console.log(test.match(testString))

})()



/**

    dec_number= 

**/