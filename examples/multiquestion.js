var cleave = require('../');

cleave
    .prompt('How are you?')
    .on('great', function() {
        console.log('That\'s great!!');
    })
    .prompt('How old are you?')
    .on('*', function(input) {
        console.log(input + ' eh?');
    })
    .end(process.exit);