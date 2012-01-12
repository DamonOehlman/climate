function CleaverRepl(cleaver) {
    this.cleaver = cleaver;
} // CleaverRepl

CleaverRepl.prototype.command = function() {
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
    // this.end(process.exit);
    
    return new CleaverRepl(cleaver);
};