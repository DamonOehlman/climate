var Cleaver = require('./lib/cleaver');

exports = module.exports = new Cleaver();

exports.attach = function(input, output) {
    return new Cleaver(input, output);
};