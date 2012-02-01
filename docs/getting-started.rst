===============
Getting Started
===============

This guide will walk you through the process of creating a simple interactive command line script using climate.

Installation
============

First, you will have to install the ``climate`` package into the package you are building.  If you are using `npm`__ then this is done very simply::

    npm install climate
    
.. highlight:: javascript

Once done, you will be able to create a script in your project that makes use of the climate library.  Simply require the library in as you would any other node module::

    var climate = require('climate');

__ http://npmjs.org/

Prompting for Data
==================

If you are writing an interactive console script or application, then it's likely you will be asking your users for data at some point in time. In climate this is done using the ``prompt`` function, e.g.:

.. literalinclude:: ../examples/getting-started/01-prompting.js
    :emphasize-lines: 2

Running this example, would simply display the prompt "How are you?", wait for your response (a single line entry, ending with a carriage return) and then exit.  Not particularly useful, but it's a start.

Receiving Responses
===================

To do something with a response returned from a user, you simply start adding receive handlers:

.. literalinclude:: ../examples/getting-started/02-simple-receive.js
    :emphasize-lines: 4-6

Additionally, because climate uses `eve`__ eventing under the hood, simple wildcard matching is also supported:

.. literalinclude:: ../examples/getting-started/03-wildcard-receive.js
    :emphasize-lines: 4-6
    
__ http://dmitry.baranovskiy.com/eve/

Using Fallback Response Handlers
================================

While you can use wildcard response handlers to deal with unexpected response conditions, fallback response handlers are a more effective way to do this:

.. literalinclude:: ../examples/getting-started/04-fallback-handlers.js
    :emphasize-lines: 8-10

So in the example above, if you respond with "well" then receive the response for that specific condition.  Any other response will receive the fallback response.

These three concepts of prompting, handling expected responses and using fallback handlers cover the core functionality of climate.