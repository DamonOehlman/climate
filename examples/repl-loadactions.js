var climate = require('..');
var path = require('path');

climate
  .repl('testrepl>')
  .loadActions(path.resolve(__dirname, 'actions'));
