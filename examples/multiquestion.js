var cleave = require('../');

cleave
    .prompt('How are you?')
    .on('great', function() {
        console.log('That\'s great!!');
    })
    .fallback(function() {
        console.log('I guess that\'s ok...');
    })
    .prompt('How old are you?')
    .on('*', function(input) {
        console.log(input + ' eh?');
    })
    .end(process.exit);