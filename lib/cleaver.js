var debug = require('debug')('cleave'),
    tty = require('tty'),
    eve = require('eve'),
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
            cleaver.emit(data, data);
        }
        else {
            cleaver.emit('nomatch');
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
    
    this.id = 'cleaver' + (counter++);
    this.input = input || process.stdin;
    this.out = _makeOut(outputs);
    this.actions = [];
    
    this.rawMode = false;
    
    // initialise the echo function to null
    this.echo = null;
    
    _configureInput(this);
};

Cleaver.prototype._next = function() {
    // remove the first and action
    this.actions.splice(0, 1);
    
    // clear the next timeout
    clearTimeout(this._nextTimeout);
    
    // if we have actions remaining, then run it
    debug('attempting to move to the next event, we have ' + this.actions.length + ' remaining actions');
    if (this.actions.length > 0) {
        // bind the event handlers
        this.actions[0].binders.forEach(function(binder) {
            binder();
        });
        
        // TODO: automatically remove actions with an invalid runner
        // TODO: validate that nextTick should be used
        this._nextTimeout = setTimeout(this.actions[0].run, RUN_DELAY);
    }
    else {
        this.emit('end');
    }
    
    return this;
};

Cleaver.prototype._nsevent = function(name) {
    return this.id + (this.actions.length ? '.' + this.actions[0].action : '') + '.' + name;
};

Cleaver.prototype._queue = function(action, runner) {
    this.actions.push({
        action: action,
        run: runner,
        binders: []
    });
    
    // if this is the first action, then run it
    if (this.actions.length === 1) {
        this._nextTimeout = setTimeout(this.actions[0].run, RUN_DELAY);
    }
    
    return this;
};

Cleaver.prototype.emit = function(name) {
    var evtId = this._nsevent(name),
        listeners = eve.listeners(evtId);
    
    // get the listeners for the event
    debug('triggering event: ' + evtId);
    eve.apply(eve, [this._nsevent(name), this].concat(Array.prototype.slice.call(arguments, 1)));
    
    // manually remove listeners while npm contains eve 0.2.4
    listeners.forEach(function(listener) {
        eve.unbind(evtId, listener);
    });
};

Cleaver.prototype.fallback = function(callback) {
    var cleaver = this;
    
    eve.on(this._nsevent('nomatch'), function() {
        callback.apply(cleaver, Array.prototype.slice.call(arguments));

        // do the next event
        cleaver._next();
    });
    
    
    return this;
};

Cleaver.prototype.end = function(callback) {
    eve.on(this.id + '.end', function() {
        debug('triggering end');
        callback();
    });
    
    return this;
};

Cleaver.prototype.on = function(input, callback) {
    var cleaver = this;
    
    function bindEve() {
        // register the event handler
        eve.on(cleaver._nsevent(input), function() {
            callback.apply(cleaver, Array.prototype.slice.call(arguments));

            // remove the no match handler
            eve.unbind(this._nsevent('nomatch'));

            // splice the first action of the actions array
            cleaver._next();
        });
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

Cleaver.prototype.prompt = function(text, maskChar) {
    var cleaver = this;
    
    debug('queuing prompt with text: ' + text);
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