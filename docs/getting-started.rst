===============
Getting Started
===============

This guide will walk you through the process of creating a simple interactive command line script using cleave.

Installation
============

First, you will have to install the ``cleave`` package into the package you are building.  If you are using `npm`__ then this is done very simply::

    npm install cleave
    
.. highlight:: javascript

Once done, you will be able to create a script in your project that makes use of the cleave library.  Simply require the library in as you would any other node module::

    var cleave = require('cleave');

__ http://npmjs.org/

Prompting for Data
==================

If you are writing an interactive console script or application, then it's likely you will be asking your users for data at some point in time. In cleave this is done using the ``prompt`` function, e.g.::

    cleave.prompt('How are you?');


Example Usage
=============

.. code-block:: javascript

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