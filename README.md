# climate

Created because (rightly *or* wrongly) I'm frustrated with number of
dependencies that existing prompt, cli, etc libraries have.  There's
some great ideas out there, but I'm not really up for having a page
of dependencies install for a library that could be included as part
of a cli script.

This is very alpha, experimental, etc, and parts of it will almost
certainly change.


[![NPM](https://nodei.co/npm/climate.png)](https://nodei.co/npm/climate/)


## Example Usage

```js
var climate = require('climate');

climate
  .prompt('How are you?')
  .receive('great', function() {
    console.log('That\'s great!!');
  })
  .prompt('How old are you?')
  .receive('*', function(input) {
    console.log(input + ' eh?');
  })
  .end(process.exit);

```

The above example will also work quite happily if provided the input
as STDIN:

```
node examples/multiquestion.js < examples/multiquestion.in.txt
```

## License(s)

### MIT

Copyright (c) 2014 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
