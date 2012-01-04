var debug = require('debug')('cleave'),
    tty = require('tty'),
    eve = require('./eve'),
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
        var evtId = cleaver._nsevent(data),
            listeners = eve.listeners(evtId);

        debug('received data: ' + data + ', event = ' + evtId + ', ' + listeners.length + ' event listeners found');
        if (listeners.length > 0) {
            cleaver._processAction(data, data);
        }
        else {
            cleaver._processAction('nomatch');
        }
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
    
    this.id = 'cleaver' + (counter++);
    this.input = input || process.stdin;
    this.out = _makeOut(outputs);
    this.actions = [];
    
    this.rawMode = false;
    
    // initialise the echo function to null
    this.echo = null;
    
    _configureInput(this);
};

Cleaver.prototype._next = function(spliceCount) {
    var nextAction;
    
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
        // bind the event handlers
        nextAction.binders.forEach(function(binder) {
            binder();
        });
        
        debug('current action has ' + nextAction.fallbacks.length + ' fallback handlers');
                
        // TODO: automatically remove actions with an invalid runner
        this._nextTimeout = setTimeout(nextAction.run, RUN_DELAY);
    }
    
    return this;
};

Cleaver.prototype._bindHandler = function(name, handler) {
    
    var cleaver = this;
    
    function bindEve() {
        // register the event handler
        eve.on(cleaver._nsevent(name), handler);
    }
    
    // if we have more than 1 action in the actions queue, then 
    // queue these events
    if (this.actions.length > 1) {
        this.actions[this.actions.length - 1].binders.push(bindEve);
    }
    else {
        bindEve();
    }
    
    // return this for chainability
    return this;
};

Cleaver.prototype._nsevent = function(name) {
    return this.id + (this.actions.length ? '.' + this.actions[0].action : '') + '.' + name;
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

Cleaver.prototype._processAction = function(name) {
    var evtId = this._nsevent(name),
        listeners = eve.listeners(evtId),
        results;
    
    // get the listeners for the event
    results = eve.apply(eve, [this._nsevent(name), this].concat(Array.prototype.slice.call(arguments, 1)));
    debug('triggered event: ' + evtId + ', got results: ' + util.inspect(results));
    
    // TODO: check the results (falsy values, go back, functions wait for a callback)
    
    // manually remove listeners while npm contains eve 0.2.4
    listeners.forEach(function(listener) {
        eve.unbind(evtId, listener);
    });
    
    // remove the wildcard listener also
    eve.unbind(this._nsevent('*'));
    
    // remove the no match handler
    eve.unbind(this._nsevent('nomatch'));
    
    // do the next event
    this._next();
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