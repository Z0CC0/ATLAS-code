# Taste: what makes a screen look designed

A screen looks designed when every choice on it was made once and then kept. Taste is not
decoration; it is fewer decisions, each visible everywhere. The rules below are the ones
that separate "a form" from "a product" in the first second, with the numbers that make
them checkable. The project's own style file (`house.md`) overrides any of them.

## One scale for space

Every margin, padding and gap comes from one scale: 4, 8, 12, 16, 24, 32, 48, 64 px. Nothing
at 10 or 18. Space between related things smaller than space between groups (8 inside a
card, 24 between cards); the biggest space on the screen marks the biggest division. Edges
aligned to a grid the eye can feel: left edges of text in a column line up, numbers right-
aligned, icons on the same baseline as their label.
That scale is for tools. A screen that persuades (`direction.md`) extends it to 80, 96 and
128: the space between two bands is 80 to 128 px on a desktop and 48 to 64 on a phone, so a
page does not read as a settings screen. Check: at 1440 the `padding-block` of each band is
80 or more. (The section spacing: the DESIGN.md files collected in
voltagent/awesome-design-md, MIT.)

## Type: two faces, five sizes, three weights

One typeface for text, at most one more for display or code. A size scale with a ratio
(1.2 to 1.25 between steps): 12, 14, 16, 20, 24, 32. Body at 14 to 16 with line height 1.4
to 1.6; headings tighter (1.1 to 1.2) and with a little negative letter-spacing when large.
Weights: regular, medium, bold, nothing else; emphasis by weight or colour, never both.
Line length 45 to 75 characters. Capitals only for very short labels, and then with letter-
spacing. Numbers in tables with tabular figures.
Display type: tracking −0.02 to −0.05 em, leading 0.85 to 1.05, `text-wrap: balance`, a
measure of about 14 characters so a headline is two lines or fewer at 1440 and three at
most on a phone. Text: 16 to 20 px with leading 1.45 to 1.6. Nothing sits between the lead
size and the heading size: a size that is "a bit bigger than body" is a sixth size.
(Numbers from Leonxlnx/taste-skill, MIT, consistent with the 1.2 to 1.25 ratio above.)
The scale above is for tools; a page that persuades capped at 32 px has a timid first
screen. Its own scale, as clamp bands from 390 to 1440 wide:
- display `clamp(2.25rem, 1.2rem + 4.5vw, 5rem)`, about 37 to 80 px;
- section heading `clamp(1.75rem, 1.1rem + 2.4vw, 3rem)`, 28 to 48 px;
- sub-heading `clamp(1.375rem, 1.2rem + 0.6vw, 1.75rem)`, 22 to 28 px;
- lead 18 to 20 px, body 16 to 18 px.
Each heading step at least 1.3 times the next from 1024 wide, 1.2 below. Check: at 1440 the
computed display size is 56 or more and at least 1.3 times the section heading. (The page
scale: after leonxlnx/taste-skill, MIT, and the collected DESIGN.md files.)

## The typeface, chosen and loaded

The brief names the face and a reason drawn from the product: its subject, its readers, the
place or era it belongs to. "It looks modern" or "it is tech" is not a reason. On a screen
that persuades a system stack is not a choice; on a working screen a system or workhorse
face is fine. The faces every generator reaches first need their reason written out: Inter
as display, Space Grotesk, DM Sans, Plus Jakarta Sans, Outfit, Instrument Sans, Fraunces,
Playfair Display, IBM Plex (list dated 2026, re-read in a year like the tells).
Loading: woff2 files served by the project, not a hosted stylesheet, which adds a
connection and hands the visitor's address to a third party; the licence checked as OFL or
Apache; one variable file rather than four weights, four files at most; a preload for at
most the two files the first screen uses; `font-display: swap`; a fallback face with
`size-adjust`, `ascent-override` and `descent-override` so the swap moves nothing. Check:
`document.fonts` holds the face as loaded, the network shows no font from another host, and
the swap shifts no layout. (Choosing: pbakaus/impeccable, Apache-2.0; loading:
nextlevelbuilder/ui-ux-pro-max-skill, MIT, and the collected DESIGN.md files.)

## Colour: 60-30-10, and one accent

Most of the screen is one neutral (60%), surfaces and borders a second neutral (30%), one
accent for what can be acted on (10%) and nothing else in the accent colour. Red, amber,
green mean error, caution, success and are used for nothing else. Text contrast at least
4.5:1, large text 3:1; a disabled state is lower contrast, not a different hue. Dark mode is
not the inverse: dark surfaces slightly lighter than the background, shadows replaced by
borders or tonal lifts, saturated accents desaturated a step.
A dark ground is not `#000`: a near-black carrying a trace of the palette's hue, with the
surfaces above it in three or four steps an equal lightness apart. Check: no background
computes to `rgb(0, 0, 0)`, and neighbouring steps differ by the same lightness within one
point. (The stepped dark grounds: the collected DESIGN.md files.)

## Surfaces and depth

One corner radius for controls, one larger for cards and dialogs, consistent to the pixel.
At most two levels of elevation (resting, raised); shadows soft, low, slightly tinted, never
black at full opacity. Borders one pixel, low contrast; a border and a shadow on the same
element is one too many. Hairlines separate, backgrounds group: when both are there, one
is removed.
A surface can be a tone step instead of a border or a shadow: a panel two to six lightness
points from the background reads as a panel with nothing drawn around it. No panel inside a
panel. The ground is 70 to 90 percent of the screen; the accent under 5 percent of any
screen. (Tone steps and the two percentages: Leonxlnx/taste-skill, MIT.)
Depth written as named levels, so every surface can be checked against the list: level 0
flat on the ground; level 1 a surface one step up with a hairline; level 2 two steps up with
a stronger hairline; level 3 three steps up, for what floats; the focus ring apart from all
of them. (The format of named levels is how the DESIGN.md files collected in
voltagent/awesome-design-md, MIT, describe elevation; the values are each project's own.)
Colour strategy chosen once: either the strongest colour owns one region (a sidebar, a
header, the one card) and the rest is neutral, or one saturated colour carries a third to
a half of the surface on purpose; scattered small accents are neither. (pbakaus/impeccable,
Apache-2.0.)

## Hierarchy: one thing first

Each screen has one primary action, in the accent, and everything else secondary or
tertiary (outline, text-only); a long page has one per band (`page.md`). One heading at
the top size; the rest a step down. Density chosen for the task: a dashboard denser than a
form, a reading page sparser than both.
Empty, loading, error and success states designed, not left to the browser default; the
empty state says what to do next.

## Motion, restrained

Motion explains a change of state (where the panel came from) and is otherwise absent;
nothing bounces in a tool. Durations, curves and reduced motion: `motion.md`, the one
source of those numbers.

## The tells of a screen made without taste

Centered body text; four typefaces; every control the accent colour; grey text on grey at
3:1; a different radius on the button and on its input; icons from two sets; a shadow
under everything; a table with no alignment; capitals everywhere; a screenshot-sized
hero image on a settings page; placeholder copy ("Lorem", "Click here"); a dark mode that
is the light mode with the colours inverted.
And the ones that are refused outright: a coloured side border thicker than a pixel on
cards, list items and alerts; a modal for a task that interrupts nothing and protects no
focus; monospace worn as a costume for "technical"; the big-number-small-label metric
template; hard offset shadows (`4px 4px 0`) outside a design that is actually brutalist;
light or dark chosen because of the product's category instead of where it is used.
(pbakaus/impeccable's refuse list, Apache-2.0.)
On a page that persuades, also: text filled with a gradient; a coloured glow behind the
hero; a grid-line background at a fixed cell; a blinking cursor in the hero; a pulsing dot
with no live data behind it; section numbers 01, 02, 03. Each is a default refusal that a
written reason can lift.
When the brief left the look free, a page falls into one of four looks: a cream ground,
serif display and a terracotta accent; near-black with one neon colour and glowing edges;
editorial hairlines, italic serif and small spaced monospace labels; flat saturated colour,
black boxes and offset shadows. Landing in one unasked means the direction was never made;
chosen for a reason in the brief, any of them is fine. Check: the ground, display face and
accent of the result compared with the four. (Both lists: pbakaus/impeccable, Apache-2.0.)
Tells have a date. What a generated page looked like in 2023 (purple gradients, icon
cards) is not what it looks like now; the lists of "use this instead" become the next
year's tells. So the list above is dated 2026 and is re-read, not trusted, in a year.
Where a number exists, it comes from a study of 247 showcase sites against weak ones
(Leonxlnx/taste-skill, MIT, collected October 2026): icon-topped cards 1% of the strong
sites against 28% of the weak, pill badges 14% against 34%, tiny uppercase labels 16%
against 57%, gradients 22% against 52%, resting shadows 24% against 48%, fully rounded
buttons 23% against 59%. Cited, not reproduced as ours.

## Pictures

A real picture, or none: never a grey box with a label left in a finished screen, and never
an address invented from memory. Pictures that may be used are found by the caller with

    node "${CLAUDE_PLUGIN_ROOT}/tools/catalog.mjs" images "<two or three words>"

which asks Openverse for CC0, public-domain and CC BY works only and prints, for each, the
licence, the size, the file, the page it comes from and, for CC BY, the credit line. The
page is opened and the licence confirmed there before a file is used: an index can be
wrong. A file is downloaded only on a yes, into the project, never linked from someone
else's server; a CC BY picture carries its credit where it is shown or on a credits page,
and the line goes into the project beside the file. Faces, logos and artworks under
copyright are not made safe by a licence tag on a photograph of them. (The finder with its
credits: after Leonxlnx/taste-skill, MIT; the index: Openverse, run by WordPress.)
Pictures are planned with the sections, not found at the end: each slot named with its
section, its aspect ratio and what it must show; candidates found for all of them; one
question asks for the whole batch. A piece of the product built in HTML (`page.md`) needs
no picture. Until the yes, a slot holds a box of its final aspect ratio, marked in the box
as a stand-in and with `data-standin`; the report lists every stand-in on a `standin` line,
and a page with one is not called finished. Check: the count of `[data-standin]` on the page
equals the report's list. (The batch and the marked stand-in: leonxlnx/taste-skill, MIT.)

## How to use this

Read the project's existing screens and extract what they already do (scale, type, accent,
radius); write it down as the project's house file if it has none. Apply the rules above
only where the project has made no choice. Check the result in the browser at phone width
and at 1440, in both colour schemes, and say what was changed and by which rule.
