
if ( typeof console === 'undefined' ) console= { log: function () {}, warn: function () {}, error: function () {} }

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

    var CalculonSheet= function ($this, settings) {

        var me= this

        var width= 0
        var height= 0

        var $cell= function( x, y ) $('.x' + x + '.y' + y, $this)

        var extendTo= function( newWidth, newHeight ) {

            var td= function( x, y ) '<td class="cell x' + x + ' y' + y + '"></td>'

            var html

            if ( width !== 0 && height !== 0 ) {
                for ( var i = 0; i < height; i++ ) {
                    html= []
                    for ( var j= width; j < newWidth; j++ ) html.push(td(j + 1, i + 1))
                    $cell(width, i + 1).after(html.join(''))
                }
            }
            else {
                width= newWidth
            }

            html= []
            while ( height < newHeight ) {
                html.push('<tr>')
                for ( var i= 0; i < newWidth; i++ ) html.push(td(i + 1, height + 1))
                html.push('</tr>')
                height++;
            }
            $('tbody', $this).append(html.join(''))
        }

        this.setCell= function( x, y, value ) {
            extendTo(x, y)
            console.log($('.x0.y0', $this))
            $cell(x, y).text(value)
            console.log("HUHU");
        }

        $this.html('<div class="calculon-sheet"><table><tbody></tbody></table></div>')

        // Immer mit 1x1 starten?
        // extendTo(1, 1)

        $this
            .live("mouseenter", function( ev ) {
            })
            .live("mouseleave", function( ev ) {
            })
    }

    $.Plugin('CalculonSheet', CalculonSheet, {
        // onInit: null,
    })
});
