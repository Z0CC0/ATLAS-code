# Method — read every time an interface is built or changed

## Read the project before writing a line

1. The framework and the styling system: utility classes, CSS modules, styled components, a
   component library, native views. New work uses the one that is there.
2. The tokens: where colours, spacing, type sizes, radii and shadows are defined. A value
   comes from there; a new raw value is written only when the scale has none that fits, and
   is reported.
3. The components that exist: buttons, inputs, dialogs, layout primitives. Search before
   building; a second button is the most common mistake in this kind of work.
4. One finished screen of the same kind, as the reference for density, spacing and tone.
5. What it must run on: breakpoints in use, dark mode, right-to-left, the smallest screen.

Nothing of this in the project (a blank page): `direction.md` first, then `tokens.md` for a
minimal scale, then the component.

## Every component has all its states

Built, not left for later: default; hover, focus-visible, active; disabled; loading; empty;
error; success where there is one; the content too long, too short, and missing; one item
and a thousand. A state that cannot happen is said to be so, in one line.

Loading keeps the layout it will have: no jump when the data lands. Empty says what the
place is for and offers the first action. Error says what happened in the user's words and
what to do next; it never shows a stack trace or a bare code.

A loading indicator keeps time. It appears only after about 300 ms, so a fast answer shows
nothing at all; once shown it stays at least about 500 ms, so it never flashes; a wait
expected over a second gets a skeleton in the shape of the final layout instead of a
spinner, so the eye already reads the page. Check: each state seen through the network
mocks of `browser.md`, fast and slow; the container's box is the same in the skeleton and
in the loaded screenshot. (The timings: nextlevelbuilder/ui-ux-pro-max-skill, MIT.)

The states have kinds, and each kind is its own design: loading the first time, loading
more, refreshing; empty because there is nothing yet, because the search found nothing,
because the filter hides everything; error from the network, from a refusal (not allowed,
not found, expired), from the server, from the user's input, from a limit reached; success;
two of the same at once (a double submit, two edits of one record); a reader who may look
but not change. A component that handles "error" with one message has handled one of six.
(The matrix is the one pbakaus/impeccable, Apache-2.0, checks in its harden pass.)

## Layout that survives

Content decides the size: no fixed heights on anything holding text. It holds at 320 CSS
pixels wide without sideways scrolling, at 200% text size, and with a translation a third
longer. Touch targets as in `a11y.md`. Images and media reserve their space with dimensions
or an aspect ratio.

## Check it, do not imagine it

When a browser is available: `atlas-browser` opens the page and reports in words what
renders, at a narrow and a wide width, in light and dark when both exist, and what the
console says. Then by keyboard alone: reach every control, see where focus is, operate it,
leave. For a loop of looks (several widths, both schemes, before and after) `browser.md`:
a browser driven from the shell writes files and costs an image only when one is read.
`not looked at` is accepted only when no browser can be reached at all: no Browser pane, no
Chrome DevTools connection, no `playwright-cli`, and no Chrome or Edge for it to drive. Then
it is the first line of the report, before anything that was built, because every other
line is unproven; code that compiles is not a checked interface. A page that holds a
canvas, WebGL or Three.js also follows `3d.md`.

Type check and the project's linter run as for any change.

## Measure first, then look

Before any judgement by eye, the numbers. `ui/gates.js` is run inside the page at every
width of the loop (how, in `browser.md`), with `kind: 'persuade'` on a page that sells; it
measures sideways overflow, text cut off or covered, targets, images without reserved
space, headings, contrast from the resolved colours, line length and height, text sizes,
the heading to body ratio, text against the edge of its box and of the screen, reveals
that never fired, and on a persuading page the display size, the first-screen actions, the
grounds of neighbouring sections, filled buttons per section and text width on a wide
screen. Its PASS and FAIL lines go into the report as they are; what it says it could not
measure goes into `not`. Beside it: the console on load, and `lint.mjs` on the source for
what the page cannot show (copy budgets, the project's tallies, values outside the tokens).
Each failing check is written down with its number and fixed before taste is discussed: a
screen with a hidden heading is not "a bit cramped", it is broken, and no amount of polish
counts until it is not. The verdict has a ceiling while any of these stands. (Measured
gates before the critique, and the ceiling, come from Leonxlnx/taste-skill, MIT.)

Two readings, kept apart until the end: what the eye says about the design (hierarchy,
direction, taste) and what the browser proves (the gates above, the states exercised, the
keyboard walk). Written as two lists, then joined; one read that mixes them hides the gaps
in the other. The order of fixing, when both lists are long: broken tasks, data loss and
misleading states; missing states; hierarchy, flow and drift from the house file; visual
and motion inconsistency; cleanup. (Two assessments and the triage order are
pbakaus/impeccable's, Apache-2.0.)

Two rounds of fix and look, fixes batched between them. A third round is a decision taken
with the person, after saying which quality is still missing; unattended work stops at the
second verdict with the open items listed.

## Fresh eyes before it is called done

The builder is the worst judge of what it built: it sees what it meant. Once the gates
pass, a subagent that has not seen this conversation gets the request in the person's
words, the brief, and the screenshots of the loop, and nothing else: no list of what was
fixed, no account of the choices. It answers in one word, `ship`, `fix` or `rebuild`,
then the reasons, which cover at least the type, the material of the surfaces and the
ground; a surface imitating a material in CSS (bevels, embossing, brushed metal) counts
against it. `fix` comes back as a list and is one of the two rounds above; `rebuild` goes
back to `direction.md` and to the person. The verdict and its reasons go into the report as
`review`. Check: the number of problems it named that the builder's own pass had missed.
(Fresh eyes with ship, fix or rebuild: pbakaus/impeccable, Apache-2.0.)

## Report

```
built     src/components/EmptyState.tsx  uses Button, Stack; tokens only
changed   src/pages/orders/index.tsx  empty and error states added; table holds at 320 px
raw       1 value outside the scale: 18px gap in OrderRow (scale has 16 and 24)
looked    1280 and 375 wide, light and dark: renders, no console errors; keyboard reaches all 6 controls
gates     375: PASS 14 of 14; 1280: FAIL 1, contrast 3.9:1 on the table footnote (limit 4.5), fixed, PASS
states    loading, empty, server error, offline, long content: one png each, no jump on load
review    fix: footnote grey too faint, empty state has no first action; both fixed in round 2
not       right-to-left; no screen reader run; contrast over the chart image not computed
```

`looked` only for what was really opened. `gates` carries the numbers `gates.js` printed,
per width. `not` lists what was not checked, every time, even when it is short. `raw`
appears when a value outside the tokens was written. With no browser reachable, the first
line is `not looked at`, followed by why, and `gates`, `states` and `review` are absent
rather than guessed.
