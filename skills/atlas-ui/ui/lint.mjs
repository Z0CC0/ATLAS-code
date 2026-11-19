#!/usr/bin/env node
// ui lint — the checks of polish.md, motion.md and a11y.md that need no judgement, run by a
// script so nobody reads a tree for them. Each finding names the file and line, what was
// found, and the file of this skill that states the rule. Beside the per-file patterns: the
// tells of a generated page, the copy counted against the budgets of copy.md per page, and
// project tallies that turn the numbers of taste.md (sizes, faces, radii, shadows, accents,
// the space scale) into findings. What the rendered page shows is gates.js's job.
//
//   node lint.mjs <file or folder> [...more] [--json]
//
// It reads and prints; it changes nothing and always exits 0 unless the path is missing (2).
// What it cannot see is everything that needs eyes: hierarchy, rhythm, contrast on a real
// background, whether the motion means anything. A clean run says only that these are absent.
//
// The idea of a deterministic detector with no model behind it after pbakaus/impeccable
// (Apache-2.0), which runs 62 rules of its own. These rules and this code are ours.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = new Set(['.css', '.scss', '.less', '.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);
const SKIP = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', '.git', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache']);
const MAX_BYTES = 1024 * 1024;
const MARKUP = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro']);

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const show = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 80);

// One rule: a name, the file that states it, what to do, and a finder over one file's text.
// A tag of JSX may hold an arrow function: `=>` is not the end of the tag.
const RULES = [
  { id: 'transition-all', see: 'polish.md', fix: 'name the properties that change',
    find: (t) => all(t, /\btransition(?:-property)?\s*:\s*all\b[^;}\n]*|(?<![\w-])transition-all(?![\w-])/g) },
  { id: 'scale-zero', see: 'motion.md', fix: 'enter from about 0.95, never from 0',
    find: (t) => all(t, /\bscale\(\s*0(?:\.0+)?\s*\)|\bscale\s*:\s*0(?:\.0+)?\s*[,}]/g) },
  { id: 'vh-100', see: 'polish.md', fix: 'use svh or dvh: 100vh is taller than a phone screen',
    find: (t) => all(t, /(?<![\w.])100vh\b/g) },
  { id: 'layout-animated', see: 'motion.md', fix: 'animate transform or opacity: these lay the page out on every frame',
    find: (t) => all(t, /\btransition(?:-property)?\s*:[^;}\n]*\b(?:width|height|top|left|right|bottom|margin|padding)\b[^;}\n]*/g) },
  { id: 'loops-forever', see: 'polish.md', fix: 'a pulse, bounce or ping runs while a state lasts, then stops',
    find: (t) => all(t, /\banimation(?:-iteration-count)?\s*:[^;}\n]*\binfinite\b[^;}\n]*|(?<![\w-])animate-(?:pulse|bounce|ping)(?![\w-])/g)
      .filter((m) => !/spin|rotate|progress|load/i.test(m.text)) },
  { id: 'zoom-disabled', see: 'a11y.md', fix: 'zoom is never disabled (1.4.4)',
    find: (t) => all(t, /user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\.0)?(?![\d.])/g) },
  { id: 'img-no-alt', see: 'a11y.md', fix: 'alt says what the image is for; decoration gets alt="" (1.1.1)', markup: true,
    find: (t) => all(t, /<(?:img|Image)\b(?:=>|[^>])*>/g).filter((m) => !/\balt\s*=|\{\s*\.\.\./.test(m.text)) },
  { id: 'click-on-div', see: 'a11y.md', fix: 'a button, or role and tabIndex and a key handler (2.1.1)', markup: true,
    find: (t) => all(t, /<(?:div|span|li|td|p)\b(?:=>|[^>])*?\b(?:onClick|@click|on:click)\b(?:=>|[^>])*>/g).filter((m) => !/\brole\s*=/.test(m.text) || !/tabindex/i.test(m.text)) },
  { id: 'html-no-lang', see: 'a11y.md', fix: 'lang on the document (3.1.1)', markup: true,
    find: (t) => all(t, /<html\b[^>]*>/g).filter((m) => !/\blang\s*=/.test(m.text)) },
  { id: 'heading-skipped', see: 'a11y.md', fix: 'headings in order, without skipping a level', markup: true,
    find: (t) => {
      const out = [];
      let prev = 0;
      for (const m of all(t, /<h([1-6])\b/g)) {
        const level = Number(m.text[2]);
        if (prev && level > prev + 1) out.push({ ...m, text: `h${prev} then h${level}` });
        prev = level;
      }
      return out;
    } },
  { id: 'two-h1', see: 'a11y.md', fix: 'one h1 on a page', markup: true,
    find: (t) => all(t, /<h1\b/g).slice(1).map((m) => ({ ...m, text: 'a second h1' })) },
  { id: 'outline-removed', see: 'a11y.md', fix: 'a focus style of its own in the same file, or the outline stays (2.4.7)',
    find: (t) => (/:focus-visible|:focus\b|focus-visible:|focus:/.test(t) ? [] : all(t, /\boutline\s*:\s*(?:none|0)\b|(?<![\w:-])outline-none(?![\w-])/g)) },

  // The tells of a generated page that the source already shows.
  { id: 'gradient-text', see: 'taste.md', fix: 'text in one solid colour from the palette; a gradient fill is the stock generated headline',
    find: (t) => all(t, /(?:-webkit-)?background-clip\s*:\s*text\b|(?<![\w-])bg-clip-text(?![\w-])/g) },
  { id: 'hosted-font', see: 'taste.md', fix: 'serve woff2 files from the project: a hosted stylesheet adds a connection and hands the visitor to a third party',
    find: (t) => all(t, /\b(?:fonts\.googleapis\.com|fonts\.bunny\.net|use\.typekit\.net|api\.fontshare\.com|fast\.fonts\.net)\b[^"')\s]*/g) },
  { id: 'z-index-raw', see: 'tokens.md', fix: 'a named layer token; the layer scale stops at 600',
    find: (t) => all(t, /\bz-index\s*:\s*(\d+)|(?<![\w-])z-\[(\d+)\]|\bzIndex\s*:\s*(\d+)/g).filter((m) => Number(m.text.match(/\d+/)[0]) > 600) },
  { id: 'img-no-size', see: 'method.md', fix: 'width and height on the image, or an aspect ratio, so it reserves its space before it loads', markup: true,
    // The attribute names are read outside quoted values: a data URI may say width= too.
    find: (t) => all(t, /<img\b(?:=>|[^>])*>/g).filter((m) => { const a = m.text.replace(/"[^"]*"|'[^']*'/g, '""'); return !(/\swidth\s*=/.test(a) && /\sheight\s*=/.test(a)) && !/aspect-|aspect-ratio|\{\s*\.\.\./.test(m.text); }) },
  { id: 'vw-100', see: 'method.md', fix: 'width: 100% (or none): 100vw counts the scrollbar and pushes the page sideways',
    find: (t) => all(t, /\b(?:min-|max-)?width\s*:\s*100vw\b|(?<![\w-])w-screen(?![\w-])/g) },
  { id: 'bottom-bar-unsafe', see: 'shell.md', fix: 'pad the bar with env(safe-area-inset-bottom), or it sits under the home indicator',
    find: (t) => [
      ...blocks(t).filter((b) => /\bposition\s*:\s*fixed\b/.test(b.body) && /\bbottom\s*:\s*0(?:px)?\b/.test(b.body) && !/safe-area-inset/.test(b.body)),
      ...all(t, /\bclass(?:Name)?\s*=\s*["'`][^"'`]*["'`]/g).filter((m) => /(?<![\w-])fixed(?![\w-])/.test(m.text) && /(?<![\w-])bottom-0(?![\w-])/.test(m.text) && !/safe/.test(m.text)),
    ].map((m) => ({ index: m.index, text: m.text.split('{')[0].trim() || m.text })) },
  { id: 'input-small-text', see: 'shell.md', fix: 'text in fields at 16 px or more, or iOS zooms the page on focus',
    find: (t) => [
      ...blocks(t).filter((b) => /(?:^|[\s,>+~(])(?:input|select|textarea)\b/.test(b.head) && small(b.body)),
      ...all(t, /<(?:input|select|textarea)\b(?:=>|[^>])*>/g).filter((m) => /(?<![\w-])text-(?:xs|sm)(?![\w-])|text-\[(?:1[0-5]|[0-9])px\]|font-size\s*:\s*(?:1[0-5]|[0-9])px/.test(m.text)),
    ].map((m) => ({ index: m.index, text: m.head ? m.head.trim() : m.text })) },
  { id: 'glow-shadow', see: 'taste.md', fix: 'a shadow lifts, it does not glow: an offset, low opacity, a neutral or slightly tinted colour',
    find: (t) => all(t, /\bbox-shadow\s*:\s*0(?:px)?\s+0(?:px)?\s+[1-9]\d*px(?:\s+-?\d+px)?\s+(#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\))/gi).filter((m) => saturated(m.text.match(/(#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\))\s*$/i)[1])) },
  { id: 'offset-shadow', see: 'taste.md', fix: 'a hard offset shadow belongs to a design that is brutalist on purpose; otherwise soft and low',
    find: (t) => all(t, /\bbox-shadow\s*:\s*-?[1-9]\d*px\s+-?[1-9]\d*px\s+0(?:px)?(?![\d.])[^;}\n]*/g) },
  { id: 'side-stripe', see: 'taste.md', fix: 'a coloured side border thicker than a pixel is on the refuse list; a tone step or an icon says the kind',
    find: (t) => all(t, /\bborder-(?:left|inline-start)\s*:\s*(?:[2-9]|\d{2,})px\s+solid\b[^;}\n]*|(?<![\w-])border-l-(?:[2-8]|\[\d+px\])(?![\w-])/g) },
  { id: 'border-and-shadow', see: 'taste.md', fix: 'a border or a shadow, not both on one element: two answers to one question',
    find: (t) => [
      ...blocks(t).filter((b) => /\bborder\s*:\s*1px\s+solid\b/.test(b.body) && /\bbox-shadow\s*:\s*(?!none|inset|0\s+0\s+0)-?\d+(?:px)?\s+-?\d+(?:px)?\s+(?:[4-9]|\d{2,})px/.test(b.body) && !/:focus/.test(b.head)),
      ...all(t, /\bclass(?:Name)?\s*=\s*["'`][^"'`]*["'`]/g).filter((m) => /(?<![\w:-])border(?![\w-])/.test(m.text) && /(?<![\w:-])shadow-(?:md|lg|xl|2xl)(?![\w-])/.test(m.text)),
    ].map((m) => ({ index: m.index, text: m.head ? m.head.trim() : m.text })) },
  { id: 'marquee', see: 'taste.md', fix: 'a row that scrolls by itself is read by nobody; a still row, or nothing',
    find: (t) => all(t, /<marquee\b|@keyframes\s+[\w-]*(?:marquee|ticker)[\w-]*|(?<![\w-])animate-(?:marquee|ticker)(?![\w-])/gi) },
  { id: 'section-numbers', see: 'taste.md', fix: 'numbers 01, 02, 03 over sections say nothing; a heading that names the step does', markup: true,
    find: (t) => { const m = all(t, />\s*0[1-9]\s*[./]?\s*</g); return m.length >= 3 ? m.slice(2).map((x) => ({ ...x, text: 'section number ' + x.text.replace(/[<>\s]/g, '') })) : []; } },
];

// CSS rule blocks: in a stylesheet the whole text, in markup only what sits inside <style>.
// A block is the innermost `selector { declarations }`, so rules inside @media are found too.
function blocks(text) {
  const out = [];
  const zones = /<style\b[^>]*>([\s\S]*?)<\/style>/gi.test(text)
    ? [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => ({ at: m.index + m[0].indexOf(m[1]), css: m[1] }))
    : /<[a-z][\w-]*[\s>]/i.test(text) ? [] : [{ at: 0, css: text }];
  for (const z of zones) for (const m of z.css.matchAll(/([^{};]*)\{([^{}]*)\}/g)) out.push({ index: z.at + m.index + (m[1].length - m[1].trimStart().length), head: m[1], body: m[2], text: m[0] });
  return out;
}

// A font size under 16 px in a block of declarations.
function small(body) {
  const m = /\bfont-size\s*:\s*([\d.]+)(px|rem|em)\b/.exec(body);
  return !!m && (m[2] === 'px' ? Number(m[1]) < 16 : Number(m[1]) < 1);
}

// Colour literal to hue, saturation, lightness; null when it cannot be read.
function hsl(c) {
  let r, g, b;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(c);
  if (hex) {
    let h = hex[1]; if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const fn = /^(rgba?|hsla?)\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/i.exec(c);
    if (!fn) return null;
    if (/^hsl/i.test(fn[1])) return { h: Number(fn[2]) % 360, s: Number(fn[3]) / 100, l: Number(fn[4]) / 100 };
    [r, g, b] = [fn[2], fn[3], fn[4]].map(Number);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
const saturated = (c) => { const x = hsl(c); return !!x && x.s >= 0.3 && x.l >= 0.15 && x.l <= 0.85; };

// Project tallies: the numbers taste.md writes, as limits. A value is counted once however
// often it is used; custom properties of a scale count as its values.
const TALLY = { sizes: 6, families: 2, radii: 3, shadows: 2, accents: 1 };
const SPACE = new Set([0, 1, 2, 4, 8, 12, 16, 24, 32, 48, 64]);
const toPx = (v) => { const m = /^(-?[\d.]+)(px|rem)$/.exec(v.trim()); return m ? Math.abs(Number(m[1])) * (m[2] === 'rem' ? 16 : 1) : null; };
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'inherit', 'initial', 'unset', '-apple-system', 'blinkmacsystemfont', 'apple color emoji', 'segoe ui emoji', 'segoe ui symbol', 'noto color emoji']);

function tallies(files) {
  const sizes = new Map(), families = new Map(), radii = new Map(), shadows = new Map(), stray = new Map(), hues = [];
  const add = (map, v) => map.set(v, (map.get(v) || 0) + 1);
  for (const f of files) {
    const t = f.text;
    // A length or a clamp() is a size; `--text-primary: #111` is a colour and is not.
    for (const m of t.matchAll(/(?:\bfont-size|--(?:font-size|fs|text|type)[\w-]*)\s*:\s*([^;}"'\n]+)/g)) { const v = m[1].trim(); if (toPx(v) != null) add(sizes, toPx(v)); else if (/^clamp\(/.test(v)) add(sizes, v.replace(/\s+/g, '')); }
    for (const m of t.matchAll(/(?<![\w-])text-\[(\d+(?:\.\d+)?(?:px|rem))\]/g)) add(sizes, toPx(m[1]));
    for (const m of t.matchAll(/\bfont-family\s*:\s*([^;}\n]+)/g)) {
      const first = m[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '').toLowerCase()).find((x) => x && !GENERIC.has(x) && !x.startsWith('var('));
      if (first) add(families, first);
    }
    for (const m of t.matchAll(/(?:\bborder-radius|--radius[\w-]*)\s*:\s*([^;}"'\n]+)/g)) { const v = m[1].trim(); if (!/^(?:0(?:px)?|50%|100%|9{3,}px|inherit|var\(.*)$/.test(v)) add(radii, toPx(v) ?? v); }
    for (const m of t.matchAll(/(?:\bbox-shadow|--shadow[\w-]*)\s*:\s*([^;}\n]+)/g)) { const v = m[1].trim().replace(/\s+/g, ' '); if (!/^(?:none|inherit|var\(|inset|0 0 0 )/.test(v)) add(shadows, v); }
    for (const m of t.matchAll(/\b(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|block|inline)(?:-start|-end)?)?\s*:\s*([^;}"'\n]+)/g))
      for (const part of m[1].trim().split(/\s+/)) { const n = toPx(part); if (n != null && !SPACE.has(n) && !(n > 64 && n % 8 === 0)) add(stray, n); }
    for (const m of t.matchAll(/(?<![\w-])(?:p|m|gap|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-\[(\d+(?:\.\d+)?(?:px|rem))\]/g)) { const n = toPx(m[1]); if (!SPACE.has(n) && !(n > 64 && n % 8 === 0)) add(stray, n); }
    for (const m of t.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|(?:rgba?|hsla?)\([^)]*\)/gi)) { const x = hsl(m[0]); if (x && x.s >= 0.3 && x.l >= 0.2 && x.l <= 0.8) hues.push(x.h); }
  }
  // Hues within 20 degrees are one colour; red, amber and green are the semantic ones.
  hues.sort((a, b) => a - b);
  const groups = [];
  for (const h of hues) { const g = groups[groups.length - 1]; if (g && h - g[g.length - 1] < 20) g.push(h); else groups.push([h]); }
  if (groups.length > 1 && 360 - groups[groups.length - 1].at(-1) + groups[0][0] < 20) groups[0].push(...groups.pop());
  const semantic = (h) => h >= 345 || h < 15 || (h >= 30 && h < 55) || (h >= 90 && h < 160);
  const accents = groups.map((g) => g[Math.floor(g.length / 2)]).filter((h) => !semantic(h)).map((h) => `${Math.round(h)}°`);

  const out = [];
  const list = (map) => [...map].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${typeof v === 'number' ? v + 'px' : v} ×${n}`).join(', ');
  const over = (id, map, limit, fix) => { if (map.size > limit) out.push({ rule: id, found: `${map.size} (limit ${limit}): ${list(map)}`.slice(0, 200), fix, see: 'taste.md' }); };
  over('too-many-sizes', sizes, TALLY.sizes, 'one type scale: fold the near ones into its steps');
  over('too-many-families', families, TALLY.families, 'one face for text, at most one more for display or code');
  over('too-many-radii', radii, TALLY.radii, 'one radius for controls, one larger for cards and dialogs');
  over('too-many-shadows', shadows, TALLY.shadows, 'two levels of elevation, resting and raised');
  if (accents.length > TALLY.accents) out.push({ rule: 'too-many-accents', found: `${accents.length} hues besides red, amber and green: ${accents.join(', ')}`, fix: 'one accent for what can be acted on; a brand that is red, amber or green is not seen here', see: 'taste.md' });
  if (stray.size) out.push({ rule: 'space-off-scale', found: `${[...stray.values()].reduce((a, b) => a + b, 0)} values: ${list(stray)}`.slice(0, 200), fix: 'the space scale 4 8 12 16 24 32 48 64, then steps of 8', see: 'taste.md' });
  return out.map((f) => ({ file: 'project', line: 0, ...f }));
}

// The tells of generated copy, counted on the visible text of one page against copy.md's
// budgets. Over budget is a finding; over twice the budget plus one, the copy fails.
const COPY = [
  { id: 'copy-two-fragments', budget: 1, what: 'headings of two short fragments', heads: true, re: /^[^.!?]{1,30}\.\s+[^.!?]{1,30}\.$/ },
  { id: 'copy-contrast-frame', budget: 2, what: 'contrast frames', re: /\b[Nn]ot\s+(?:just\s+)?[\w'-]+(?:\s+[\w'-]+){0,3},?\s+(?:but|it's|it is)\b|\b[Rr]ather than\b|\b[Ii]nstead of\b|\bNot\s+[\w'-]+(?:\s+[\w'-]+){0,3}\.\s+[A-Z][\w'-]*(?:\s+[\w'-]+){0,4}\./g },
  { id: 'copy-negation-run', budget: 1, what: 'runs of negation', re: /\bNo\s+[\w'-]+\.\s+No\s+[\w'-]+\./g },
  { id: 'copy-praise', budget: 0, what: 'words of praise about ourselves', re: /\b(?:seamless(?:ly)?|effortless(?:ly)?|unlock|elevate|supercharge|revolutioni[sz]e|game[- ]chang\w*|cutting[- ]edge|world[- ]class|best[- ]in[- ]class|next[- ]level)\b/gi },
  { id: 'copy-stock-line', budget: 0, what: 'stock lines', re: /\b(?:built for teams|loved by (?:developers|teams|thousands)|join thousands|trusted by (?:thousands|millions|teams)|the platform (?:you|your team) deserves?)\b/gi },
  { id: 'copy-sample-name', budget: 0, what: 'sample names every generator picks', re: /\b(?:Acme(?: Corp| Inc)?|Jane Doe|John Doe|John Smith|Lorem ipsum)\b/g },
  { id: 'copy-vague-label', budget: 0, what: 'labels that do not say what happens', labels: true, re: /^(?:get started|learn more|submit|click here|ok|yes|read more)$/i },
];

function copyFindings(path, text) {
  const body = text.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, ' '));
  const pieces = [...body.matchAll(/>([^<>{}]+)</g)].map((m) => ({ index: m.index + 1, text: m[1].replace(/\s+/g, ' ').trim() })).filter((p) => /[a-z]/i.test(p.text));
  const chars = pieces.reduce((n, p) => n + p.text.length, 0);
  if (!pieces.length) return [];
  const heads = [...body.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map((m) => ({ index: m.index, text: m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() }));
  const labels = [...body.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)].map((m) => ({ index: m.index, text: m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() }));
  const out = [];
  const judge = (id, what, budget, hits) => {
    if (hits.length <= budget) return;
    const fails = hits.length > budget * 2 + 1;
    out.push({ file: path, line: lineOf(text, hits[budget].index), rule: id, found: `${hits.length} ${what} (budget ${budget}${fails ? ', fails the pass' : ''}): ${show(hits.slice(0, 3).map((h) => `"${h.text}"`).join(' '))}`, fix: 'rewrite from the fact sheet until within the budget', see: 'copy.md' });
  };
  for (const c of COPY) {
    if (c.heads) judge(c.id, c.what, c.budget, heads.filter((h) => c.re.test(h.text)));
    else if (c.labels) judge(c.id, c.what, c.budget, labels.filter((l) => c.re.test(l.text)));
    else judge(c.id, c.what, c.budget, pieces.flatMap((p) => [...p.text.matchAll(c.re)].map((m) => ({ index: p.index, text: m[0] }))));
  }
  const dashes = pieces.flatMap((p) => [...p.text.matchAll(/—/g)].map(() => ({ index: p.index, text: '—' })));
  judge('copy-em-dash', `em dashes in ${chars} characters`, Math.floor(chars / 500), dashes);
  // Small uppercase labels: an eyebrow class, or uppercase with a tiny size on one element.
  const eyebrows = [...body.matchAll(/<[a-z][\w-]*\b[^>]*\bclass(?:Name)?\s*=\s*["'`]([^"'`]*)["'`][^>]*>([^<]{1,40})</gi)]
    .filter((m) => /(?<![\w-])(?:eyebrow|kicker|overline)(?![\w-])/.test(m[1]) || (/(?<![\w-])uppercase(?![\w-])/.test(m[1]) && /(?<![\w-])text-(?:xs|\[1[0-2]px\])(?![\w-])/.test(m[1])))
    .map((m) => ({ index: m.index, text: m[2].trim() }));
  judge('copy-eyebrow', 'small uppercase labels', 2, eyebrows);
  return out;
}

function all(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) out.push({ index: m.index, text: m[0] });
  return out;
}

// Comments say what not to do; they are not findings.
function uncomment(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, (c) => ' '.repeat(c.length));
}

/** Findings for a list of `{ path, text }`; the project-level one comes last. */
export function lint(files) {
  const findings = [], read = [];
  let animated = 0, reduced = false;
  for (const f of files) {
    const ext = extname(f.path).toLowerCase();
    const text = uncomment(f.text);
    read.push({ path: f.path, text });
    if (MARKUP.has(ext)) findings.push(...copyFindings(f.path, text));
    if (/prefers-reduced-motion|useReducedMotion|motion-reduce:|motion-safe:/.test(text)) reduced = true;
    animated += (text.match(/\b(?:transition|animation)\s*:|@keyframes\b|(?<![\w-])animate-[a-z]/g) || []).length;
    for (const rule of RULES) {
      if (rule.markup && !MARKUP.has(ext)) continue;
      const lines = new Set(); // one finding per rule and line: `-webkit-x` beside `x` is one fault
      for (const m of rule.find(text)) {
        const line = lineOf(text, m.index);
        if (lines.has(line)) continue;
        lines.add(line);
        findings.push({ file: f.path, line, rule: rule.id, found: show(m.text), fix: rule.fix, see: rule.see });
      }
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  findings.push(...tallies(read));
  if (animated && !reduced) findings.push({ file: 'project', line: 0, rule: 'no-reduced-motion', found: `${animated} animated declarations, prefers-reduced-motion nowhere`, fix: 'honour reduced motion everywhere, in CSS and in script', see: 'motion.md' });
  return findings;
}

export function report(findings, count, limit = 60) {
  const head = `ui lint: ${count} file${count === 1 ? '' : 's'} read, ${findings.length} finding${findings.length === 1 ? '' : 's'}`;
  if (!findings.length) return `${head}\nnone of the checks a script can make; what needs eyes was not looked at`;
  const lines = findings.slice(0, limit).map((f) => `${f.line ? `${f.file}:${f.line}` : f.file}  ${f.rule}  ${f.found}  → ${f.fix} (${f.see})`);
  if (findings.length > limit) lines.push(`(${findings.length - limit} more, the same kinds; narrow the path)`);
  return [head, ...lines].join('\n');
}

function walk(path, out) {
  const s = statSync(path);
  if (s.isDirectory()) { for (const n of readdirSync(path)) if (!SKIP.has(n)) walk(join(path, n), out); return; }
  if (EXT.has(extname(path).toLowerCase()) && s.size <= MAX_BYTES) out.push(path);
}

// Nothing runs on import: a test that loads this file must not read a tree.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const paths = args.filter((a) => !a.startsWith('--'));
  if (!paths.length || paths.some((p) => !existsSync(p))) {
    console.error('usage: node lint.mjs <file or folder> [...more] [--json]');
    process.exit(2);
  }
  const list = [];
  for (const p of paths) walk(resolve(p), list);
  const files = list.map((p) => ({ path: relative(process.cwd(), p).replace(/\\/g, '/') || p, text: readFileSync(p, 'utf8') }));
  const findings = lint(files);
  process.stdout.write((args.includes('--json') ? JSON.stringify({ files: files.length, findings }, null, 2) : report(findings, files.length)) + '\n');
}
