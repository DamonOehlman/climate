.. highlight:: javascript

.. _repl:

==============
REPL Interface
==============

Node's `repl`__ is great and offers a lot of great functionality, that said it does have some limitations.  Depending on the type of application that you are writing, you may find the REPL implemented in climate a better fit.

__ http://nodejs.org/docs/latest/api/repl.html

.. _repl-create:

Creating a REPL
===============

Creating a REPL with climate is really simple. The example below show's a trivial example:

.. literalinclude:: ../examples/repl.js

This example simply displays a prompt ``say hi`` which responds with varying results when you enter "hi", "hi Bob" or "hi something else".  Currently the REPL is case sensitive with commands so "HI Bob" will not work.

Prompting for Data within a REPL
================================

Within Climate it's possible to create sub-instances which divert from the current prompt chain.  This is particularly useful when using REPL, as a REPL is essentially a non-incrementing :ref:`prompt chain <prompt-chains>`.

Consider the following example:

.. literalinclude:: ../examples/repl-prompting.js

When the repl receives the text ``hi``, it prompts for additional information. It does this by :ref:`forking <prompt-forking>` a new prompt.  This fork creates a new :ref:`prompt chain <prompt-chains>` and pauses the currently executing chain.  Once the new fork has been completed / resolved, the previously active chain is resumed and interaction continues with that chain.

Loading Commands from Command Files
===================================

While it's simple enough to wire up a few commands as shown in the previous examples, when it comes to writing more complicated command line applications with a wide variety of commands then it definitely better to provide a little more structure to your application.

For this we can use the ``loadActions`` method of the repl:

.. literalinclude:: ../examples/repl-loadactions.js

You can see here that no actual command logic in the file above, but rather it is implemented in separate command (or action) files stored in the referenced actions directory.  An example of one of those files is shown below:

.. literalinclude:: ../examples/actions/slide.js

Using this technique provides some structure to your application which will generally make it easier for people to contribute to and extend your work.
