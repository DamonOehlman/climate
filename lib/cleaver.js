var debug = require('debug')('cleave'),
    tty = require('tty'),
    util = require('util'),
    reTrailingNewline = /[\n\r]$/,
    counter = 0,
    RUN_DELAY = 50; // the time we wait before running the runner (allows the stdin time to be piped in)
    
// helper functions

function _configureInput(cleaver) {
    
    var buffer = '',
        willParse = false;
    
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
    cleaver.input.on('data', function(data) {
        // if we are in raw mode, then buffer data
        buffer += data;
        
        if (cleaver.rawMode && cleaver.echo) {
            cleaver.echo(data);
        }
        
        // parse the buffer on the next tick
        if (! willParse) {
            process.nextTick(parseBuffer);
        }
    });
    
    cleaver.input.on('end', function() {
        // parse the buffer and process the remaining fragments
        if (! willParse) {
            parseBuffer(true);
        }
        
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
    this.ready = false;
    
    this.rawMode = false;
    this.queueMon = require('sleeve')();
    
    // initialise the echo function to null
    this.echo = null;
    
    _configureInput(this);
};

Cleaver.prototype._next = function(spliceCount) {
    var nextAction,
        cleaver = this;
    
    // remove the first and action
    this.actions.splice(0, typeof spliceCount != 'undefined' ? spliceCount : 1);
    
    // clear the next timeout
    clearTimeout(this._nextTimeout);
    
    // reset the echo function
    this.echo = null;
    
    // set raw mode back to false
    this.setRawMode(false);
    
    // get the next action
    nextAction = this.actions[0];
    
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
                
                // if we have data lines, then shift the next one off and process
                if (cleaver.lines.length > 0) {
                    debug('processing next line: ' + cleaver.lines[0]);
                    cleaver._queueLine(cleaver.lines.shift());
                }
                
                // trigger the next event
                nextAction.run();
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
        binders: []
    });
    
    // if this is the first action, then run it
    if (this.actions.length === 1) {
        this._next(0);
        // this._nextTimeout = setTimeout(this.actions[0].run, RUN_DELAY);
    }
    
    return this;
};

Cleaver.prototype._queueLine =  function(data) {
    if (this.ready) {
        this._processAction(data, data);
    }
    else {
        debug('queuing data line: ' + data);
        this.lines.push(data);
    }
};

Cleaver.prototype._processAction = function(name) {

    var cleaver = this,
        args = Array.prototype.slice.call(arguments, 1);
    
    function process() {
        var listeners = cleaver.sleeve.listeners(name),
            checker;

        // if we have no listeners, remap the name to 'nomatch'
        if (listeners.length === 0) {
            name = 'nomatch';
        }
        
        // flag not ready
        cleaver.ready = false;

        // get the listeners for the event
        checker = cleaver.sleeve.check.apply(cleaver.sleeve, [name, cleaver].concat(args));
        debug('triggered event: ' + name);

        // on pass, go on
        checker.on('pass', function() {
            // do the next event
            cleaver._next();
        });

        // on fail, replay the event
        checker.on('fail', function() {
            console.log('failed');
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

Cleaver.prototype.end = function(callback) {
    return this._queue('end', callback);
};

Cleaver.prototype.on = function(input, callback) {
    return this._bindHandler(input, callback);
};

Cleaver.prototype.prompt = function(text, maskChar) {
    var cleaver = this;
    
    return this._queue('prompt', function() {
        cleaver.setRawMode(typeof maskChar != 'undefined');
        
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
        if (cleaver.input && !cleaver.input.destroyed) {
            cleaver.out(text + ' ');
        }
    });
};

Cleaver.prototype.setRawMode = function(goRaw) {
    // if we are dealing with stdin, then set raw mode
    if (this.input._handle && typeof this.input._handle.setRawMode == 'function') {
        this.rawMode = goRaw;
        this.input._handle.setRawMode(goRaw);
    }
};