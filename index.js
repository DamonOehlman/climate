var Climate = require('./lib/climate');
var defaultInstance = new Climate();

/**
  # climate

  Created because (rightly *or* wrongly) I'm frustrated with number of
  dependencies that existing prompt, cli, etc libraries have.  There's
  some great ideas out there, but I'm not really up for having a page
  of dependencies install for a library that could be included as part
  of a cli script.

  This is very alpha, experimental, etc, and parts of it will almost
  certainly change.

  ## Example Usage

  <<< examples/multiquestion.js
**/

// attach the done handler to the default instasnce
defaultInstance.once('done', function() {
  process.exit();
});

// export the default instance as the default climate instance
exports = module.exports = defaultInstance;

exports.attach = function(input, output) {
  return new Climate(input, output);
};
