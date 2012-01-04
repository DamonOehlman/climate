var cleave = require('../');

cleave
    .prompt('What is your password?', '*')
    .on('*', function() {
        console.log('seriously');
    })
    .prompt('And how are you?')
    .end(process.exit);