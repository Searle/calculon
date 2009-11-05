/*

    Based on readable.js by:

    Author: Oliver Steele
    Copyright: Copyright 2006 Oliver Steele.  All rights reserved.
    License: MIT License (Open Source)
    Homepage: http://osteele.com/sources/javascript/
    Docs: http://osteele.com/sources/javascript/docs/readable
    Download: http://osteele.com/sources/javascript/readable.js
    Created: 2006-03-03
    Modified: 2006-03-20
    
    Thanks!

*/

(function () {

    var undefined

    var _isFunction= function( obj ) {
        return Object.prototype.toString.call(obj) === "[object Function]"
    }

    var _isArray= function( obj ) {
        return Object.prototype.toString.call(obj) === "[object Array]"
    }

    var optionDefaults = {
        length: 50,
        level: 5,
        stringLength: 50,
        omitInstanceFunctions: true,
    };

    var toReadable = function(value, options) {

        // it's an error to read a property of null or undefined
        if ( value == null || value == undefined ) return String(value);

        if ( _isFunction(value) ) return Function_toReadable.apply(value, [options]);
        if ( _isArray(value) ) return Array_toReadable.apply(value, [options]);
        if ( typeof value === "string" ) return String_toReadable.apply(value, [options]);

        return Object_toReadable.apply(value, [options]);
    };

    var charEncodingTable = {'\r': '\\r', '\n': '\\n', '\t': '\\t',
                                  '\f': '\\f', '\b': '\\b'};

    var String_toReadable = function (options) {
        if (options == undefined) options = optionDefaults;
        var string = this;
        var length = options.stringLength;
        if (length && string.length > length) {
            string = string.slice(0, length) + '...';
        }
        string = string.replace(/\\/g, '\\\\');
        for (var c in charEncodingTable) {
    		string = string.replace(c, charEncodingTable[c], 'g');
        }
        if (string.match(/\'/) && !string.match(/\"/)) {
            return '"' + string + '"';
        }
        else {
            return "'" + string.replace(/\'/g, '\\\'') + "'";
        }
    };

    // save this so we still have access to it after it's replaced, below
    var objectToString = Object.toString;

    // HTML elements are stringified using a hybrid Prototype/CSS/XPath
    // syntax.  If $() is defined, elements with ids are stringified as
    // $('id').  Else elements are stringified as
    // e.g. document/html/div[2]/div#id/span.class.
    var elementToString = function (options) {
    	if (this == document) return 'document';
    	var s = this.tagName.toLowerCase();
        var parent = this.parentNode;
    	if (this.id) {
            try {if (typeof $ == 'function') return "$('" + this.id + "')"}
            catch(e) {}
            s += '#' + this.id;
        } else if (this.className)
            s += '.' + this.className.replace(/\s.*/, '');
    	if (parent) {
    		var index, count = 0;
    		for (var sibling = this.parentNode.firstChild; sibling; sibling = sibling.nextSibling) {
    			if (this.tagName == sibling.tagName)
    				count++;
    			if (this == sibling)
    				index = count;
    		}
    		if (count > 1)
    			s += '[' + index + ']';
    		s = (parent == document ? '' : arguments.callee.apply(parent, [options]))+'/'+s;
    	}
    	return s;
    };

    // Global variables that should be printed by name:
    var globals = {
        'Math': Math
    };

    // Rhino doesn't define these globals:
    try {
        globals['document'] = document;
        globals['window'] = window;
    }
    catch (e) {
        // do nothing
    }

    var Object_toReadable = function(options) {
        if (options == undefined) options = optionDefaults;

        for (var name in globals) {
            if (globals[name] === this) return name;
        }

        if (this.constructor == Number || this.constructor == Boolean ||
            this.constructor == RegExp || this.constructor == Error ||
            this.constructor == String)
        {
    		return this.toString();
        }
        
    	if (this.parentNode) try {
            return elementToString.apply(this, [options])
        }
        catch (e) {
        }

        var level = options.level;
        var length = options.length;
        if (level == 0) length = 0;
        if (level) options.level--;
        var omitFunctions = options.omitFunctions;
        var segments = [];
        var cname = null;
        var delim = '{}';
        if (this.constructor && this.constructor != Object) {
            var cstring = this.constructor.toString();
            var m = cstring.match(/function\s+(\w+)/);
            if (!m) m = cstring.match(/^\[object\s+(\w+)\]$/);
            if (!m) m = cstring.match(/^\[(\w+)\]$/);
            if (m) cname = m[1];
        }
        if (cname) {
            segments.push(cname);
            delim = '()';
            omitFunctions = options.omitInstanceFunctions;
        }
        segments.push(delim.charAt(0));
        var count = 0;
        for (var p in this) {
            var value;
            // accessing properties of document in Firefox throws an
            // exception.  Continue to the next property in case there's
            // anything useful.
            try {value = this[p]} catch(e) {continue}
    		// skip inherited properties because there are just too many.
    		// except in IE, whcih doesn't have __proto__, so this throws
    		// an exception.
            try {if (value == this.__proto__[p]) continue} catch(e) {}
            if (typeof value == 'function' && omitFunctions) continue;
            if (count++) segments.push(', ');
            if (length >= 0 && count > length) {
                segments.push('...');
                break;
            }
            segments.push(p.toString());
            segments.push(': ');
            segments.push(toReadable(value, options));
        }
        if (level) options.level = level;
        return segments.join('') + delim.charAt(1);
    };

    var Array_toReadable = function(options) {
        if (options == undefined) options = optionDefaults;
        var level = options.level;
        var length = options.length;
        if (level == 0) return '[...]';
        if (level) options.level--;
        var segments = [];
        for (var i = 0; i < this.length; i++) {
            if (length >= 0 && i >= length) {
                segments.push('...');
                break;
            }
            segments.push(toReadable(this[i], options));
        }
        if (level) options.level = level;
        return '[' + segments.join(', ') + ']';
    };

    var Function_toReadable = function(options) {
        if (options == undefined) options = optionDefaults;
        var string = this.toString();
        if (!options.printFunctions) {
            var match = string.match(/(function\s+\w*)/);
            if (match)
                string = match[1] + '() {...}';
        }
        return string;
    };

    // Let's polute the namespace
    Rd= toReadable

})();
