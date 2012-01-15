var cleave = require('cleave');
cleave.prompt('How are you?');

cleave.receive('well', function() {
    cleave.out('Great to see you are well\n');
});