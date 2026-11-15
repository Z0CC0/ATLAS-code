# Properties — a statement that holds for every input

For code with a law: a parser and its printer, an encoder and its decoder, a sort, a merge,
money arithmetic, anything with an inverse or an invariant. Not for code whose only truth
is a table of examples.

Use the library the language has (`fast-check`, `hypothesis`, `proptest`, `rapid`, `jqwik`,
`FsCheck`), and the project's own if one is there. Read its current documentation for the
API.

## Which properties

- **Round trip**: decode(encode(x)) is x.
- **Invariant**: the output is sorted; the total is unchanged; the length is the same.
- **Oracle**: the fast version agrees with the slow obvious one.
- **Idempotence**: doing it twice is doing it once.
- **Nothing crashes**: for any input the function returns or fails with its declared error.

One property per test, named as the law it states. The generator is part of the test: it
must reach the edges (empty, one, huge, repeated, the boundary values of every number, text
outside ASCII), and a generator that only makes tidy values proves nothing.

## When one fails

The library shrinks the input to the smallest that still fails: that input goes into an
ordinary example test with its own name, so the case stays even if the generator changes.
Then the question of `method.md`: is the code wrong or the property? A property that was
too strong is rewritten, never weakened until it passes. The seed of the failing run is in
the report.

## Report

    PROPERTY  <law>  <runs> runs  seed <n>   passed | failed on <smallest input>

(The angle, after trailofbits/skills, `property-based-testing`; the wording is ours.)
