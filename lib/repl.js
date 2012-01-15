var debug = require('debug')('repl'),
    reDelimiter = /\s|\,/,
    reFirstSpace = /^(.*?)\s+(.*)$/;

function CleaverRepl(cleaver) {
    this.cleaver = cleaver;
} // CleaverRepl

CleaverRepl.prototype.command = function(cmd, handler) {
    
    // handle the command with no args
    debug('registering command handler for command: ' + cmd);
    this.cleaver.receive(cmd, function(input) {
        input = (input || '').slice(cmd.length + 1);
        
        if (handler) {
            return handler.apply(this, input.split(/reDelimiter/));
        }
    });
    
    return this;
};

module.exports = function(cleaver, prompt, opts) {
    
    function quit() {
        process.exit();
    }
    
    // ensure we have opts
    opts = opts || {};
    
    // set the increment to 0
    cleaver.increment = 0;

    // filter the input from the repl, and replace the first space with a .
    cleaver.filter(function(input) {
        return input.replace(reFirstSpace, '$1.$2');
    });
    
    // queue the prompt
    if (cleaver.rli) {
        cleaver.rli.setPrompt((prompt || '>') + ' ');
    }
    
    cleaver.prompt(prompt || '>');
    
    // some default command mappings
    cleaver
        .receive('quit', quit)
        .receive('exit', quit)
        ._bindHandler('nomatch', function(input) {
            this.out('Unknown command: ' + input + '\n');
        });
    
    // on end, quit the process
    // cleaver.end(process.exit);
    
    return new CleaverRepl(cleaver);
};