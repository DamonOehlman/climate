var climate = require('climate'),
    path = require('path');

climate
    .repl('testrepl>')
    .loadActions(path.resolve(__dirname, 'actions'));
