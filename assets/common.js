
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

    if (typeof console === 'undefined') console= {}

    // remember console's old log functions
    var oldFns= {}
    for (var level in _levelMap) {
        oldFns[level]= console[level] || function() {}
    }

    console.logLevel= function(level) {
        if (level in _levelMap) {
            _level= _levelMap[level]
            // overwrite masked console functions
            for (var l in _levelMap) {
                console[l]= _levelMap[l] <= _level ? oldFns[l] : function() {}
            }
            oldFns.debug.call(console, 'Log level set to "' + level + '". To change level again call "console.logLevel([new log level])"')
        }
        return _level
    }

    console.logLevel('info')
    console.Error= oldFns.error

})()
