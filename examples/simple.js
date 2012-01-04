var cleave = require('../');

cleave
    .prompt('How are you?')
    .on('great', function() {
        console.log('That\'s great!!');
    })
    .fallback(function() {
        console.log('I guess that\'s ok...');
    })
    .end(process.exit);