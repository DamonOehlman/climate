var Cleaver = require('./lib/cleaver'),
    defaultInstance = new Cleaver();

// attach the done handler to the default instasnce
defaultInstance.once('done', function() {
    process.exit();
});

// export the default instance as the default cleave
exports = module.exports = defaultInstance;

exports.attach = function(input, output) {
    return new Cleaver(input, output);
};