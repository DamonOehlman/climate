var climate = require('climate');

climate
  .prompt('How are you?')
  .receive('*', function(input) {
    console.log('I see you are ' + input);
  })
  .receive('great', function() {
    console.log('That\'s great!!');
  })
  .end(process.exit);
