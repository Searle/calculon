
// modify firebug's console to implement log level
// new method "console.level()" gets/sets log level
// console.debug/info/warn/error are called only if log level is higher or equal

(function() {
    var _level
    var _levelMap= {
        debug: 7,
        log: 6,
        info: 5,
        warn: 4,
        error: 3,
    }

    console.level= function(level) {
        if (typeof level !== 'undefined') {
            _level= _levelMap[level] || level
        }
        return _level
    }

    console.level('debug')

    for (var level in _levelMap) {
        console[level]= (function(level) {
            var origFn= console[level] || function() {}
            level= _levelMap[level]
            return function() {
                if (level <= _level) origFn.apply(console, arguments)
            }
        })(level)
    }

})()
