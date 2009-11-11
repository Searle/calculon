
jQuery.Plugin= function(name, constructor, defaultSettings) {

    var instanceNo= 0

    this.fn[name]= function(settings, arg1, arg2, arg3) {

        if ( typeof settings === 'string' ) {
            if ( settings.substr(0, 3) === 'get' ) {
                var result= []
                this.each(function() {
                    result.push(((jQuery(this).data('_instance'))[settings])(arg1, arg2, arg3))
                })
                return result
            }
            return this.each(function() {
                ((jQuery(this).data('_instance'))[settings])(arg1, arg2, arg3)
            });
        }

        settings= jQuery.extend({}, defaultSettings, settings)

        return this.each(function() {
            jQuery(this).data('_instance', new (constructor)(jQuery(this), settings, instanceNo++));
        })
    }
};

// =============================================================================
//      CalculonSheet
// =============================================================================

jQuery(function($) {


        // DUPE from ranges4.js !!!
        // TODO: Remove DUPE

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



    var CalculonSheet= function ($this, settings) {

        var me= this

        var width= 0
        var height= 0

        var $cell= function( x, y ) $('.x' + x + '.y' + y, $this)

        var extendTo= function( newWidth, newHeight ) {

            var td= function( x, y ) {
                if ( x == 0 && y == 0 ) return '<td class="sheet rows cell x' + x + ' y' + y + '">Sheet</td>'
                if ( x == 0 ) return '<td class="rows cell x' + x + ' y' + y + '">' + y + '</td>'
                if ( y == 0 ) return '<td class="cols cell x' + x + ' y' + y + '">' + "@ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(x) + '</td>'
                return '<td class="cell x' + x + ' y' + y + '"></td>'
            }

            var html

            if ( width !== 0 && height !== 0 ) {
                for ( var i = 0; i <= height; i++ ) {
                    html= []
                    for ( var j= width; j < newWidth; j++ ) html.push(td(j, i))
                    if ( html.length ) $cell(width, i + 1).after(html.join(''))
                }
            }
            else {
                width= newWidth
            }

            html= []
            while ( height <= newHeight ) {
                html.push('<tr>')
                for ( var i= 0; i <= newWidth; i++ ) html.push(td(i, height))
                html.push('</tr>')
                height++;
            }
            if ( html.length ) $('tbody', $this).append(html.join(''))
        }

        this.setCell= function( x, y, value ) {
            extendTo(x, y)
            if (value instanceof Error) {
                $cell(x, y).addClass('error')
                value= value.message
            }
            else {
                $cell(x, y).removeClass('error')
            }
            $cell(x, y).text(value)
        }

        $this.html('<div class="calculon-sheet"><table><tbody></tbody></table></div>')

        // Immer mit 1x1 starten?
        // extendTo(1, 1)

        $('td', $this)
            .live("click", function( ev ) {
                console.log("CalculonSheet:Click", ev);
            })
//            .live("mouseover", function( ev ) {
//                console.log("CalculonSheet:MouseOver", ev);
//            })
//            .live("mouseout", function( ev ) {
//                console.log("CalculonSheet:MouseOut", ev);
//            })
    }

    $.Plugin('CalculonSheet', CalculonSheet, {
        // onInit: null,
    })
});
