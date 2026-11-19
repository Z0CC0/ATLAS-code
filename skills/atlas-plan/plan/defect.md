# Defect — a runtime bug, when the cause is not obvious

Read with the defect section of `operations.md`, when the first explanation did not hold or
the symptom shows far from where the data went wrong. A build or type error is not this
file: it goes to `atlas-fix`.

## One hypothesis, one variable

Before each change, write one line: the cause believed, the evidence for it, and the result
that would prove it wrong. Then change one thing. Two changes at once leave a green test with
no cause, and a red one with two suspects.
A change that was made for a hypothesis the run then disproved is undone before the next
one, so the code under test is always the code the next hypothesis is about.

## Look at the boundaries before fixing

When the data crosses more than one layer (a request, a queue, a cache, a process, a
library), one run first that logs what goes in and what comes out at each boundary, with the
input of the failing test. The first boundary where the output is already wrong is where the
search goes on; the layers after it are symptoms.
When the repository holds a path that works for a similar input, run both and diff the two
logs. The first line that differs is a better lead than any reading of the code.
The logging is removed before the fix is committed.

## The stop

A fix that leaves exactly the same failure is the same failure twice, and stops the run at
once (`run.md`). A fix that moves the symptom without removing it counts as a failed fix.
After the third failed fix: stop, return to the last state where the suite was green, and
report the three hypotheses, each with its evidence and what disproved it. The report ends
with one question for the user about the design, because three causes that each looked right
and were not usually mean the code does not work the way it is believed to.

```
stopped   3 fixes, symptom still there · back to a1b2c3d, suite green
1  stale cache entry           cleared on write: same 500, now on the second request
2  race between two writers    serialised: 500 gone, totals wrong
3  rounding in toCents()       fixed: totals right, 500 back on refunds over 1000
question  refunds over 1000 go through the legacy path in billing/old.ts. Keep it or retire it?
```

(The stop rule and the boundary log: obra/superpowers, MIT.)
