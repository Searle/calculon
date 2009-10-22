var range= new Ranges().addRange( 'A1', 'B20' );

console.log('range.ranges: ', range._ranges);

var newrange= range.addRange( 'C3', 'D7' );

console.log('newrange.ranges: ', newrange._ranges);

newrange= newrange.addRanges( [ range, newrange ] );

console.log('newrange.ranges: ', newrange._ranges);







