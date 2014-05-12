## Getting Started

This guide will walk you through the process of creating a simple interactive command line script using climate.

### Prompting for Data

If you are writing an interactive console script or application, then it's likely you will be asking your users for data at some point in time. In climate this is done using the ``prompt`` function, e.g.:

<<< examples/getting-started/01-prompting.js

Running this example, would simply display the prompt "How are you?", wait for your response (a single line entry, ending with a carriage return) and then exit.  Not particularly useful, but it's a start.

### Receiving Responses

To do something with a response returned from a user, you simply start adding receive handlers:

<<< examples/getting-started/02-simple-receive.js

Additionally, because climate uses `eve` eventing under the hood, simple wildcard matching is also supported:

<<< examples/getting-started/03-wildcard-receive.js

### Using Fallback Response Handlers

While you can use wildcard response handlers to deal with unexpected response conditions, fallback response handlers are a more effective way to do this:

<<< examples/getting-started/04-fallback-handlers.js

So in the example above, if you respond with "well" then receive the response for that specific condition.  Any other response will receive the fallback response.

These three concepts of prompting, handling expected responses and using fallback handlers cover the core functionality of climate.
