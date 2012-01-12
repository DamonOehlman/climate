function CleaverRepl(cleaver) {
    this.cleaver = cleaver;
} // CleaverRepl

CleaverRepl.prototype.command = function(cmd, handler) {
    this.cleaver.on(cmd + '.*', function(input) {
        console.log(input);
    });
    
    return this;
};

module.exports = function(cleaver, prompt, opts) {
    
    function quit() {
        this.increment = 1;
    }
    
    // ensure we have opts
    opts = opts || {};
    
    // set the increment to 0
    cleaver.increment = 0;
    
    // filter input text
    cleaver.filter(function(input) {
        console.log('got input: ' + input);
        return input + 'it';
    });
    
    // queue the prompt
    cleaver.prompt(prompt);
    
    // some default command mappings
    cleaver
        .on('quit', quit)
        .on('exit', quit)
        ._bindHandler('nomatch', function(input) {
            this.out('Unknown command: ' + input + '\n');
        });
    
    // on end, quit the process
    cleaver.end(process.exit);
    
    return new CleaverRepl(cleaver);
};