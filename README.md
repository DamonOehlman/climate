# cleave

Because I'm frustrated with number of dependencies that existing prompt, cli, etc libraries have.

This is very alpha, experimental, etc, i.e. I wouldn't use it at the moment.

## Example Usage

```js
var cleave = require('cleave');

cleave
    .prompt('How are you?')
    .on('great', function() {
        console.log('That\'s great!!');
    })
    .fallback(function() {
        console.log('I guess that\'s ok...');
    })
    .end(process.exit);
```