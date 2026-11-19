# A deployed page — when the request gives a URL, or says on the site, after deploy, smoke

Checking something that is live. Read-only unless told otherwise: no form submitted that
creates, pays, emails or deletes; no account created; no cookie banner accepted beyond
declining what is optional. A check that needs a write is named and left for the user to
approve.

Done through the `atlas-browser` subagent when it exists, so screenshots stay out of the
conversation. Without a browser: fetch the pages and report what a fetch can tell (status,
redirects, headers, the HTML), and say that rendering, scripts and clicks were not checked.

## Five passes, in this order, stopping at the first that fails hard

1. **It loads.** Status 200 on the pages named, or the home page and what it links to at depth
   one. No redirect loop, no mixed content, no certificate error. Console: errors quoted
   exactly, warnings counted. Failed network requests: URL and status.
2. **It works.** The main actions a visitor takes without writing anything: navigation,
   search, opening a detail, a form up to but not including submit, client-side validation
   messages. Each is one line: did what it should, or what it did.
3. **It looks as intended.** At two widths, a phone and a desktop: nothing overflowing,
   overlapping or cut, no unstyled flash, images present. Compared with a baseline only when
   the project keeps one; otherwise described as defects, not as taste.
4. **It can be used without a mouse or eyes.** Every interactive element reachable by
   keyboard in a sensible order; inputs labelled; images with alternative text; contrast on
   body text; one `h1`, headings in order.
5. **It can be found and shared.** Read from the served HTML of each page, each item present
   or missing, because a tab that reads "Vite + React" and a link that shows a blank preview
   are the first things a visitor sees:
   - a `<title>` under about 60 characters, different on each page;
   - a meta description under about 155 characters, different on each page;
   - `<html lang>` and the viewport meta tag;
   - a favicon that is not the framework's default file;
   - `og:title`, `og:description`, and `og:image` as an absolute URL to a 1200x630 image
     that loads;
   - a canonical link;
   - no `noindex` on the production site;
   - on a public site, `/robots.txt` and `/sitemap.xml` answering 200.
   The sizes are the ones `atlas-ui` builds to; a missing item is a defect, never blocking.
   (The page-head checks: affaan-m/ecc, MIT.)

## Report

```
https://example.com  checked 6 pages, read-only

loads     FAIL  /pricing  500 on GET /api/plans
works     not run — pricing does not load
looks     2 defects
  /       375px  hero button overflows its container
  /blog   1280px  cover image 404
access    1 defect
  /contact  email input has no label
head      2 missing
  /blog   og:image missing · /  favicon is the framework default

SHIP WITH FIXES  1 blocking, 5 others
```

Verdict: `SHIP` (nothing found), `SHIP WITH FIXES` (nothing that stops a visitor from the
main task), `DO NOT SHIP` (a page does not load or the main task fails). The word is the
user's to overrule.
