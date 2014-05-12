var climate = require('climate');

climate.prompt('How are you?');
climate.receive('*', function(input) {
  climate.out('I see you are ' + input + '\n');
});
