var cleave = require('../');

cleave
    .prompt('What is your password?', '*')
    .on('*', function() {
        // validate password strength
    })
    .on('password', function() {
        console.log('seriously');
        return false;
    })
    .prompt('And how are you?')
    .on('*', console.log)
    .end(process.exit);