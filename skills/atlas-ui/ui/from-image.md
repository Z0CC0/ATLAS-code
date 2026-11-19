# From an image — a screenshot or a mock-up into the project's components

The image is read here, by this model. It is not sent to any other service.

## What an image can and cannot tell

It shows one state, at one width, with one set of content. It does not show: hover, focus,
loading, empty, error; what happens when the text is longer; what happens on a phone; what
is clickable; exact values. Everything it does not show is either taken from the project's
existing patterns or asked.

Colours and sizes read from pixels are estimates. They are snapped to the project's tokens;
where no token is near, the estimate is reported as a guess, not written as if measured. A
design file's export with real values (a spec, CSS, a token file) beats the picture every
time: ask whether one exists.

## Read it in this order

0. **Scale.** Every measurement is brought to CSS pixels first, because a mock-up exported
   at 2x read as it is builds everything twice as big. The ratio is the image width over
   the viewport width it was drawn for (2880 over 1440 is 2); each number read is divided
   by it. When the width is not known, a known element gives it: body text is 14 to 18 CSS
   px, and the usual frames are about 390, 1280 and 1440 wide. Check: the inventory's body
   size reads 14 to 18, never 28 to 36.
1. **Structure.** The regions, top to bottom, outside in: what is layout, what repeats,
   what is a component. Written as a short tree before any code.
2. **Match.** For each node, the project's existing component that it is, with the props
   that produce what is drawn. Only what has no match is new.
3. **Layout.** Which things are in a row, which in a column, what stretches, what is fixed,
   what would wrap. Flex and grid from that; no absolute positions copied from pixel
   coordinates.
4. **Type and colour.** Each text style mapped to the type scale; each colour to a role.
   A colour is read as the median of a flat patch about 5 by 5 px, at least 3 px from any
   edge or text, never inside a shadow, an overlay or the ringing a JPEG leaves around
   edges. A surface that is darker only near its edge has a shadow, not a second grey. A
   gradient is written as its stops with positions and its angle (`160deg, #1a1f3a 0%,
   #3b2a6b 60%`), never as "fades to purple". Check: no two greys in the palette sit within
   2 lightness points unless the inventory has two surfaces for them.
5. **Content.** Which text is real copy and which is sample data. Sample data becomes
   props; real copy goes where the project keeps its strings. Text under about 8 CSS px
   tall in the image is written `unreadable`, because zooming adds no information the image
   lacks: it becomes a placeholder and a question, never copy made up to fill the line.
6. **Assets.** Icons from the project's icon set by meaning; a logo or illustration that is
   not in the repository is asked for, never redrawn or replaced by a look-alike. Photos get
   a placeholder with the right aspect ratio. An icon under about 12 CSS px whose meaning
   cannot be told is `unreadable` too, not a guess. The report lists every unreadable item.
   (Scale, colour from patches and "unreadable" instead of invented: img2threejs,
   Apache-2.0.)

The tree, the matches and the open questions go to the user in a few lines before a larger
screen is built. A single component is just built.

## Build

In the project's framework and component library, in the style of the nearest existing
file. Semantics by what things are, not how they look: the thing that looks like a tab bar
is tabs; the bold line is a heading of the right level. The "always" section of `a11y.md`
applies.

The states the image does not show are built from the project's patterns, as in
`method.md`. Responsive behaviour likewise: the width in the image is one point; say what
was decided for the others.

Several images of one flow: shared components are found across all of them first, then
each screen. Several widths of one screen: they are the breakpoints, and the differences
between them are the responsive rules.

## Inventory before code

Before the first component is written, the image is turned into a list: every visible
element, its kind (the project's component or a new one), its text, its place in the tree,
its spacing from its neighbours in CSS pixels (step 0). The list is the contract: a
feature that is visible and not in the list is a miss found later at ten times the cost.
Shown to the person when the image is ambiguous; otherwise written at the top of the
report as `inventory`. (The gate "every visible feature maps to a component before any
code" is borrowed from img2threejs, Apache-2.0, which does it for 3D objects.)

## Compare

When a browser is available, `atlas-browser` opens the result at the image's width and
reports the differences from the reference in words: spacing, alignment, sizes, colours,
missing elements; `browser.md` when the comparison loops. The comparison is one image
beside the other at the same width, never the result alone: a screenshot read without the
reference finds nothing. The capture is frozen first, as in `browser.md` (fonts loaded,
motion settled, scroll at the top, a pixel ratio of 1), or every difference may be the
capture's.

By regions, not whole against whole: a whole-page look hides a detail a few pixels wide,
and an average hides one broken part. Each region of the inventory is cropped from the
reference and from the render at the same CSS box and scale; up to five are marked
critical (the main heading, the main action, a price, whatever the screen is for), and
each of those passes on its own. The verdict is the worst region, never an average. An
element under about 24 px gets its own crop, enlarged to at least 128 px. Check: take one
small icon out of a finished build; the comparison must catch it.

Each difference gets a cause before a fix, one of three: the inventory is wrong (the list
is fixed first, then the code), the code is wrong, or the capture is wrong (frozen again,
compared again). Code is never bent around a wrong inventory: three nudges to a margin
when the real miss was a row left out of the list is the failure this prevents. Every fix
line in the report names its cause. (Regions with the worst deciding, and a cause per fix:
img2threejs, Apache-2.0.)

Fix what differs; two passes, then report what remains. A third pass only if the second
moved toward the reference; two passes that undo each other are an oscillation, and the
report says so instead of a fourth.

```
built    src/pages/Pricing.tsx  3 existing components, 1 new (PlanCard)
guessed  card shadow, the muted grey of the footnote (no token near #8b8f97)
assumed  below 640 px the three plans stack; annual toggle keeps its state
missing  the illustration in the hero: placeholder at 16:9, file needed
unread   the four footer links (6 px tall in the image): placeholders, names asked
looked   1440 wide against the image, 9 regions, worst: price block, 4 px lower
fixed    price block 4 px lower (code: line height 1.5 where the image has 1.2)
```

An image of someone else's product is a reference for layout, not something to clone with
its brand, logo and copy.
