var debug = require('debug')('repl'),
    reDelimiter = /\s|\,/;

function CleaverRepl(cleaver) {
    this.cleaver = cleaver;
    this.aliases = {};
} // CleaverRepl

CleaverRepl.prototype.alias = function(cmd, aliases) {
    if (! Array.isArray(aliases)) {
        aliases = [aliases];
    }
    
    this.aliases[cmd] = (this.aliases[cmd] || []).concat(aliases);
};

CleaverRepl.prototype.command = function(cmd, handler) {
    var repl = this;
    
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

CleaverRepl.prototype.getHelp = function(command) {
    this.cleaver.out('Always brush your teeth\n');
};

module.exports = function(cleaver, prompt, opts) {
    
    function quit() {
        process.exit();
    }
    
    // ensure we have opts
    opts = opts || {};
    
    // set the increment to 0
    cleaver.increment = 0;
    
    // create the repl
    var repl = new CleaverRepl(cleaver);

    // filter the input from the repl, and replace the first space with a .
    cleaver.filter(function(input) {
        var fields = input.split(/\s/),
            command = fields[0];
        
        // check to see if the field matches an alias
        if (command) {
            for (var key in repl.aliases) {
                if (repl.aliases[key].indexOf(command) >= 0) {
                    command = key;
                    break;
                }
            }
        }

        return command + '.' + fields.slice(1).join(' ');
    });
    
    // queue the prompt
    if (cleaver.rli) {
        cleaver.rli.setPrompt((prompt || '>') + ' ');
    }
    
    cleaver.prompt(prompt || '>');
    
    // some default command mappings
    cleaver
        .receive('help', function(input) {
            repl.getHelp(input);
        })
        .receive('quit', quit)
        .receive('exit', quit)
        ._bindHandler('nomatch', function(input) {
            this.out('Unknown command: ' + input + '\n');
        });
    
    // on end, quit the process
    // cleaver.end(process.exit);
    
    return repl;
};