var cleave = require('../');

cleave
    .prompt('How are you?')
    .receive('great', function() {
        console.log('That\'s great!!');
    })
    .prompt('How old are you?')
    .receive('*', function(input) {
        console.log(input + ' eh?');
    })
    .end(process.exit);