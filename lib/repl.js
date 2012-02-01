var debug = require('debug')('repl'),
    fs = require('fs'),
    path = require('path'),
    reDelimiter = /\s|\,/;

function ClimateRepl(climate) {
    this.climate = climate;
    this.aliases = {};
    this.help = {};
} // ClimateRepl

ClimateRepl.prototype.alias = function(cmd, aliases) {
    if (! Array.isArray(aliases)) {
        aliases = [aliases];
    }
    
    this.aliases[cmd] = (this.aliases[cmd] || []).concat(aliases);
};

ClimateRepl.prototype.command = function(cmd, handler, helpText) {
    var repl = this;
    
    // handle the command with no args
    debug('registering command handler for command: ' + cmd);
    this.climate.receive(cmd, function(input) {
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

ClimateRepl.prototype.getHelp = function(command) {
    if (! command) {
        return this.climate.out('TODO: list the commands\n');
    }
    
    // resolve the alias
    var realCommand = this.resolveAlias(command);
    
    // if we have a command, look for help for that command
    if (realCommand && this.help[realCommand]) {
        return this.climate.out(this.help[realCommand] + '\n');
    }
    else {
        return this.climate.out('No help found for command: ' + command + '\n');
    }
};

ClimateRepl.prototype.history = function(targetFile) {
    // TODO: implement repl history
    // considering writing to a file in the cleave directory structure, but aware
    // that permissions may not allow it.
    // maybe should write to something in /tmp or ~/ instead with filename 
    // the name of the prompt (minus special characters?)
    
    return this;
};

ClimateRepl.prototype.loadActions = function(dir, callback) {
    var repl = this;
    
    fs.readdir(dir, function(err, files) {
        (files || []).forEach(function(file) {
            var module = path.basename(file, '.js');
            if (module !== file) {
                repl.command(module, require(path.resolve(dir, file)));
            }
        });
        
        if (callback) {
            callback();
        }
    });
    
    return this;
};

ClimateRepl.prototype.resolveAlias = function(command) {
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

ClimateRepl.prototype.run = function(text) {
    var climate = this.climate;
    
    // if we received some text, then run
    if (Array.isArray(text)) {
        text.forEach(function(item) {
            climate._queueLine(item);
        });
    }
    else if (text) {
        climate._queueLine(text);
    }
};

module.exports = function(climate, prompt, opts) {
    
    function quit() {
        climate.out('\n');
        process.exit();
    }
    
    // ensure we have opts
    opts = opts || {};
    
    // set the increment to 0
    climate.increment = 0;
    
    // create the repl
    var repl = new ClimateRepl(climate);

    // filter the input from the repl, and replace the first space with a .
    climate.filter(function(input) {
        var fields = input.split(/\s/),
            command = repl.resolveAlias(fields[0]);
        
        return command + '.' + fields.slice(1).join(' ');
    });
    
    // queue the prompt
    if (climate.rli) {
        climate.rli.setPrompt((prompt || '>') + ' ');
    }
    
    climate.prompt(prompt || '>');
    
    // some default command mappings
    climate
        .receive('', function() {}) // reject empty lines
        .receive('quit', quit)
        .receive('exit', quit)
        ._bindHandler('nomatch', function(input) {
            climate.out('Unknown command: ' + input + '\n');
        });
    
    // register the help command
    repl.command('help', function(command) {
        repl.getHelp(command);
    });
    
    return repl;
};