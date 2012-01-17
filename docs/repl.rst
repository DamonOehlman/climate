.. highlight:: javascript

.. _repl:

==============
REPL Interface
==============

Node's `repl`__ is great and offers a lot of great functionality, that said it does have some limitations.  Depending on the type of application that you are writing, you may find the REPL implemented in cleave a better fit.

__ http://nodejs.org/docs/latest/api/repl.html

.. _repl-create:

Creating a REPL
===============

Creating a REPL with cleave is really simple. The example below show's a trivial example:

.. literalinclude:: ../examples/repl.js

This example simply displays a prompt ``say hi`` which responds with varying results when you enter "hi", "hi Bob" or "hi something else".  Currently the REPL is case sensitive with commands so "HI Bob" will not work.

Prompting for Data within a REPL
================================

Within Cleave it's possible to create sub-instances which divert from the current prompt chain.  This is particularly useful when using REPL, as a REPL is essentially a non-incrementing :ref:`prompt chain <prompt-chains>`.

Consider the following example:

.. literalinclude:: ../examples/repl-prompting.js

When the repl receives the text ``hi``, it prompts for additional information. It does this by :ref:`forking <prompt-forking>` a new prompt.  This fork creates a new :ref:`prompt chain <prompt-chains>` and pauses the currently executing chain.  Once the new fork has been completed / resolved, the previously active chain is resumed and interaction continues with that chain.