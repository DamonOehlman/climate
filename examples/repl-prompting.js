var cleave = require('../');

cleave
    .repl('test prompt>')
    .command('what?', function(args) {
        this
            .prompt('when?')
            .receive('where?', function() {
                this.prompt('why?');
            });
    })
    .command('wait', function(time) {
        var waitTime = parseInt(time || 50, 10);
        console.log('waiting for ' + waitTime + 'ms');
        
        return function(callback) {
            setTimeout(callback, waitTime);
        };
    });