# Mutations — do the tests notice when the code is wrong

Coverage says a line ran, not that a test would fail if the line were wrong. A mutation tool
changes the code in small ways (a `<` to `<=`, a `+` to `-`, a condition to `true`, a return
to nothing) and runs the tests against each change. A change the tests do not catch is a
survivor.

Use the tool the language has (`Stryker`, `mutmut`, `cargo-mutants`, `PIT`,
`go-mutesting`), on one module at a time: a whole project takes hours. Scope it to the files
the current work touched, through `atlas-runner` when it exists.

## Reading the survivors

Each survivor is one of three things, and the report says which:

- **A missing test**: the changed behaviour matters and nothing checks it. Write the test
  that kills it, named for the behaviour.
- **Equivalent**: the change cannot be observed (a `<` and a `<=` on values that are never
  equal). Say why in one line and leave it.
- **Dead or untestable code**: the line does nothing a caller can see. That is a finding
  about the code, reported and not fixed here.

The score is not the goal: a module at 100 with tests written to kill mutants one by one
has tests shaped like the implementation. Stop when the survivors left are equivalent.

## Report

    MUTATION  <module>  <killed>/<total>  survivors: <n>
      <file>:<line>  <the change>  missing test | equivalent, because ... | dead code

(The angle, after trailofbits/skills, `mutation-testing`; the wording is ours.)
