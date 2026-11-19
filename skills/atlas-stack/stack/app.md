# An app a person uses and an agent can drive

An app made for people is, by default, closed to an agent: the only door is the screen, and
driving a screen is the slowest and dearest way to do anything. The structure below costs
little when the app is new and gives it a second door: the same actions, called by name,
without a window. One app, not two: the interface and the agent go through the same code.

It applies to anything with an interface a person operates and a state that outlives the
session: a desktop app, a web app with a backend, a mobile app's core, a tool with a window.
It does not apply to a static site, a one-file script, or a library (a library is already
the second door). When it does not apply, say so in one line and move on.

An existing app that was not built this way is not rewritten for it: the rule is offered
once, with what it would take, and the person decides.

## Every action is a command

A command has an id (`area.verb`: `notes.add`, `file.export`), named parameters with types,
and a result. A button, a menu entry and a shortcut each call a command and do nothing else:
no logic lives in the view. What cannot be reached by a command cannot be reached by an agent.
The commands sit in one registry that can list itself: id, one line of description, the
parameters with their types and which are required. A parameter the command does not know is
refused, with the names it accepts: a silent ignore hides the agent's mistakes.
Commands and the state they change live in a layer with no dependency on the interface
toolkit, so they load and run without it. The project's linter or a test enforces that.
A command that changes state goes through the same history as the interface: what an agent
did, the person can undo with the undo they already know.

## The state is a text file

The document, the project, the settings: text a person can diff and an agent can read
without starting the app. JSON unless the stack has a better habit. Stable ids for the things
inside it, so a later command can name what an earlier one made. A schema version at the top,
readers that migrate older versions and refuse newer ones. Large binaries stay outside,
referenced by path. Writes are atomic: a crash never leaves half a file.

## A command line that runs without a window

The same binary or a sibling, never a server to start first. Four verbs, spelled the same in
every app:

- `commands`: the list, one line each. `--json` for the registry as data.
- `describe <id>`: one command, its parameters, one example.
- `exec <id> <parameters>`: runs one.
- `run <file>`: runs a script, one JSON object per line (`{"id": ..., "params": ...}`), in
  one process, against one loaded state. This is the verb that matters: twenty steps in one
  call instead of twenty calls.

Around them: which file to open and whether to save it (`--project`, `--save`,
`--save-as`), a way to look at part of the state by path instead of the whole of it
(`inspect`), and a way to see the result as a file (a rendered frame, a screenshot of a
view, an export) so the work can be checked without the window.
The exit code is zero only when every step succeeded. A script stops at the first failure
and says which line; nothing is saved from a failed script unless asked.

## Output sized for a reader who pays per word

One line per step: the id, whether it worked, the ids it created, counts. Never the whole
state as the answer to a change. Errors name the parameter, what was given and what is
accepted. Progress and logs go to the error stream, results to standard output, so a script
can keep one and drop the other. The long form exists behind a flag, not by default.

## Notes left for the agent

An annotation the person places where the work is, in the interface: on a moment, a
position, an element, with free text and a state (open, done). It lives in the state file
like everything else. Two commands: one lists every open note with where it points, one
closes a note. "Resolve the notes" is then one read, the work, and one close per note. The
person points instead of describing a place in words, which is where instructions usually
go wrong.

## What ships with it

A page for agents, short: what the app is for, the ten commands that carry most of the
work, one script that does something real, where the state file is. Everything else is
found through `commands` and `describe`, so the page does not go stale with each new command.
A test that fails when an interface action has no command, and one that runs a script,
saves, loads and finds the same state.

## What not to build

A protocol server as the only door: it can be added later, in a day, on top of the same
registry, and until someone needs it it is one more thing running. A second API beside the
interface, written by hand: it drifts from the first within a month. Commands that only work
while the window is open, except the few that are about the window itself, kept in a group
of their own and marked so.
