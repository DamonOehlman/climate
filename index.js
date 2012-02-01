var Climate = require('./lib/climate'),
    defaultInstance = new Climate();

// attach the done handler to the default instasnce
defaultInstance.once('done', function() {
    process.exit();
});

// export the default instance as the default climate instance
exports = module.exports = defaultInstance;

exports.attach = function(input, output) {
    return new Climate(input, output);
};