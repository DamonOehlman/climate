var debug = require('debug')('climate'),
    events = require('events'),
    tty = require('tty'),
    util = require('util'),
    repl = require('./repl'),
    rl = require('readline'),
    _rli,
    reTrailingNewline = /[\n\r]$/,
    counter = 0,
    RUN_DELAY = 50; // the time we wait before running the runner (allows the stdin time to be piped in)
    
// helper functions

function _configureStreams(instance, input, output) {
    
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
        // if not paused, then deal with the line
        // otherwise ignore it as it's possible a subinstance is dealing with the input
        if (! instance.paused) {
            instance._queueLine(data);
        }
    }
    
    // resume the stream
    instance.input.resume();

    // monitor the input stream
    instance.input.setEncoding('utf8');

    if (instance.input.isTTY) {
        // create the readline interface
        instance.rli = _rli || (_rli = rl.createInterface(instance.input, output || process.stdout));
        // process.stdin.setRawMode(true);
        // instance.input._handle.setRawMode(true);
        
        instance.rli.on('line', instance.handlers.line = processLine);

        // on ^C exit
        instance.input.on('keypress', instance.handlers.keypress = function(chr, key) {
            if (key && key.ctrl && key.name == 'c') {
                instance.out('\n');
                process.exit();
            }
        });
    }
    else {
        instance.input.on('data', instance.handlers.data = handleData);
    }
    
    instance.input.on('end', instance.handlers.end = function() {
        // parse the buffer and process the remaining fragments
        if (! willParse) {
            parseBuffer(true);
        }
        
        instance.ended = true;
        if (instance.actions.length > 0) {
            debug('stdin ended - we have more to do...');
        }
    });
}

function _makeOut(output) {
    output = output || process.stdout;
    return function(text) {
        output.write(text);
    };
};

var Climate = module.exports = function(input, output) {
    debug('creating climate instance, input = ' + (input ? 'custom stream' : 'stdin'));

    this.input = input || process.stdin;
    this.output = output || process.stdout;
    this.out = _makeOut(this.output);
    this.actions = [];
    this.lines = [];
    this.increment = 1;
    this.paused = false;

    this.ready = false;
    this.ended = false;

    this.queueMon = require('piper')();
    this.pendingFilters = [];
    
    // create the handlers object that will keep references to input and rli event handlers
    // these will be cleaned up in the close function
    this.handlers = {};
    
    // initialise the current action
    this.current = null;
    
    // initialise the echo function to null
    this.echo = null;
    
    _configureStreams(this, input, output);
};

util.inherits(Climate, events.EventEmitter);

Climate.prototype._next = function(spliceCount) {
    var nextAction,
        instance = this;
    
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
    if (nextAction && (! this.paused)) {
        debug('current action has ' + nextAction.fallbacks.length + ' fallback handlers');
        
        // remove the pipe to prevent processing until we are running again
        this.pipe = null;
        
        // TODO: automatically remove actions with an invalid runner
        this._nextTimeout = setTimeout(function() {
            // update the pipe
            instance.pipe = nextAction.pipe;
            
            // run the action
            if (nextAction.run) {
                // flag ready
                instance.queueMon('ready');
                instance.ready = true;
                
                // trigger the next event
                nextAction.run();

                // if we have data lines, then shift the next one off and process
                if (instance.lines.length > 0) {
                    // get the next line
                    var nextLine = instance.lines.shift();
                    debug('queuing next line: ' + nextLine);

                    instance._queueLine(nextLine);
                }
            }
            // otherwise, goto the next action
            else {
                instance._next();
            }
        }, RUN_DELAY);
    }
    else if (this.paused) {
        // if we have no resume listeners, then listen
        if (this.listeners('resume').length == 0) {
            this.once('resume', function() {
                instance._next(0);
            });
        }
    }
    else {
        this.emit('done');
    }
    
    return this;
};

Climate.prototype._bindHandler = function(name, handler) {
    
    var lastAction = this.actions[this.actions.length - 1];
    
    debug('attempting to bind handler "' + name + '", to action index: ' + (this.actions.length - 1));
    if (lastAction && lastAction.pipe) {
        lastAction.pipe.on(name, handler);
    }
    
    // return this for chainability
    return this;
};

Climate.prototype._queue = function(action, runner) {
    var lastAction = this.actions[this.actions.length - 1];
    debug('queuing action: ' + action);
    
    // if we have a last action, and it has no fallbacks, then add one now
    if (lastAction && lastAction.fallbacks.length === 0) {
        debug('last action (' + lastAction.action + ') does not have a fallback, politely adding one');
        this.fallback();
    }
    
    this.actions.push({
        action: action,
        pipe: require('piper')(),
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

Climate.prototype._queueLine =  function(data) {
    if (this.ready) {
        this._processInput(data);
    }
    else {
        debug('queuing data line: ' + data);
        this.lines.push(data);
    }
};

Climate.prototype._processInput = function(line) {

    var instance = this,
        args = Array.prototype.slice.call(arguments, 1);
    
    function process() {
        var listeners,
            checker,
            filters = instance.current ? instance.current.filters : [],
            action;
            
        // filter the line
        // if we have filters, then run then now
        (filters || []).forEach(function(filter) {
            line = filter(line);
        });
        
        // initialise the action to the line
        action = line;
        
        // get the listeners for the line
        listeners = instance.pipe.listeners(line);
    
        // if we have no listeners, remap the line to 'nomatch'
        if (listeners.length === 0) {
            action = 'nomatch';
        }
        
        // flag not ready
        instance.ready = false;

        // get the listeners for the event
        checker = instance.pipe.check.apply(instance.pipe, [action, line].concat(args));
        debug('triggered event: ' + line);

        // on pass, go on
        checker.on('pass', function() {
            debug('checker passed, moving to the next event');
            
            // do the next event
            instance._next();
        });

        // on fail, replay the event
        checker.on('fail', function() {
            debug('checker failed, replaying current action');
            
            // replay the current action
            instance._next(0);
        });
    }
    
    if (this.pipe) {
        process();
    }
    else {
        debug('no pipe ready, waiting');
        this.queueMon.once('ready', process);
    }
};

// ## public method

Climate.prototype.close = function() {
    var rliHandlers = ['line'];
    
    // iterate through the handlers
    for (var key in this.handlers) {
        if (rliHandlers.indexOf(key) >= 0) {
            this.rli.removeListener(key, this.handlers[key]);
        }
        else {
            this.input.removeListener(key, this.handlers[key]);
        }
    }
    
    // reset the handlers
    this.handlers = {};
};

Climate.prototype.fallback = function(callback) {
    var instance = this,
        lastAction = this.actions[this.actions.length - 1];
        
    // add the fallback to the list of fallbacks
    if (lastAction) {
        lastAction.fallbacks.push(callback);
    }
    
    return this._bindHandler('nomatch', callback || function() {});
};

Climate.prototype.filter = function(handler) {
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

Climate.prototype.fork = function() {
    var subInstance = require('../').attach(this.input, this.output);
        instance = this;
    
    this.pause();
    subInstance.once('done', function() {
        this.close();
        instance.resume();
    });
    
    // create a new instance to deal with the prompt
    return subInstance;
};

Climate.prototype.end = function(callback) {
    return this._queue('end', callback);
};

Climate.prototype.receive = function(input, callback) {
    return this._bindHandler(input, callback);
};

Climate.prototype.prompt = function(text, maskChar) {
    var instance = this;
    
    return this._queue('prompt', function() {
        // only write output if the input stream exists
        if (instance.rli) {
            debug('writing: ' + text);
            instance.rli.setPrompt(text + ' ');
            instance.rli.prompt();
        }
    });
};

Climate.prototype.repl = function(prompt, opts) {
    return repl(this, prompt, opts);
};

Climate.prototype.pause = function() {
    if (! this.paused) {
        this.paused = true;
        this.emit('pause');
    }
};

Climate.prototype.resume = function() {
    if (this.paused) {
        this.paused = false;
        this.emit('resume');
    }
};