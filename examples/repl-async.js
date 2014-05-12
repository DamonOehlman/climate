var climate = require('..');

climate
  .repl('test prompt>')
  .command('wait', function(time) {
    var waitTime = parseInt(time || 50, 10);
    console.log('waiting for ' + waitTime + 'ms');

    return function(callback) {
      setTimeout(callback, waitTime);
    };
  });
