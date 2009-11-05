
jQuery(function($) {

    $('#sheet1').CalculonSheet();

    
    console.log('C5: ', C('C5').getValues());

    C('C5').setValue(1)
    C('C6', 'C8').setValue(function() this.ofs(0, -1).getValue() + 1)

    console.log('C7: ', C('C7').getValue());
    console.log('C7 + 5: ', C('C7').add(5).getValues());
    C('C9').setValue(C('C7').add(5));
    console.log('C9: ', C('C9').getValues());


    for each ( var cell in GetAllCells() ) {
        console.log(cell._x, cell._y, cell.getValue());
        $('#sheet1').CalculonSheet("setCell", cell._x, cell._y, cell.getValue());
    }

})

