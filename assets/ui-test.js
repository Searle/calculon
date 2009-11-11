
jQuery(function($) {

    $('#sheet1').CalculonSheet();

    C('C5').setCell(5);
    console.log('C5: ', C('C5').getValues());

    C('C6', 'C8').setCell(function() this.ofs(0, -1).add(1))

    console.log('C7: ', C('C7').getValue());
    console.log('C7 + 5: ', C('C7').add(5).getValues());
    C('C9').setCell(C('C7').add(5));
    console.log('C9: ', C('C9').getValues());

    C('B3').setCell(C('B3'))

    for each ( var cell in GetAllCells() ) {
        console.log(cell._x, cell._y, cell.getValue());
        $('#sheet1').CalculonSheet("setCell", cell._x, cell._y, cell.getValue());
    }

})

