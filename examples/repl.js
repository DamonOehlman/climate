var cleave = require('../');

cleave
    .repl('prompt>')
    .command('what', function(args) {
        console.log(args);
    })
    .command('wait', function(time) {
        var waitTime = parseInt(time || 50, 10);
        console.log('waiting for ' + waitTime);
        
        return function(callback) {
            setTimeout(callback, waitTime);
        };
    });