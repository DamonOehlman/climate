var debug = require('debug')('cleave'),
    tty = require('tty'),
    util = require('util'),
    repl = require('./repl'),
    reTrailingNewline = /[\n\r]$/,
    counter = 0,
    RUN_DELAY = 50; // the time we wait before running the runner (allows the stdin time to be piped in)
    
// helper functions

function _configureInput(cleaver) {
    
    var buffer = '',
        willParse = false;
        
    function handleData(data) {
        buffer += data;
        
        // parse the buffer on the next tick
        if (! willParse) {
            process.nextTick(parseBuffer);
        }
    } // handleData
    
    function parseBuffer(processRemaining) {
        // if the buffer has a new line
        if (buffer && (reTrailingNewline.test(buffer) || processRemaining)) {
            buffer.replace(reTrailingNewline, '').split(/\n/).forEach(processLine);
            
            // reset the buffer
            buffer = '';
        }
        
        // flag the will parse to false
        willParse = false;
    }
    
    function processLine(data) {
        cleaver._queueLine(data);
    }
    
    // resume the stream
    cleaver.input.resume();

    // monitor the input stream
    cleaver.input.setEncoding('utf8');

    if (cleaver.input.isTTY) {
        tty.setRawMode(true);
        // cleaver.input._handle.setRawMode(true);
        
        cleaver.input.on('keypress', function(chr, key) {
            cleaver.out(chr);
            handleData(chr);
        });
    }
    else {
        cleaver.input.on('data', handleData);
    }
    
    cleaver.input.on('end', function() {
        // parse the buffer and process the remaining fragments
        if (! willParse) {
            parseBuffer(true);
        }
        
        cleaver.ended = true;
        if (cleaver.actions.length > 0) {
            debug('stdin ended - we have more to do...');
        }
    });
}

function _makeOut(outputs) {
    return function(text) {
        (outputs || [process.stdout]).forEach(function(output) {
            output.write(text);
        });
    };
};

var Cleaver = module.exports = function(input, outputs) {
    debug('creating cleaver input = ' + (input ? 'custom stream' : 'stdin'));

    this.input = input || process.stdin;
    this.out = _makeOut(outputs);
    this.actions = [];
    this.lines = [];
    this.increment = 1;

    this.ready = false;
    this.ended = false;
    this.rawMode = false;

    this.queueMon = require('sleeve')();
    this.pendingFilters = [];
    
    // initialise the current action
    this.current = null;
    
    // initialise the echo function to null
    this.echo = null;
    
    _configureInput(this);
};

Cleaver.prototype._next = function(spliceCount) {
    var nextAction,
        cleaver = this;
    
    // remove the first and action
    this.actions.splice(0, typeof spliceCount != 'undefined' ? spliceCount : this.increment);
    
    // clear the next timeout
    clearTimeout(this._nextTimeout);
    
    // reset the echo function
    this.echo = null;
    
    // get the next action
    nextAction = this.current = this.actions[0];
    
    // if we have actions remaining, then run it
    debug('attempting to move to the next event, we have ' + this.actions.length + ' remaining actions');
    if (nextAction) {
        debug('current action has ' + nextAction.fallbacks.length + ' fallback handlers');
        
        // remove the sleeve to prevent processing until we are running again
        this.sleeve = null;
        
        // TODO: automatically remove actions with an invalid runner
        this._nextTimeout = setTimeout(function() {
            // update the sleeve
            cleaver.sleeve = nextAction.sleeve;
            
            // run the action
            if (nextAction.run) {
                // flag ready
                cleaver.queueMon('ready');
                cleaver.ready = true;
                
                // trigger the next event
                nextAction.run();

                // if we have data lines, then shift the next one off and process
                if (cleaver.lines.length > 0) {
                    // get the next line
                    var nextLine = cleaver.lines.shift();
                    debug('queuing next line: ' + nextLine);

                    cleaver._queueLine(nextLine);
                }
            }
            // otherwise, goto the next action
            else {
                cleaver._next();
            }
        }, RUN_DELAY);
    }
    
    return this;
};

Cleaver.prototype._bindHandler = function(name, handler) {
    
    var lastAction = this.actions[this.actions.length - 1];
    
    debug('attempting to bind handler "' + name + '", to action index: ' + (this.actions.length - 1));
    if (lastAction && lastAction.sleeve) {
        lastAction.sleeve.on(name, handler);
    }
    
    // return this for chainability
    return this;
};

Cleaver.prototype._queue = function(action, runner) {
    var lastAction = this.actions[this.actions.length - 1];
    debug('queuing action: ' + action);
    
    // if we have a last action, and it has no fallbacks, then add one now
    if (lastAction && lastAction.fallbacks.length === 0) {
        debug('last action (' + lastAction.action + ') does not have a fallback, politely adding one');
        this.fallback();
    }
    
    this.actions.push({
        action: action,
        sleeve: require('sleeve')(),
        run: runner,
        fallbacks: [],
        filters: this.pendingFilters,
        binders: []
    });
    
    // reset the pending filters
    this.pendingFilters = [];
    
    // if this is the first action, then run it
    if (this.actions.length === 1) {
        this._next(0);
        // this._nextTimeout = setTimeout(this.actions[0].run, RUN_DELAY);
    }
    
    return this;
};

Cleaver.prototype._queueLine =  function(data) {
    if (this.ready) {
        this._processInput(data);
    }
    else {
        debug('queuing data line: ' + data);
        this.lines.push(data);
    }
};

Cleaver.prototype._processInput = function(line) {

    var cleaver = this,
        args = Array.prototype.slice.call(arguments, 1);
    
    function process() {
        var listeners,
            checker,
            filters = cleaver.current ? cleaver.current.filters : [],
            action;
            
        // filter the line
        // if we have filters, then run then now
        (filters || []).forEach(function(filter) {
            line = filter(line);
        });
        
        // initialise the action to the line
        action = line;
        
        // get the listeners for the line
        listeners = cleaver.sleeve.listeners(line);
    
        // if we have no listeners, remap the line to 'nomatch'
        if (listeners.length === 0) {
            action = 'nomatch';
        }
        
        // flag not ready
        cleaver.ready = false;

        // get the listeners for the event
        checker = cleaver.sleeve.check.apply(cleaver.sleeve, [action, cleaver, line].concat(args));
        debug('triggered event: ' + line);

        // on pass, go on
        checker.on('pass', function() {
            debug('checker passed, moving to the next event');
            
            // do the next event
            cleaver._next();
        });

        // on fail, replay the event
        checker.on('fail', function() {
            debug('checker failed, replaying current action');
            
            // replay the current action
            cleaver._next(0);
        });
    }
    
    if (this.sleeve) {
        process();
    }
    else {
        debug('no sleeve ready, waiting');
        this.queueMon.once('ready', process);
    }
};

Cleaver.prototype.fallback = function(callback) {
    var cleaver = this,
        lastAction = this.actions[this.actions.length - 1];
        
    // add the fallback to the list of fallbacks
    if (lastAction) {
        lastAction.fallbacks.push(callback);
    }
    
    return this._bindHandler('nomatch', callback || function() {});
};

Cleaver.prototype.filter = function(handler) {
    var lastAction = this.actions[this.actions.length - 1];
        
    // add the fallback to the list of fallbacks
    if (lastAction) {
        debug('registered filter against last action');
        lastAction.filters.push(handler);
    }
    else {
        debug('registered pending filter');
        this.pendingFilters.push(handler);
    }
    
    return this;
};

Cleaver.prototype.end = function(callback) {
    return this._queue('end', callback);
};

Cleaver.prototype.on = function(input, callback) {
    return this._bindHandler(input, callback);
};

Cleaver.prototype.prompt = function(text, maskChar) {
    var cleaver = this;
    
    return this._queue('prompt', function() {
        // assign the mask char to the appropriate character
        if (maskChar) {
            cleaver.echo = function(output) {
                if (output) {
                    for (var ii = output.length; ii--; ) {
                        cleaver.out(maskChar);
                    }
                }
            };
        }

        // only write output if the input stream exists
        debug('writing: ' + text);
        if (!cleaver.ended && cleaver.input && !cleaver.input.destroyed) {
            // FIXME: hacky - if the application is attempting to handle sigint we just broke it.
            process.removeAllListeners('SIGINT');
            process.on('SIGINT', function() {
                cleaver.out('\n');
                process.exit();
            });
            
            cleaver.out(text + ' ');
        }
    });
};

Cleaver.prototype.repl = function(prompt, opts) {
    return repl(this, prompt, opts);
};