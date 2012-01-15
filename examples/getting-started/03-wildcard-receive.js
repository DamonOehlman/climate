var cleave = require('cleave');
cleave.prompt('How are you?');

cleave.receive('*', function(input) {
    cleave.out('I see you are ' + input + '\n');
});