var cleave = require('../');

cleave
    .prompt('What is your password?', '*')
    .on('*', function(input) {
        console.log('your password has been updated');
    })
    .on('password', function() {
        console.log('seriously');
    })
    .end(process.exit);