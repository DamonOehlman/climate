var climate = require('climate');

climate
    .repl('say hi>')
    .command('hi', function(input) {
        var message;
        
        if (! input) {
            message = 'Hello, my name is Bob';
            climate.fork()
                .prompt('What\'s your name?')
                .receive('*', function(name) {
                    climate.out('Hey there ' + name + '!!\n');
                });
        }
        else if (input.toLowerCase() == 'bob') {
            message = 'You remembered my name, awesome!';
        }
        else {
            message = 'My name isn\'t ' + input + ', it\'s Bob';
        }
        
        climate.out(message + '\n');
    });