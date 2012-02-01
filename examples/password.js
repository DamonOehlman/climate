var climate = require('climate');

climate
    .prompt('What is your password?', '*')
    .receive('*', function() {
        // validate password strength
    })
    .receive('password', function() {
        console.log('seriously');
        return false;
    })
    .prompt('And how are you?')
    .receive('*', console.log)
    .end(process.exit);