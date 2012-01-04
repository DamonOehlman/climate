var cleave = require('../');

cleave
    .prompt('How are you?')
    .on('*', function(input) {
        console.log('I see you are ' + input);
    })
    .on('great', function() {
        console.log('That\'s great!!');
    })
    .end(process.exit);