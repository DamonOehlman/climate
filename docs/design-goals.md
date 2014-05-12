## Design Goals

- Should work with streams other than ``process.stdin``
- Should expect only the stdin stream, not necessarily a tty (but adapt well for a tty)
- Should be able to pipe and redirect stdin using both ``|`` and ``<``
- You choose to color your world, not me
