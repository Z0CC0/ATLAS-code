# Copy: the words on a page that persuades

A page can be spaced, aligned and accessible and still say nothing. These rules govern what
it says. They apply with `page.md`, and the product's own voice in `house.md` wins.

## The fact sheet is the only source

Every claim on the page traces to a line of the fact sheet in `page.md`. A sentence that
needs a fact the sheet lacks is cut, or becomes a question to the person. An adjective about
the product itself (fast, simple, powerful, secure) gives way to the fact that would make a
reader say it: "fast" becomes the number of seconds, "simple" the number of steps. Check:
each heading and each sentence of the first screen is marked with its sheet line.

## The rival-name test

Put the nearest rival's name, or "any product of this kind", into the heading, the line
under it and every section heading. A line still true for the rival is rewritten from the
sheet's difference or a hard fact. Check: the count of lines that survive the swap, before
and after; on the first screen it ends at 0.

## A fresh reader

A subagent gets only the page text (the rendered text, or the built HTML stripped of tags):
no brief, no transcript, no screenshots. It answers five things: what it is; who it is for;
what it costs or asks; what would make it hesitate; which three lines sound generic. A wrong
answer or "unclear" on the first three is a fail and the page is rewritten where the answer
went wrong; the three lines are rewritten in any case. A new reader each round, because the
last one has learned the page. Check: the five answers sit in the report beside the sheet.

## The tells of generated copy, as budgets

Each of these is fine once; a page full of them reads as made by nobody. Budgets per page:
- headings made of two short fragments ("Fast. Private."): 1;
- contrast frames ("not X, but Y", "rather than", "instead of", "Not X. Y." at a section's
  end), counted together: 2;
- runs of negation ("No setup. No fees. No limits."): 1;
- small uppercase labels above headings: 2;
- em dashes: one per 500 characters of text;
- words of praise about ourselves (seamless, effortless, honest, simply, unlock, elevate):
  0, because they are claims with no fact behind them;
- stock lines that fit any product ("built for teams", "loved by developers", "join
  thousands", "the platform you deserve"): 0;
- sample names every generator picks (Acme, Jane Doe, John Smith): 0; samples come from the
  product's domain.
Over budget: rewrite until within. Over twice the budget plus one: the copy fails the pass.
Check: counted on the page text with a search, the counts written in the report.
(The budgets and the fresh reader: leonxlnx/taste-skill, MIT; the em dash and "Not X. Y."
counts: pbakaus/impeccable, Apache-2.0.)

## Buttons name the action

A label is a verb and its object, read alone: "Book a table", "Download for macOS", "See
the prices". "Get started", "Learn more", "Submit", "Click here", "OK" and "Yes": 0 per page,
because none says what happens. A confirmation names what it does ("Delete 3 files"). The
same action keeps the same label everywhere on the page. A promise in a label ("Free for
14 days") comes from the sheet or is not written. Check: list every button and link label;
each answers "what happens when I press this" with nothing around it.
