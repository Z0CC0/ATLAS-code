# Page: the long screen that must persuade

A landing page, a product site, a home page: the persuade kind of `direction.md`, many
screens long. This file decides what it holds, in what order, and how one section differs
from the next; the words are `copy.md`.

## The fact sheet, before anything is designed

Filled before the first section is drawn, from the brief, the person's words and the project
(README, `PRODUCT.md`, pricing config, the app itself). Each field carries its source:
- what it is, in the words a buyer would search for; who it is for, and when they need it;
- what they use today instead, and the true difference in one sentence a rival could not sign;
- hard facts: numbers, prices, dates, places, platforms, each with where it comes from;
- proof that exists: quotes, names, logos, counts, ratings, each with where it comes from;
- the pieces of the product that can be shown: screens, components, outputs, the object;
- the one action wanted, and one limit (what it does not do).
A field nobody filled reads `empty` and is asked once, with the direction questions; it
shrinks or removes the section that would have used it and is never filled by guess. The
sheet heads the brief, or goes into `PRODUCT.md` when the project keeps one. Check: every
field has a source or reads `empty`.

## No invented proof

Never on the page: a quote, a person's name or face, a client logo, a count of users, a
rating, an "as seen in" row, a price, a percentage that the person or the project did not
give. A plausible fake is the strongest sign of a generated page, and it is a false claim
made in the owner's name. Proof promised for later is a gap in the report, not a filler in
the page. Check: every number, name, quote and logo in the rendered text points to a line
of the sheet; the count without one is 0. (The fact sheet and the ban on invented proof:
leonxlnx/taste-skill, MIT, and nextlevelbuilder/ui-ux-pro-max-skill, MIT.)

## Sections follow the visitor's questions

The questions, in the usual order: what is it; is it for me; show me it working; why should
I believe it; what does it cost and what does it ask of me; what if it goes wrong (limits,
refunds, data, support); what do I do now. Each section answers one, and exists only if the
sheet holds true material for it; two short answers may share a section. Counts follow the
content: four features are four cards, not six. Most pages land between five and nine
sections; fewer is right when the material is thin. Check: the plan lists each section with
its question and its sheet lines; a section with no line is cut.

## The first screen

A contract, held at 1440×900 and at 390×844:
- the heading names the category and the buyer or the place, in 2 to 8 words, two lines at
  1440 and three at most on a phone;
- one hard fact from the sheet: a number, a price, a date, a place, a platform;
- at most two actions, both fully visible at both sizes, one of them filled;
- the product itself: a capture, a working control the visitor came for (a search, a slot
  picker, a price calculator), or its interface built in HTML; never a mood (a gradient, a
  blob, an abstract illustration, a stock photo);
- no box crossed by the bottom edge with less than a third of it showing.
Check: each action's `getBoundingClientRect().bottom` is under `innerHeight` at both sizes;
the heading's height over its line height is 3 or less; with the text covered, a reader
names what the product does from the picture alone. (The contract: after
leonxlnx/taste-skill, MIT; the working control: pbakaus/impeccable, Apache-2.0.)

## Bands

The page is a run of bands, and sections part by a change of surface, not by space alone:
the base ground, a tone step, a contrasting band (dark, inverted or the accent's ground),
full-width media. At most two neighbouring bands share a ground; a run of four holds at
least one contrasting band. One filled button per band, and the same action keeps the same
label down the page. Sections are not each wrapped in a card; band spacing is the page
scale of `taste.md`. Check: list the computed background of each child of `main`; at most
two equal in a row, at most one filled button per band. (voltagent/awesome-design-md, MIT.)

## Every feature beside a piece of the product

A section about a feature pairs its text with an artefact: a capture, a code sample that
runs, real output, a photo of the real object or place. Software with no screenshot gets its
fragment built in HTML from the project's own components, with sample data from the
product's domain, marked as sample. A grid of icon cards appears once per page at most.
Nesting stops at two levels: card, picture, fragment; never a card in a patterned panel in
a card. Check: the sections with no `img`, `picture`, `video`, `canvas`, `pre` or built
fragment are only the closing call and the footer. (The paired artefact: awesome-design-md
and leonxlnx/taste-skill, MIT.)

## No two neighbours with the same skeleton

The plan names each section's skeleton in a few words: "split, text left, capture right",
"three cards", "full-bleed capture", "table", "one quote large". Two neighbours with the same
words: one of them changes. Width alternates between contained and full-bleed, and density
between a dense passage and a quiet one. The page ends on a real close: the one action with
its hard fact, not a slogan. Check: no two equal neighbours in the skeleton list, nor two
adjacent bands equal in both column count and child count.

## Recomposition, decided before code

One row per component of the page, in the brief (`direction.md`): at 1440, 1024, 768 and
390, its columns, the order things stack in, what hides or becomes another control (a menu,
an accordion, a scrolling row with a visible edge), the heading size. For example
`features  3 cols | 2 | 1 | 1, capture above text`. Check: at 390, 768 and 1024 the column
count matches the row and `scrollWidth` equals `clientWidth`. (The collected DESIGN.md files.)

## Container

Content within 1200 to 1280 px, text columns of 60 to 75 characters, gutters `clamp(16px,
4vw, 48px)`; only band grounds and media run full width. Check: at 1920 and 2560 no text
block is wider than 1280 px, no paragraph wider than 75 characters.

## What a finished site also has

- a not-found page in the product's voice, with the site's header and a link home, served
  with status 404;
- a favicon (SVG and a 32 px PNG), a 180 px touch icon, a 512 px icon when installable;
- a share image of 1200×630 with `og:title`, `og:description` and `og:image`;
- per page a title under about 60 characters and a description under about 155, unique.
Check: grep the build for each; open a missing path and see the page and the status. The
report carries one `site` line with what is present and what is not. (pbakaus/impeccable.)
