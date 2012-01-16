var debug = require('debug')('repl'),
    reDelimiter = /\s|\,/;

function CleaverRepl(cleaver) {
    this.cleaver = cleaver;
    this.aliases = {};
    this.help = {};
} // CleaverRepl

CleaverRepl.prototype.alias = function(cmd, aliases) {
    if (! Array.isArray(aliases)) {
        aliases = [aliases];
    }
    
    this.aliases[cmd] = (this.aliases[cmd] || []).concat(aliases);
};

CleaverRepl.prototype.command = function(cmd, handler, helpText) {
    var repl = this;
    
    // handle the command with no args
    debug('registering command handler for command: ' + cmd);
    this.cleaver.receive(cmd, function(input) {
        input = (input || '').slice(cmd.length + 1);
        
        if (typeof handler == 'function') {
            return handler.apply(repl, input.split(/reDelimiter/));
        }
        else {
            return false;
        }
    });
    
    // TODO: register the command so it can be reported on with the help command
    
    // register the help text
    if (helpText) {
        this.help[cmd] = helpText;
    }
    
    return this;
};

CleaverRepl.prototype.getHelp = function(command) {
    if (! command) {
        return this.cleaver.out('TODO: list the commands\n');
    }
    
    // resolve the alias
    var realCommand = this.resolveAlias(command);
    
    // if we have a command, look for help for that command
    if (realCommand && this.help[realCommand]) {
        return this.cleaver.out(this.help[realCommand] + '\n');
    }
    else {
        return this.cleaver.out('No help found for command: ' + command + '\n');
    }
};

CleaverRepl.prototype.resolveAlias = function(command) {
    // check to see if the field matches an alias
    if (command) {
        for (var key in this.aliases) {
            if (this.aliases[key].indexOf(command) >= 0) {
                command = key;
                break;
            }
        }
    }
    
    return command;
};

CleaverRepl.prototype.run = function(text) {
    // if we received some text, then run
    if (text) {
        debug('running: ' + text);
        this.cleaver._queueLine(text);
    }
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
            command = repl.resolveAlias(fields[0]);
        
        return command + '.' + fields.slice(1).join(' ');
    });
    
    // queue the prompt
    if (cleaver.rli) {
        cleaver.rli.setPrompt((prompt || '>') + ' ');
    }
    
    cleaver.prompt(prompt || '>');
    
    // some default command mappings
    cleaver
        .receive('', function() {}) // reject empty lines
        .receive('quit', quit)
        .receive('exit', quit)
        ._bindHandler('nomatch', function(input) {
            this.out('Unknown command: ' + input + '\n');
        });
    
    // register the help command
    repl.command('help', function(command) {
        repl.getHelp(command);
    });
    
    return repl;
};