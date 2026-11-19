# The hardening pass: fixes that are proved, or withheld

Read after a report, when the user says yes to fixing ("harden this", "fix them", the offer
at the end of an audit). It changes code, so it runs only on the findings the user approved,
one at a time, most severe first, with the project's tests green before the first change. A
leaked secret is revoked and rotated by its owner before any line is removed (`secrets.md`).
A dependency is fixed at the level that can fix it (`deps.md`).

## The gates

Every fix passes all six before it is kept. A fix that fails one is undone and withheld:
the finding stays open, and the advice is written in prose with the gate it failed.

1. **The rule, in one sentence.** What must hold, written without the file: only the owner
   reads this row; no path built from a request leaves the upload folder. A fix with no such
   sentence patches a symptom.
2. **The place every path crosses.** The check goes at the sink, or at the one point every
   door to it passes, not in one caller. Re-trace each door from the report through the
   patched code and name the step that now refuses. A check in a helper that another caller
   skips fails here.
3. **Another class of input.** Read the patched check against one input of a class other
   than the one reported: another encoding, case or verb; a symlink; the forbidden part
   doubled or nested; the same field arriving by another way (body, query, header). A fix
   that strips the bad part and carries on, instead of refusing the input, fails here,
   because stripping once is undone by nesting.
4. **The legitimate case.** The ordinary input the code exists for still passes the same
   check. A fix that refuses everything is a regression, not a fix.
5. **A test that fails without it.** A test in the project's own style that feeds the
   reported class of input and expects the refusal. Green with the fix, red with the fix
   reverted, then restored. A test that passes both ways proves nothing. With no test runner
   in the project, the fix is offered as a diff, not applied, with the case to check by hand.
6. **The siblings.** The variants `method.md` found are fixed the same way, or the line says
   how many of how many are closed.

The project's own tests, on this machine, are the one thing this pass runs. Nothing is run
against a deployed service. A setting is fixed so that it fails closed: missing means the
program refuses to start (`code.md`, what falls open). A hardening that is only
configuration (a header, a cookie flag, a content policy) still passes gates 4 and 5, since
a policy that breaks the page is not kept.

## What comes back

Per finding, one line: `fixed`, with the file and line of the new check and the name of its
test; or `withheld`, with the gate that failed and why. Then the verdict of `method.md`,
recomputed on what is still open. (The gates: usestrix/strix, Apache-2.0.)
