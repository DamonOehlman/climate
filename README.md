# cleave

_cli + eve_

Created because (rightly -or- wrongly) I'm frustrated with number of dependencies that existing prompt, cli, etc libraries have.  There's some great ideas out there, but I'm not really up for having a page of dependencies install for a library that could be included as part of a cli script.

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

## General Principles

- Should work with streams other than `process.stdin`
- Should expect only the stdin stream, not necessarily a tty
- Should be able to pipe and redirect stdin using both `|` and `<`
- You choose to color your world, not me

For the most part, these work - feel free to try it:

```
node examples/simple < examples/simple.in.txt
```

AND

```
echo great | node examples/simple.js
```

__I'm sure there are still heaps of things to consider, but it's a start.__