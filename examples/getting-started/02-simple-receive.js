var climate = require('climate');
climate.prompt('How are you?');

climate.receive('well', function() {
    climate.out('Great to see you are well\n');
});