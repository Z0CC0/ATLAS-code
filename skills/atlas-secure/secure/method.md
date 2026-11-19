# Method — read for every audit

## The three passes

A full audit runs them in this order, because each frames the next: the dependencies and the
secrets a project carries change what its code is exposed to, so the code pass is read with
both already in hand.

1. **Dependencies** (`deps.md`): what the project pulls in, and which versions have known
   holes.
2. **Secrets** (`secrets.md`): credentials in the files and in the git history.
3. **Code** (`code.md`): the dangerous places in the source, whole tree, not one diff. An
   Electron or Tauri app adds `desktop.md`, because its doors are not routes.

Asked for one, run that one. Asked "is it safe" with nothing named: all three, on the project
in the working directory.

This audits what is in the repository. It does not probe a running service; for that, see the
note at the end of `code.md`.

## Every finding carries its proof

A security tool that lists possibilities drowns the real thing. A tier above `low` is given
only when the finding can be shown to be reachable, and the line says how:

```
<file>:<line>  <tier>  <what an attacker does, with what input> → <what they get>. <the fix>.
```

Tiers, in this order:
`critical` — reachable from outside the trust boundary and gives data, access or code
execution. `high` — the same, but needs a condition that often holds (a logged-in user, a
known id). `medium` — real, but limited to what the attacker already has, or hard to reach.
`low` — defence in depth, hardening, a smell with no path shown.
A tier never exceeds the damage shown: when the concrete harm cannot be stated, the tier is
lower than it feels. A weakness whose reach turns on one fact outside the source (a deployed
setting, an identity, a route a proxy adds) is `needs_validation`, with that fact and the
way the owner can observe it without harm, not dropped and not dressed up as `critical`. A
fact inside the source (a caller, a config file in the repository) is read, not deferred.
With no decisive fact left to name, the line is `rejected`: `needs_validation` is not a
place to park a hunch. These are the three verdicts of `atlas-review`'s `security.md`, so a
line keeps its word when it moves from a review to an audit.

The test between `high` and `medium`: does the input cancel the control it meets, or only
weaken it (fewer guesses, a shorter window, one more step)? Cancelled is `high` or above by
reach; weakened is `medium` at most. These are `medium` at most unless the same finding shows
how the missing piece is obtained: a missing header or cookie flag; an open redirect alone;
script that runs only in the attacker's own session; anything that already needs admin
rights or a shell; a session weakness that needs a stolen token; account enumeration alone.
Not knowing how the program is deployed never lowers a tier; when one deployment fact
decides the reach, the line is `needs_validation`. (The ceilings: usestrix/strix,
Apache-2.0. The cancel-or-weaken test: cloudflare/security-audit-skill, MIT.)

Every `critical` and `high` line is then handed, alone with the files it names and without
the reasoning that produced it, to a second reader (`atlas-diff` when it exists, a fresh
pass here when not) whose job is to break it: the guard that exists, the input that cannot
occur, the boundary not crossed. A line is struck only on a named control: the file and line
of the check, shown to run on every path from the door before the effect, with no branch
where its error is caught and the request goes on. These are not reasons to strike: a
library said to escape the value, with that call not read in that context (an HTML escaper
does not make a JavaScript string safe); a guard on a sibling route; a check that runs after
the effect; "no caller found" or "maybe not deployed"; "an operator could configure it";
"admin only", which lowers the tier and keeps the line. A reader who cannot name the control
leaves the line `needs_validation` with the check that would settle it, never struck. What
survives is reported as confirmed; what is struck is listed with its control at file and
line. The one who found a line never confirms it. (The strike rule: usestrix/strix,
Apache-2.0.)

The proof is concrete and read from the code: the input, the path from the entry point to the
sink, the result. Nothing is run to prove a finding. The one thing that runs is the project's
own test suite on this machine, after a fix the user approved, to show the fix holds
(`fix.md`).

## A second run

Two audits of the same tree find more than one. The second starts from the first report,
under three rules. A `rejected` line holds only for the same claim on code that has not
changed since (same content, by commit or hash); a changed file reopens it. A confirmed
finding whose file changed is proved again from the code as it is, never copied forward,
because a partial fix reads like a fix. Every `needs_validation` line and every door left
`open` in the first report is the second run's work, done first. The report says which run
it is and what it inherited. (The rules: cloudflare/security-audit-skill, MIT.)

## After a finding is confirmed: the same flaw elsewhere

A confirmed finding is a pattern someone wrote, and people repeat themselves. Before the
report, name what made it a flaw in one sentence that does not mention the file (a query
built by concatenation from a request field; a route registered without the auth wrapper),
search the tree for that shape and not for the exact line, and judge each hit by the same
proof as the first. The report groups them: one finding, its siblings listed with their
lines, and the places that looked the same and are safe, with why. A fix that closes one
of five is reported as one of five. (The step, after trailofbits/skills, `variant-analysis`;
the wording is ours.)

## One round of coverage critique

On a full audit, before the report, a fresh reader gets two lists and nothing else: the
doors mapped (`code.md`) and the doors actually followed to a sink or to a control. Its one
job is to find what is missing: a door not mapped (a queue consumer, a CLI subcommand, a
file the program parses, an IPC handler), a parallel path from a mapped door not followed, a
door marked done with no path or control beside it. Each door it raises is followed now, by
the same proof as the rest, or written under `not audited` with why. One round, not a loop:
what the critic raises is settled once. The critic is a new subagent when one can be
started, else a separate pass that re-reads the door map before the findings; the scope line
says which. (The critic: cloudflare/security-audit-skill, MIT.)

## The report

Findings first, most severe first, nothing above them. On a full audit, then one line per
door, each in one of three states:

```
POST /api/export     reported   critical, src/api/export.ts:34
GET /api/report      ruled out  session and role check, src/api/report.ts:20
ipc fs:write         open       handler read, preload not traced
```

A door is `ruled out` only with its control named as a strike needs it. Doors behind one
guard and one handler may share a line with their count. Every `open` door is also under
`not audited`, and a second run starts from them. (One line per door: usestrix/strix,
Apache-2.0.)

Then one line of scope:

```
CRITICAL 1 · HIGH 2 · MEDIUM 3 · LOW 4 · NEEDS VALIDATION 2
audited: 142 source files, 61 dependencies, git history (all refs) to the first commit
not audited: the mobile client (no source here); the deploy host config (not in the repo)
tools: npm audit (advisories of 2026-11-19), gitleaks, semgrep ran; trufflehog not installed
critic: new subagent, 2 doors raised, both followed
```

The scope line is not optional: an audit that does not say what it did not look at reads as a
clean bill it has not earned. A pattern scan proves that known shapes are absent, not that
nothing is there, and the line says so.

Verdict, last, one of:
`HOLES FOUND` — one or more `critical` or `high`; they are listed first and the audit says fix
before exposing further.
`HARDENING ONLY` — nothing above `medium`; the project stands, the findings are improvements.
`CANNOT TELL` — a pass could not run (a tool missing, the source not all present) and nothing
above `medium` was found; names which pass, and what it leaves unknown.

No findings at all, every pass run: `NOTHING FOUND`, never "safe"; the scope line says what
that rests on.

When holes are found and a pass also could not run, the verdict is `HOLES FOUND` and the scope
line still names what could not be checked: a confirmed hole is the headline, the gap is not
hidden under it.

## What this never does

Changes code without a yes: fixes go through `fix.md`, `atlas-fix` or the user, each
approved. Runs the audited program, or anything against it, to prove a finding; the tools
these passes use only read. Installs a scanner or a tool without a yes; a tool that is
missing is named in the scope line and its pass is marked `not run`. Quotes a secret's value, in a
finding or anywhere.
