var Cleaver = require('./lib/cleaver');

exports = module.exports = new Cleaver();

exports.attach = function(input, outputs) {
    return new Cleaver(input, outputs);
};